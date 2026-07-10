import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OpenApiProvider } from "./openapi-provider.js";
import { requireSpecSource } from "./spec-source.js";

export function registerOpenApiResources(
  server: McpServer,
  getProvider: (filePath: string) => OpenApiProvider,
) {
  server.registerResource(
    "openapi-info",
    "openapi://info",
    {
      title: "OpenAPI info",
      description: "OpenAPI metadata, version, and servers for the configured spec.",
    },
    async (uri) =>
      resourceContent(uri.href, await getProvider(requireSpecSource()).getInfoResource()),
  );

  server.registerResource(
    "openapi-components",
    "openapi://components",
    {
      title: "OpenAPI components",
      description: "OpenAPI components object for the configured spec.",
    },
    async (uri) =>
      resourceContent(uri.href, await getProvider(requireSpecSource()).getComponentsResource()),
  );

  server.registerResource(
    "openapi-servers",
    "openapi://servers",
    {
      title: "OpenAPI servers",
      description: "OpenAPI servers list for the configured spec.",
    },
    async (uri) =>
      resourceContent(uri.href, await getProvider(requireSpecSource()).getServersResource()),
  );
}

function resourceContent(uri: string, value: unknown) {
  return {
    contents: [{ uri, text: JSON.stringify(value, null, 2) }],
  };
}
