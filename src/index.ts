#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getProvider } from "./provider-cache.js";
import { registerOpenApiResources } from "./resources.js";
import { registerOpenApiTools } from "./tools.js";

export async function startMcpServer() {
  const server = new McpServer({
    name: "apilens",
    version: "0.1.0",
  });

  registerOpenApiTools(server, getProvider);
  registerOpenApiResources(server, getProvider);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
