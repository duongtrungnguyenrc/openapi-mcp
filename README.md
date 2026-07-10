# OpenAPI Docs MCP

Node.js MCP server for serving focused OpenAPI JSON/YAML documentation context to agents.

This server acts as an API documentation server for agents. Instead of loading a full OpenAPI file into context, agents call focused MCP tools such as `find_endpoint`, `get_endpoint`, `resolve_schema`, and `validate_request`.

Specs are parsed and validated with `@apidevtools/swagger-parser`, so both JSON and YAML OpenAPI/Swagger files are supported.

## Requirements

- Node.js `>=20`
- An OpenAPI/Swagger file in JSON or YAML format

## Install and build

```bash
npm install
npm run build
```

The build outputs executable files to `dist/`:

- `dist/index.js` — MCP stdio server
- `dist/cli.js` — setup helper CLI

## Configure MCP

### Option 1: Use the CLI

Print a config snippet:

```bash
./dist/cli.js print-config
```

Merge this server into an agent MCP config JSON file:

```bash
./dist/cli.js setup --config /path/to/agent/mcp-config.json
```

If installed as a package binary, use:

```bash
openapi-mcp-cli setup --config /path/to/agent/mcp-config.json --spec https://example.com/openapi.yaml
```

### Option 2: Configure manually

Add this server to your MCP client config:

```json
{
  "mcpServers": {
    "openapi-docs": {
      "command": "openapi-mcp",
      "args": ["--spec", "https://example.com/openapi.yaml"]
    }
  }
}
```

Use `npm link` after building when running this project locally.

Example for this workspace:

```json
{
  "mcpServers": {
    "openapi-docs": {
      "command": "openapi-mcp",
      "args": ["--spec", "/home/nguyenduong/Documents/openapi.yaml"]
    }
  }
}
```

Restart your MCP client after updating the config.

When configured with `--spec`, tools use that OpenAPI document for every call.

Spec source resolution order:

1. `--spec <path-or-url>` in MCP server args.
2. `OPENAPI_SPEC` environment variable.

Tool calls do not accept a spec path override. Start a separate MCP server instance for a different OpenAPI document.

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

2. Read exact request/response details.

```json
{
  "tool": "get_endpoint",
  "arguments": {
    "method": "POST",
    "path": "/shipments",
    "dereference": true
  }
}
```

3. Generate a request body example.

```json
{
  "tool": "generate_example",
  "arguments": {
    "method": "POST",
    "path": "/shipments"
  }
}
```

4. Validate the JSON body before using it.

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

| Tool                | Purpose                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `summarize_openapi` | Return API metadata, server list, path count, operation count, and schema count.         |
| `list_endpoints`    | List all HTTP endpoints.                                                                 |
| `list_operations`   | Compatibility alias for `list_endpoints`.                                                |
| `find_endpoint`     | Search endpoints by path, method, operationId, summary, description, and tags.           |
| `get_endpoint`      | Return focused details for one endpoint: params, request body, responses, auth, servers. |
| `get_schema`        | Return a component schema by name.                                                       |
| `resolve_schema`    | Return a component schema with `$ref` values resolved.                                   |
| `search_schema`     | Search schemas by name and content.                                                      |
| `explain_endpoint`  | Return auth, request, response, errors, and example for one endpoint.                    |
| `generate_example`  | Generate a JSON request example from the endpoint request schema.                        |
| `validate_request`  | Validate JSON data against the endpoint request schema.                                  |
| `get_auth`          | Return global security requirements and security schemes.                                |

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
