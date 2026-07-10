import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OpenApiProvider } from "./openapi-provider.js";
import { requireSpecSource } from "./spec-source.js";

const emptyInput = {};

export function registerOpenApiTools(
  server: McpServer,
  getProvider: (filePath: string) => OpenApiProvider,
) {
  const provider = () => getProvider(requireSpecSource());

  server.registerTool(
    "summarize_openapi",
    {
      title: "Summarize OpenAPI document",
      description:
        "Load the configured OpenAPI JSON/YAML source and return high-level metadata plus counts.",
      inputSchema: emptyInput,
    },
    async () => jsonContent(await provider().summarize()),
  );

  server.registerTool(
    "list_endpoints",
    {
      title: "List OpenAPI endpoints",
      description: "List all HTTP endpoints from the configured OpenAPI JSON/YAML source.",
      inputSchema: emptyInput,
    },
    async () => textContent(formatEndpointList(await provider().listEndpoints())),
  );

  server.registerTool(
    "list_operations",
    {
      title: "List OpenAPI operations",
      description: "Alias for list_endpoints for compatibility.",
      inputSchema: emptyInput,
    },
    async () => textContent(formatEndpointList(await provider().listEndpoints())),
  );

  server.registerTool(
    "find_endpoint",
    {
      title: "Find endpoint",
      description: "Search endpoints by method, path, operationId, summary, description, or tags.",
      inputSchema: {
        query: z.string().describe("Search text, for example: create shipment."),
      },
    },
    async ({ query }) => jsonContent(await provider().findEndpoint(query)),
  );

  server.registerTool(
    "get_endpoint",
    {
      title: "Get endpoint",
      description: "Return focused request/response/security context for one endpoint.",
      inputSchema: {
        method: z.string().describe("HTTP method, for example POST."),
        path: z.string().describe("OpenAPI path, for example /shipments."),
        dereference: z
          .boolean()
          .optional()
          .describe("Resolve $ref values before returning the endpoint."),
      },
    },
    async ({ method, path, dereference }) =>
      jsonContent(await provider().getEndpoint(method, path, dereference ?? false)),
  );

  server.registerTool(
    "get_schema",
    {
      title: "Get schema",
      description: "Return a component schema by name.",
      inputSchema: {
        name: z.string().describe("Schema name in components.schemas."),
      },
    },
    async ({ name }) => jsonContent(await provider().getSchema(name)),
  );

  server.registerTool(
    "resolve_schema",
    {
      title: "Resolve schema",
      description: "Return a component schema with $ref values resolved.",
      inputSchema: {
        name: z.string().describe("Schema name in components.schemas."),
      },
    },
    async ({ name }) => jsonContent(await provider().getSchema(name, true)),
  );

  server.registerTool(
    "search_schema",
    {
      title: "Search schema",
      description: "Search component schemas by name and schema content.",
      inputSchema: {
        query: z.string().describe("Search text, for example: vehicle."),
      },
    },
    async ({ query }) => jsonContent(await provider().searchSchema(query)),
  );

  server.registerTool(
    "explain_endpoint",
    {
      title: "Explain endpoint",
      description: "Generate auth/request/response/errors/example documentation for one endpoint.",
      inputSchema: {
        method: z.string().describe("HTTP method."),
        path: z.string().describe("OpenAPI path."),
      },
    },
    async ({ method, path }) => jsonContent(await provider().explainEndpoint(method, path)),
  );

  server.registerTool(
    "generate_example",
    {
      title: "Generate example",
      description: "Generate an example JSON request body for one endpoint.",
      inputSchema: {
        method: z.string().describe("HTTP method."),
        path: z.string().describe("OpenAPI path."),
      },
    },
    async ({ method, path }) => jsonContent(await provider().generateExample(method, path)),
  );

  server.registerTool(
    "validate_request",
    {
      title: "Validate request",
      description: "Validate a JSON request body against an endpoint request schema.",
      inputSchema: {
        method: z.string().describe("HTTP method."),
        path: z.string().describe("OpenAPI path."),
        data: z.unknown().describe("JSON request body to validate."),
      },
    },
    async ({ method, path, data }) =>
      jsonContent(await provider().validateRequest(method, path, data)),
  );

  server.registerTool(
    "get_auth",
    {
      title: "Get auth",
      description: "Return global security requirements and security schemes.",
      inputSchema: emptyInput,
    },
    async () => jsonContent(await provider().getAuth()),
  );
}

function jsonContent(value: unknown) {
  return textContent(JSON.stringify(value, null, 2));
}

function textContent(text: string) {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

function formatEndpointList(endpoints: Awaited<ReturnType<OpenApiProvider["listEndpoints"]>>) {
  const groups = new Map<string, string[]>();

  for (const endpoint of endpoints) {
    const tag =
      Array.isArray(endpoint.tags) && typeof endpoint.tags[0] === "string"
        ? endpoint.tags[0]
        : "Untagged";
    const summary =
      typeof endpoint.summary === "string" && endpoint.summary ? ` — ${endpoint.summary}` : "";
    const operationId =
      typeof endpoint.operationId === "string" ? ` (${endpoint.operationId})` : "";
    const line = `${endpoint.method.padEnd(6)} ${endpoint.path}${operationId}${summary}`;
    groups.set(tag, [...(groups.get(tag) ?? []), line]);
  }

  return Array.from(groups.entries())
    .map(([tag, lines]) => [`# ${tag}`, ...lines].join("\n"))
    .join("\n\n");
}
