## ApiLens

This project has an ApiLens MCP server (`openapi_*` tools) configured. Use it as the source of truth for the configured OpenAPI/Swagger spec. Do not paste or load a large OpenAPI file into model context when this MCP is available; ask the MCP tools for the smallest endpoint, schema, auth, or example context needed for the integration task.

### When to prefer ApiLens over reading the spec directly

Use ApiLens for **API integration** questions — which endpoint to call, what method/path/parameters/body/auth are required, which responses and errors exist, or whether a drafted request body is valid. Use source-code tools for project code questions, and only read the raw spec directly for literal text that the MCP tools cannot expose.

| Question                                                 | Tool                |
| -------------------------------------------------------- | ------------------- |
| "What API is configured?" / "What servers exist?"        | `summarize_openapi` |
| "What endpoints are available?"                          | `list_endpoints`    |
| "Which endpoint matches this user goal?"                 | `find_endpoint`     |
| "What does METHOD /path require and return?"             | `get_endpoint`      |
| "What schema/model defines this object?"                 | `get_schema`        |
| "Which schema matches this name or meaning?"             | `search_schema`     |
| "Is this generated request JSON valid for the endpoint?" | `validate_request`  |
| "How should client code authenticate?"                   | `get_auth`          |

### Rules of thumb

- **Start from user intent, not guessed paths.** If the user describes a business action, call `find_endpoint` first. If no good result appears, use `list_endpoints`; do not infer paths from UI labels, database names, or naming conventions.
- **Read endpoint details before coding.** Once method and path are known, call `get_endpoint` and check servers/base URL, parameters, request content type, required request fields, generated example, auth/security, success responses, and documented errors.
- **Check authentication explicitly.** Use `get_auth` before adding client authentication. Prefer endpoint-level security from `get_endpoint` when it differs from global security. Never invent header names such as `X-API-Key` unless the spec says so.
- **Validate request bodies.** Use the `example` returned by `get_endpoint` as a schema-based draft, adapt it to real inputs, then call `validate_request` with the exact JSON body before finalizing client code.
- **Keep integration code minimal.** Include only the documented method, URL construction, parameters, body/content type, auth, response parsing, and error handling needed for the endpoint.
- **Do not hardcode MCP examples.** Convert example values into function parameters, DTO fields, fixtures, or tests unless the user explicitly asks for sample code.
- **Re-check when requirements change.** If fields, endpoint, auth, or response handling change, call the relevant MCP tool again instead of relying on stale endpoint details.
- **Keep final answers focused.** Return only API details relevant to the user's task; avoid dumping full specs or large schemas.

### If no OpenAPI spec is configured

The MCP server may return that no spec/config is available. Ask the user for the OpenAPI/Swagger spec path or URL, or for the command/configuration they want used to start the ApiLens MCP server.
