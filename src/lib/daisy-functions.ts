import { Lifecycle, type Task } from "./lifecycle";

export const DAISY = { id: "daisy-haminja", kind: "partner" as const };
export const OWNER = { id: "owner", kind: "human" as const };

export type DaisyFunction = {
  id: string;
  family: string;
  name: string;
  tool: string;
  operation: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  available: boolean;
  reason: string;
  note: string;
};

export const DAISY_FUNCTIONS: DaisyFunction[] = [
  { id: "a2a", family: "A2A", name: "Send agent card request", tool: "a2a", operation: "request", risk: "LOW", available: true, reason: "sandbox agent card", note: "Fetch a card and send a structured request. Low risk can be auto-reviewed." },
  { id: "rag", family: "RAG", name: "Retrieve a record", tool: "rag", operation: "lookup", risk: "LOW", available: true, reason: "read-only index", note: "A retrieval proposal. It cannot write." },
  { id: "mcp", family: "MCP", name: "Call a tool", tool: "mcp", operation: "call", risk: "MEDIUM", available: true, reason: "sandbox tool", note: "A tool call is a proposal. Permission is checked again at run." },
  { id: "multi", family: "Multi-agent", name: "Ask another agent", tool: "swarm", operation: "delegate", risk: "MEDIUM", available: true, reason: "sandbox swarm", note: "One agent may ask another. Neither can authorize medium work." },
  { id: "nlp", family: "NLP", name: "Classify a note", tool: "nlp", operation: "classify", risk: "LOW", available: true, reason: "local classifier", note: "Language work stays on the proposal path." },
  { id: "robotics", family: "Robotics", name: "Move a sandbox arm", tool: "robot", operation: "move", risk: "HIGH", available: false, reason: "physical device not connected", note: "A missing device returns blocked, never a fake move." },
  { id: "shap", family: "SHAP-IQ", name: "Explain a score", tool: "explain", operation: "score", risk: "LOW", available: true, reason: "local explainer", note: "An explanation is a read. It does not change the score." },
  { id: "security", family: "Security", name: "Request a safety check", tool: "security", operation: "check", risk: "HIGH", available: false, reason: "production scanner not granted", note: "Daisy may request a check. She cannot run a production scan." },
  { id: "gpt", family: "GPT-5", name: "Draft a reply", tool: "draft", operation: "write", risk: "LOW", available: true, reason: "draft only", note: "A draft is not an action on an account." },
  { id: "minimax", family: "MiniMax", name: "Score options", tool: "planner", operation: "score", risk: "LOW", available: true, reason: "local planner", note: "Scoring options does not execute the chosen option." },
  { id: "mirascope", family: "Mirascope", name: "Structure a call", tool: "schema", operation: "compile", risk: "LOW", available: true, reason: "compiler", note: "Compile the call. Do not run it." },
];

export function daisyPropose(fn: DaisyFunction): { task: Task; note: string; state: string } {
  const life = new Lifecycle();
  life.grant("owner", fn.tool, fn.operation);
  life.setTool(fn.tool, fn.available, fn.reason);
  const task = life.propose(DAISY, "owner", fn.name, fn.tool, fn.operation, fn.risk);
  if (fn.risk !== "LOW") {
    try {
      life.authorize(task.id, DAISY);
    } catch (error) {
      return { task, state: task.state, note: error instanceof Error ? error.message : "denied" };
    }
  }
  const ran = life.run(task.id, OWNER);
  return {
    task: ran,
    state: ran.state,
    note: ran.blockReason ?? (ran.state === "COMPLETED" ? "Sandbox function finished after the gate." : `Stopped at ${ran.state}.`),
  };
}
