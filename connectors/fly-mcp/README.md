# SolveX Fly.io MCP connector

A small remote MCP server for the Fly.io Machines API. It is isolated from the main SolveX runtime and defaults to the existing `full-build` app.

## Tools exposed

- `fly_app_status`: list machines and their states.
- `fly_machine_details`: inspect one machine.
- `fly_start_machine`, `fly_restart_machine`, `fly_stop_machine`: machine actions. Each requires an explicit `confirm: true` argument.

The server never returns either API token. All Fly API requests are made server-side.

## Required secrets

- `FLY_API_TOKEN`: a Fly.io token with access to the target app.
- `MCP_ACCESS_TOKEN`: a separate random bearer secret, at least 32 characters, used to authenticate MCP requests.

Do not commit either value or paste either value into a chat.

## Deploy

From this directory, create the separate Fly app:

```sh
fly launch --no-deploy --name solvex-fly-mcp --region ord
```

Then open the connector app's Secrets page:

https://fly.io/apps/solvex-fly-mcp/secrets

Add these two secrets there:
- Name: `FLY_API_TOKEN`; value: your Fly.io API token.
- Name: `MCP_ACCESS_TOKEN`; value: a newly generated random secret of at least 32 characters.

Do not put either secret in the existing `full-build` app. Do not reuse the Fly API token as the MCP access token.

Deploy from this directory:

```sh
fly deploy --app solvex-fly-mcp
```

Verify:

```sh
fly status --app solvex-fly-mcp
curl -i https://solvex-fly-mcp.fly.dev/health
```

The MCP endpoint is:

```
https://solvex-fly-mcp.fly.dev/mcp
```

If Fly requires a different globally unique app name, update `app` in `fly.toml` and use that app name in the URL.

## Connect in ChatGPT

Use ChatGPT on the web; custom MCP connections are not currently supported in the mobile app.

1. Open **Plugins**.
2. Select **+** → **Add custom MCP server**.
3. Name it `SolveX Fly.io`.
4. Enter the HTTPS MCP endpoint above.
5. Configure bearer authentication using the `MCP_ACCESS_TOKEN` value.
6. Review the discovered tools and permissions before creating the app.

Availability:
- ChatGPT Business and Enterprise/Edu support full custom MCP connections, subject to workspace permissions.
- ChatGPT Pro supports custom MCP servers with read/fetch permissions only. The write tools in this connector cannot be used with Pro's read-only access.
- ChatGPT Free does not currently support custom MCP server connections.

Official setup guide: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
