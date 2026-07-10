import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OpenApiProvider } from "./openapi-provider.js";
import { requireSpecSource } from "./spec-source.js";

const filePathInput = {
  filePath: z
    .string()
    .optional()
    .describe(
      "Path or URL to an OpenAPI JSON/YAML file. Optional when server is started with --spec or OPENAPI_SPEC.",
    ),
};

export function registerOpenApiTools(
  server: McpServer,
  getProvider: (filePath: string) => OpenApiProvider,
) {
  server.registerTool(
    "summarize_openapi",
    {
      title: "Summarize OpenAPI document",
      description: "Load an OpenAPI JSON/YAML file and return high-level metadata plus counts.",
      inputSchema: filePathInput,
    },
    async ({ filePath }) => jsonContent(await getProvider(requireSpecSource(filePath)).summarize()),
  );

  server.registerTool(
    "list_endpoints",
    {
      title: "List OpenAPI endpoints",
      description: "List all HTTP endpoints from an OpenAPI JSON/YAML file.",
      inputSchema: filePathInput,
    },
    async ({ filePath }) =>
      jsonContent(await getProvider(requireSpecSource(filePath)).listEndpoints()),
  );

  server.registerTool(
    "list_operations",
    {
      title: "List OpenAPI operations",
      description: "Alias for list_endpoints for compatibility.",
      inputSchema: filePathInput,
    },
    async ({ filePath }) =>
      jsonContent(await getProvider(requireSpecSource(filePath)).listEndpoints()),
  );

  server.registerTool(
    "find_endpoint",
    {
      title: "Find endpoint",
      description: "Search endpoints by method, path, operationId, summary, description, or tags.",
      inputSchema: {
        ...filePathInput,
        query: z.string().describe("Search text, for example: create shipment."),
      },
    },
    async ({ filePath, query }) =>
      jsonContent(await getProvider(requireSpecSource(filePath)).findEndpoint(query)),
  );

  server.registerTool(
    "get_endpoint",
    {
      title: "Get endpoint",
      description: "Return focused request/response/security context for one endpoint.",
      inputSchema: {
        ...filePathInput,
        method: z.string().describe("HTTP method, for example POST."),
        path: z.string().describe("OpenAPI path, for example /shipments."),
        dereference: z
          .boolean()
          .optional()
          .describe("Resolve $ref values before returning the endpoint."),
      },
    },
    async ({ filePath, method, path, dereference }) =>
      jsonContent(
        await getProvider(requireSpecSource(filePath)).getEndpoint(
          method,
          path,
          dereference ?? false,
        ),
      ),
  );

  server.registerTool(
    "get_schema",
    {
      title: "Get schema",
      description: "Return a component schema by name.",
      inputSchema: {
        ...filePathInput,
        name: z.string().describe("Schema name in components.schemas."),
      },
    },
    async ({ filePath, name }) =>
      jsonContent(await getProvider(requireSpecSource(filePath)).getSchema(name)),
  );

  server.registerTool(
    "resolve_schema",
    {
      title: "Resolve schema",
      description: "Return a component schema with $ref values resolved.",
      inputSchema: {
        ...filePathInput,
        name: z.string().describe("Schema name in components.schemas."),
      },
    },
    async ({ filePath, name }) =>
      jsonContent(await getProvider(requireSpecSource(filePath)).getSchema(name, true)),
  );

  server.registerTool(
    "search_schema",
    {
      title: "Search schema",
      description: "Search component schemas by name and schema content.",
      inputSchema: {
        ...filePathInput,
        query: z.string().describe("Search text, for example: vehicle."),
      },
    },
    async ({ filePath, query }) =>
      jsonContent(await getProvider(requireSpecSource(filePath)).searchSchema(query)),
  );

  server.registerTool(
    "explain_endpoint",
    {
      title: "Explain endpoint",
      description: "Generate auth/request/response/errors/example documentation for one endpoint.",
      inputSchema: {
        ...filePathInput,
        method: z.string().describe("HTTP method."),
        path: z.string().describe("OpenAPI path."),
      },
    },
    async ({ filePath, method, path }) =>
      jsonContent(await getProvider(requireSpecSource(filePath)).explainEndpoint(method, path)),
  );

  server.registerTool(
    "generate_example",
    {
      title: "Generate example",
      description: "Generate an example JSON request body for one endpoint.",
      inputSchema: {
        ...filePathInput,
        method: z.string().describe("HTTP method."),
        path: z.string().describe("OpenAPI path."),
      },
    },
    async ({ filePath, method, path }) =>
      jsonContent(await getProvider(requireSpecSource(filePath)).generateExample(method, path)),
  );

  server.registerTool(
    "validate_request",
    {
      title: "Validate request",
      description: "Validate a JSON request body against an endpoint request schema.",
      inputSchema: {
        ...filePathInput,
        method: z.string().describe("HTTP method."),
        path: z.string().describe("OpenAPI path."),
        data: z.unknown().describe("JSON request body to validate."),
      },
    },
    async ({ filePath, method, path, data }) =>
      jsonContent(
        await getProvider(requireSpecSource(filePath)).validateRequest(method, path, data),
      ),
  );

  server.registerTool(
    "get_auth",
    {
      title: "Get auth",
      description: "Return global security requirements and security schemes.",
      inputSchema: filePathInput,
    },
    async ({ filePath }) => jsonContent(await getProvider(requireSpecSource(filePath)).getAuth()),
  );
}

function jsonContent(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}
