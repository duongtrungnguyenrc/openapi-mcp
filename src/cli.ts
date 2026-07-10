#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type McpConfig = {
  mcpServers?: Record<string, { command: string; args: string[] }>;
  [key: string]: unknown;
};

const serverName = "openapi-docs";

function getServerEntry(spec?: string) {
  return {
    command: "openapi-mcp",
    args: [...(spec ? ["--spec", spec] : [])],
  };
}

function printHelp() {
  console.log(`OpenAPI Docs MCP CLI

Usage:
  openapi-mcp setup --config <path> [--spec <path-or-url>]
  openapi-mcp print-config [--spec <path-or-url>]

Commands:
  setup         Add this MCP server to an agent MCP config JSON file.
  print-config  Print the mcpServers JSON snippet for manual setup.

Options:
  --config      Path to the agent MCP config JSON file.
  --spec        OpenAPI JSON/YAML path or URL used as the configured spec source.
`);
}

function parseOption(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function readConfig(configPath: string): Promise<McpConfig> {
  if (!existsSync(configPath)) {
    return {};
  }

  const raw = await readFile(configPath, "utf8");
  return raw.trim() ? (JSON.parse(raw) as McpConfig) : {};
}

async function setup() {
  const configPath = parseOption("--config");

  if (!configPath) {
    throw new Error("Missing required --config <path> option.");
  }

  const spec = parseOption("--spec");
  const absoluteConfigPath = resolve(configPath);
  const config = await readConfig(absoluteConfigPath);
  config.mcpServers = {
    ...(config.mcpServers ?? {}),
    [serverName]: getServerEntry(spec),
  };

  await mkdir(dirname(absoluteConfigPath), { recursive: true });
  await writeFile(absoluteConfigPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  console.log(`Configured ${serverName} in ${absoluteConfigPath}`);
}

function printConfig() {
  const spec = parseOption("--spec");
  console.log(JSON.stringify({ mcpServers: { [serverName]: getServerEntry(spec) } }, null, 2));
}

const command = process.argv[2];

try {
  if (!command || command === "--help" || command === "-h") {
    printHelp();
  } else if (command === "setup") {
    await setup();
  } else if (command === "print-config") {
    printConfig();
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
