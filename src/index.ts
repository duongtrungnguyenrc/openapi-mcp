#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getProvider } from "./provider-cache.js";
import { registerOpenApiResources } from "./resources.js";
import { registerOpenApiTools } from "./tools.js";

const server = new McpServer({
  name: "openapi-mcp",
  version: "0.1.0",
});

registerOpenApiTools(server, getProvider);
registerOpenApiResources(server, getProvider);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main()
  .then(() => {
    console.error("OpenAPI MCP server started successfully!!");
  })
  .catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
