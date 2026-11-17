# SolveX Fly.io MCP connector

A small remote MCP server for the Fly.io Machines API. It is deliberately isolated from the main SolveX runtime and defaults to the existing `full-build` app.

## Tools exposed

- `fly_app_status`: list machines and their states.
- `fly_machine_details`: inspect one machine.
- `fly_start_machine`, `fly_restart_machine`, `fly_stop_machine`: machine actions. Each requires an explicit `confirm: true` argument.

The server never returns either API token. All Fly API requests are made server-side.

## Required secrets

- `FLY_API_TOKEN`: a Fly.io token with access to the target app.
- `MCP_ACCESS_TOKEN`: a separate random bearer secret, at least 32 characters, used by the ChatGPT MCP connection.

Do not commit either value or paste either value into a chat.

## Deploy

From this directory, create the Fly app (choose a globally unique name if `solvex-fly-mcp` is unavailable):

```sh
fly launch --no-deploy --name solvex-fly-mcp --region ord
```

Set the secrets interactively so they do not enter shell history:

```sh
fly secrets set FLY_API_TOKEN --app solvex-fly-mcp
fly secrets set MCP_ACCESS_TOKEN --app solvex-fly-mcp
```

If your Fly CLI version does not support prompting for a secret value, use the Fly dashboard's Secrets page for this connector app.

Deploy:

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

If you chose another app name, replace the hostname accordingly and update `app` in `fly.toml`.

## Connect in ChatGPT

In ChatGPT on the web, open **Plugins** → **+** → **Add custom MCP server**. Enter a name, the HTTPS MCP endpoint above, and configure **Bearer** authentication with the value of `MCP_ACCESS_TOKEN`. Review the discovered tools and permissions before creating the app.

Custom MCP connections are currently available on ChatGPT Business and Enterprise/Edu; Pro supports read-only custom MCP access. This server includes write tools, so use them only in a workspace that permits write-capable MCP apps. Free accounts cannot add this custom connector.

Official setup guide: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
