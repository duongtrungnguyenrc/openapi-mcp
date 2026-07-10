import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OpenApiProvider } from "./openapi-provider.js";
import { requireSpecSource } from "./spec-source.js";
import { isRecord } from "./openapi/utils.js";

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
    async () => {
      const data = await provider().summarize();
      return structuredContent(data, describeSummary(data));
    },
  );

  server.registerTool(
    "list_endpoints",
    {
      title: "List OpenAPI endpoints",
      description: "List all HTTP endpoints from the configured OpenAPI JSON/YAML source.",
      inputSchema: emptyInput,
    },
    async () => {
      const data = await provider().listEndpoints();
      return structuredContent(data, `${data.endpoints.length} endpoints`);
    },
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
    async ({ query }) => {
      const data = await provider().findEndpoint(query);
      return structuredContent(
        data,
        `Found ${data.endpoints.length} endpoint(s) matching '${query}'`,
      );
    },
  );

  server.registerTool(
    "get_endpoint",
    {
      title: "Get endpoint",
      description:
        "Return fully resolved endpoint detail including parameters, request body schema, response schemas, and auto-generated examples. All $ref are resolved.",
      inputSchema: {
        method: z.string().describe("HTTP method, for example POST."),
        path: z.string().describe("OpenAPI path, for example /shipments."),
      },
    },
    async ({ method, path }) => {
      const data = await provider().getEndpoint(method, path);
      return structuredContent(data, describeEndpoint(data));
    },
  );

  server.registerTool(
    "get_schema",
    {
      title: "Get schema",
      description: "Return a component schema by name with all $ref resolved.",
      inputSchema: {
        name: z.string().describe("Schema name in components.schemas."),
      },
    },
    async ({ name }) => {
      const data = await provider().getSchema(name);
      return structuredContent({ name, schema: data }, describeSchema(name, data));
    },
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
    async ({ query }) => {
      const data = await provider().searchSchema(query);
      return structuredContent(
        { results: data },
        `Found ${data.length} schema(s) matching '${query}'`,
      );
    },
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
    async ({ method, path, data }) => {
      const result = await provider().validateRequest(method, path, data);
      const valid = result.valid === true;
      const errorCount = Array.isArray(result.errors) ? result.errors.length : 0;
      const text = valid ? "Valid" : `Invalid: ${errorCount} error(s)`;
      return structuredContent(result, text);
    },
  );

  server.registerTool(
    "get_auth",
    {
      title: "Get auth",
      description: "Return global security requirements and security schemes.",
      inputSchema: emptyInput,
    },
    async () => {
      const data = await provider().getAuth();
      return structuredContent(data, describeAuth(data));
    },
  );
}

function structuredContent(value: unknown, text: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: toMarkdownContent(value, text),
      },
    ],
  };
}

function toMarkdownContent(value: unknown, summary: string): string {
  return [`## ${summary}`, "", "```json", JSON.stringify(value, null, 2), "```"].join("\n");
}

function describeSummary(data: Record<string, unknown>): string {
  const title = data.title ?? "OpenAPI";
  const version = data.version ? ` v${data.version}` : "";
  return `${title}${version} — ${data.pathCount} paths, ${data.operationCount} operations, ${data.schemaCount} schemas`;
}

function describeEndpoint(data: Record<string, unknown>): string {
  const header = `${data.method} ${data.path}`;
  const parts: string[] = [header];

  if (typeof data.summary === "string" && data.summary) {
    parts.push(`— ${data.summary}`);
  }

  const security = data.security;
  if (Array.isArray(security) && security.length > 0) {
    const schemes = security.filter(isRecord).flatMap((s) => Object.keys(s));
    if (schemes.length > 0) {
      parts.push(`Auth: ${schemes.join(", ")}`);
    }
  }

  const body = data.requestBody;
  if (
    isRecord(body) &&
    isRecord(body.schema) &&
    isRecord((body.schema as Record<string, unknown>).properties)
  ) {
    const fieldCount = Object.keys(
      (body.schema as Record<string, unknown>).properties as Record<string, unknown>,
    ).length;
    parts.push(`Body: ${fieldCount} field(s)`);
  }

  const responses = data.responses;
  if (isRecord(responses)) {
    parts.push(`Responses: ${Object.keys(responses).join(", ")}`);
  }

  return parts.join(". ");
}

function describeSchema(name: string, schema: unknown): string {
  if (!isRecord(schema)) {
    return name;
  }

  const type = typeof schema.type === "string" ? schema.type : "object";

  if (isRecord(schema.properties)) {
    return `${name} — ${type} with ${Object.keys(schema.properties).length} properties`;
  }

  if (Array.isArray(schema.enum)) {
    return `${name} — enum [${schema.enum.slice(0, 5).join(", ")}${schema.enum.length > 5 ? ", ..." : ""}]`;
  }

  return `${name} — ${type}`;
}

function describeAuth(data: Record<string, unknown>): string {
  const schemes = data.securitySchemes;
  if (!isRecord(schemes) || Object.keys(schemes).length === 0) {
    return "No security schemes defined";
  }

  const parts = Object.entries(schemes).map(([name, scheme]) => {
    if (isRecord(scheme) && typeof scheme.type === "string") {
      return `${name} (${scheme.type})`;
    }
    return name;
  });

  return `Auth: ${parts.join(", ")}`;
}
