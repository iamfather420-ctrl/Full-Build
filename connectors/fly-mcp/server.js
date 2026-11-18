import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const PORT = Number(process.env.PORT || 8080);
const APP_NAME = process.env.FLY_APP_NAME || "full-build";
const FLY_API_TOKEN = process.env.FLY_API_TOKEN;
const MCP_ACCESS_TOKEN = process.env.MCP_ACCESS_TOKEN;
const FLY_API_BASE = "https://api.machines.dev/v1";

if (!FLY_API_TOKEN || !MCP_ACCESS_TOKEN) {
  throw new Error("FLY_API_TOKEN and MCP_ACCESS_TOKEN must be configured as server secrets.");
}
if (MCP_ACCESS_TOKEN.length < 32) {
  throw new Error("MCP_ACCESS_TOKEN must contain at least 32 characters.");
}

function authorized(req) {
  const header = req.headers.authorization || "";
  const supplied = Buffer.from(header.startsWith("Bearer ") ? header.slice(7) : "");
  const expected = Buffer.from(MCP_ACCESS_TOKEN);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function flyRequest(path, options = {}) {
  const response = await fetch(`${FLY_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${FLY_API_TOKEN}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    },
    signal: AbortSignal.timeout(15000)
  });
  const raw = await response.text();
  let payload;
  try { payload = raw ? JSON.parse(raw) : {}; }
  catch { payload = { message: raw.slice(0, 1000) }; }
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error :
      typeof payload?.message === "string" ? payload.message : `Fly API returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function textResult(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function machinePath(machineId, action = "") {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(machineId)) {
    throw new Error("Invalid machine ID.");
  }
  return `/apps/${encodeURIComponent(APP_NAME)}/machines/${encodeURIComponent(machineId)}${action}`;
}

function buildMcpServer() {
  const server = new McpServer({
    name: "solvex-fly-control",
    version: "1.0.0"
  });

  server.tool(
    "fly_app_status",
    "List machines for the configured Fly.io app and report their current state.",
    {},
    async () => {
      const machines = await flyRequest(`/apps/${encodeURIComponent(APP_NAME)}/machines`);
      const summary = (Array.isArray(machines) ? machines : []).map((m) => ({
        id: m.id,
        name: m.name,
        state: m.state,
        region: m.region,
        instance_id: m.instance_id,
        created_at: m.created_at,
        updated_at: m.updated_at
      }));
      return textResult({ app: APP_NAME, machine_count: summary.length, machines: summary });
    }
  );

  server.tool(
    "fly_machine_details",
    "Read the configuration and current state of one machine in the configured Fly.io app.",
    { machine_id: z.string().min(1).max(80) },
    async ({ machine_id }) => {
      const machine = await flyRequest(machinePath(machine_id));
      return textResult(machine);
    }
  );

  server.tool(
    "fly_start_machine",
    "Start a stopped machine. Requires confirm=true as an explicit action acknowledgement.",
    { machine_id: z.string().min(1).max(80), confirm: z.boolean() },
    async ({ machine_id, confirm }) => {
      if (!confirm) throw new Error("Start not performed: set confirm=true to authorize this action.");
      const result = await flyRequest(machinePath(machine_id, "/start"), { method: "POST", body: "{}" });
      return textResult({ app: APP_NAME, machine_id, action: "start", result });
    }
  );

  server.tool(
    "fly_restart_machine",
    "Restart a machine. This interrupts its current process. Requires confirm=true.",
    { machine_id: z.string().min(1).max(80), confirm: z.boolean() },
    async ({ machine_id, confirm }) => {
      if (!confirm) throw new Error("Restart not performed: set confirm=true to authorize this action.");
      const result = await flyRequest(machinePath(machine_id, "/restart"), { method: "POST", body: "{}" });
      return textResult({ app: APP_NAME, machine_id, action: "restart", result });
    }
  );

  server.tool(
    "fly_stop_machine",
    "Stop a machine. This takes the machine offline. Requires confirm=true.",
    { machine_id: z.string().min(1).max(80), confirm: z.boolean() },
    async ({ machine_id, confirm }) => {
      if (!confirm) throw new Error("Stop not performed: set confirm=true to authorize this action.");
      const result = await flyRequest(machinePath(machine_id, "/stop"), { method: "POST", body: "{}" });
      return textResult({ app: APP_NAME, machine_id, action: "stop", result });
    }
  );

  return server;
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("Request body too large.");
    chunks.push(chunk);
  }
  if (size === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "solvex-fly-control" }));
    return;
  }

  if (url.pathname !== "/mcp" || !["GET", "POST", "DELETE"].includes(req.method || "")) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  if (!authorized(req)) {
    res.writeHead(401, { "content-type": "application/json", "www-authenticate": "Bearer" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    const body = req.method === "POST" ? await readJson(req) : undefined;
    const mcp = buildMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await mcp.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Request failed" }));
    }
  }
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`SolveX Fly MCP listening on port ${PORT}; app=${APP_NAME}`);
});
