# ApiLens

Unified Node.js CLI and MCP server for serving focused OpenAPI JSON/YAML documentation context to agents.

ApiLens acts as an API documentation server for agents. Instead of loading a full OpenAPI file into context, agents call focused MCP tools such as `find_endpoint`, `get_endpoint`, `resolve_schema`, and `validate_request`.

Specs are parsed and validated with `@apidevtools/swagger-parser`, so both JSON and YAML OpenAPI/Swagger files are supported.

## Requirements

- Node.js `>=20`
- An OpenAPI/Swagger file in JSON or YAML format

## Install and build

```bash
npm install
npm run build
```

The build outputs the unified executable to `dist/`:

- `dist/cli.js` — ApiLens CLI and MCP stdio server entrypoint

## Configure MCP

### Option 1: Use the CLI

Print a config snippet:

```bash
apilens print-config
```

Configure ApiLens for multiple agentic providers (Antigravity IDE, Claude Desktop, Codex, Cline, Roo Cline). The CLI automatically detects existing installations and ticks them by default. Each provider uses its native config format; for example, Codex writes `~/.codex/config.toml`, while Claude/Cline-style clients write JSON `mcpServers` configs:

```bash
# Run interactive multi-select setup
apilens setup --spec https://example.com/openapi.yaml

# Skip prompting and configure all detected providers automatically
apilens setup --yes --spec https://example.com/openapi.yaml

# Configure specific providers directly
apilens setup --provider claude --provider codex --spec https://example.com/openapi.yaml
```

Supported providers: `antigravity`, `claude`, `codex`, `cline_vscode`, `roo_cline_vscode`, `cline_cursor`, `roo_cline_cursor`.

To merge into a custom config file path:

```bash
apilens setup --config /path/to/agent/mcp-config.json
```

### Option 2: Configure manually

Add ApiLens to your MCP client config:

```json
{
  "mcpServers": {
    "apilens": {
      "command": "apilens",
      "args": ["--mcp", "--spec", "https://example.com/openapi.yaml"],
      "env": {
        "NODE_OPTIONS": "--use-system-ca"
      }
    }
  }
}
```

Use `npm link` after building when running this project locally.

Example for this workspace:

```json
{
  "mcpServers": {
    "apilens": {
      "command": "apilens",
      "args": ["--mcp", "--spec", "/home/nguyenduong/Documents/openapi.yaml"],
      "env": {
        "NODE_OPTIONS": "--use-system-ca"
      }
    }
  }
}
```

Restart your MCP client after updating the config.

When configured with `--spec`, tools use that OpenAPI document for every call.

Spec source resolution order:

1. `--spec <path-or-url>` in `apilens --mcp` args.
2. `OPENAPI_SPEC` environment variable.

Tool calls do not accept a spec path override. Start a separate ApiLens MCP server instance for a different OpenAPI document.

### Typical workflow

For a user request like "create a shipment":

1. Find the matching endpoint.

```json
{
  "tool": "find_endpoint",
  "arguments": {
    "query": "create shipment"
  }
}
```

2. Read exact request/response details (includes auto-generated example and fully resolved schema).

```json
{
  "tool": "get_endpoint",
  "arguments": {
    "method": "POST",
    "path": "/shipments"
  }
}
```

3. Validate the JSON body before using it.

```json
{
  "tool": "validate_request",
  "arguments": {
    "method": "POST",
    "path": "/shipments",
    "data": {
      "vehicleId": "abc"
    }
  }
}
```

## Tools

| Tool                | Purpose                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `summarize_openapi` | Return API metadata, server list, path count, operation count, and schema count.                                                              |
| `list_endpoints`    | List all HTTP endpoints.                                                                                                                      |
| `find_endpoint`     | Search endpoints by path, method, operationId, summary, description, and tags.                                                                |
| `get_endpoint`      | Return focused details for one endpoint: params, request body, responses, auth, servers (with all $ref resolved and examples auto-generated). |
| `get_schema`        | Return a component schema by name (with all $ref resolved).                                                                                   |
| `search_schema`     | Search schemas by name and content.                                                                                                           |
| `validate_request`  | Validate JSON data against the endpoint request schema.                                                                                       |
| `get_auth`          | Return global security requirements and security schemes.                                                                                     |

## MCP resources

The server also exposes metadata resources:

- `openapi://info` — API info, version, and servers
- `openapi://components` — OpenAPI components object
- `openapi://servers` — server list

Prefer tools for endpoint and schema tasks. Use resources for direct metadata reads.

## Development

Run from TypeScript source:

```bash
npm run dev
```

Type-check without emitting:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```

## Agent instructions

See [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md) for detailed guidance on why, when, and how agents should use this MCP server.
