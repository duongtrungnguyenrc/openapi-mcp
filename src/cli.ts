#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { homedir } from "node:os";
import { startMcpServer } from "./index.js";
import { promptMultiSelect } from "./prompt.js";

type McpServerEntry = {
  command: string;
  args: string[];
  env: Record<string, string>;
};

type McpConfig = {
  mcpServers?: Record<string, McpServerEntry>;
  [key: string]: unknown;
};

const serverName = "apilens";

function getServerEntry(spec?: string): McpServerEntry {
  return {
    command: "apilens",
    args: ["--mcp", ...(spec ? ["--spec", spec] : [])],
    env: {
      NODE_OPTIONS: "--use-system-ca",
    },
  };
}

type ConfigFormat = "json" | "toml";

type ProviderDef = {
  id: string;
  name: string;
  format: ConfigFormat;
  configPath: () => string | undefined;
  detectPath: () => string | undefined;
};

const PROVIDERS: ProviderDef[] = [
  {
    id: "antigravity",
    name: "Antigravity IDE",
    format: "json",
    configPath: () => join(homedir(), ".gemini", "antigravity-ide", "mcp.json"),
    detectPath: () => join(homedir(), ".gemini", "antigravity-ide"),
  },
  {
    id: "claude",
    name: "Claude Desktop",
    format: "json",
    configPath: () => {
      if (process.platform === "win32") {
        return process.env.APPDATA
          ? join(process.env.APPDATA, "Claude", "claude_desktop_config.json")
          : undefined;
      }
      return join(
        homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json",
      );
    },
    detectPath: () => {
      if (process.platform === "win32") {
        return process.env.APPDATA ? join(process.env.APPDATA, "Claude") : undefined;
      }
      return join(homedir(), "Library", "Application Support", "Claude");
    },
  },
  {
    id: "cline_vscode",
    name: "Cline (VS Code)",
    format: "json",
    configPath: () => {
      if (process.platform === "win32") {
        return process.env.APPDATA
          ? join(
              process.env.APPDATA,
              "Code",
              "User",
              "globalStorage",
              "saoudrizwan.claude-dev",
              "settings",
              "cline_mcp_settings.json",
            )
          : undefined;
      }
      return join(
        homedir(),
        "Library",
        "Application Support",
        "Code",
        "User",
        "globalStorage",
        "saoudrizwan.claude-dev",
        "settings",
        "cline_mcp_settings.json",
      );
    },
    detectPath: () => {
      if (process.platform === "win32") {
        return process.env.APPDATA
          ? join(process.env.APPDATA, "Code", "User", "globalStorage", "saoudrizwan.claude-dev")
          : undefined;
      }
      return join(
        homedir(),
        "Library",
        "Application Support",
        "Code",
        "User",
        "globalStorage",
        "saoudrizwan.claude-dev",
      );
    },
  },
  {
    id: "roo_cline_vscode",
    name: "Roo Cline (VS Code)",
    format: "json",
    configPath: () => {
      if (process.platform === "win32") {
        return process.env.APPDATA
          ? join(
              process.env.APPDATA,
              "Code",
              "User",
              "globalStorage",
              "roovet.roo-cline",
              "settings",
              "cline_mcp_settings.json",
            )
          : undefined;
      }
      return join(
        homedir(),
        "Library",
        "Application Support",
        "Code",
        "User",
        "globalStorage",
        "roovet.roo-cline",
        "settings",
        "cline_mcp_settings.json",
      );
    },
    detectPath: () => {
      if (process.platform === "win32") {
        return process.env.APPDATA
          ? join(process.env.APPDATA, "Code", "User", "globalStorage", "roovet.roo-cline")
          : undefined;
      }
      return join(
        homedir(),
        "Library",
        "Application Support",
        "Code",
        "User",
        "globalStorage",
        "roovet.roo-cline",
      );
    },
  },
  {
    id: "cline_cursor",
    name: "Cline (Cursor)",
    format: "json",
    configPath: () => {
      if (process.platform === "win32") {
        return process.env.APPDATA
          ? join(
              process.env.APPDATA,
              "Cursor",
              "User",
              "globalStorage",
              "saoudrizwan.claude-dev",
              "settings",
              "cline_mcp_settings.json",
            )
          : undefined;
      }
      return join(
        homedir(),
        "Library",
        "Application Support",
        "Cursor",
        "User",
        "globalStorage",
        "saoudrizwan.claude-dev",
        "settings",
        "cline_mcp_settings.json",
      );
    },
    detectPath: () => {
      if (process.platform === "win32") {
        return process.env.APPDATA
          ? join(process.env.APPDATA, "Cursor", "User", "globalStorage", "saoudrizwan.claude-dev")
          : undefined;
      }
      return join(
        homedir(),
        "Library",
        "Application Support",
        "Cursor",
        "User",
        "globalStorage",
        "saoudrizwan.claude-dev",
      );
    },
  },
  {
    id: "roo_cline_cursor",
    name: "Roo Cline (Cursor)",
    format: "json",
    configPath: () => {
      if (process.platform === "win32") {
        return process.env.APPDATA
          ? join(
              process.env.APPDATA,
              "Cursor",
              "User",
              "globalStorage",
              "roovet.roo-cline",
              "settings",
              "cline_mcp_settings.json",
            )
          : undefined;
      }
      return join(
        homedir(),
        "Library",
        "Application Support",
        "Cursor",
        "User",
        "globalStorage",
        "roovet.roo-cline",
        "settings",
        "cline_mcp_settings.json",
      );
    },
    detectPath: () => {
      if (process.platform === "win32") {
        return process.env.APPDATA
          ? join(process.env.APPDATA, "Cursor", "User", "globalStorage", "roovet.roo-cline")
          : undefined;
      }
      return join(
        homedir(),
        "Library",
        "Application Support",
        "Cursor",
        "User",
        "globalStorage",
        "roovet.roo-cline",
      );
    },
  },
  {
    id: "codex",
    name: "Codex",
    format: "toml",
    configPath: () => join(homedir(), ".codex", "config.toml"),
    detectPath: () => join(homedir(), ".codex"),
  },
];

function printHelp() {
  console.log(`ApiLens CLI

Usage:
  apilens --mcp [--spec <path-or-url>]
  apilens setup [--config <path>] [--spec <path-or-url>] [--provider <name>] [--providers <names>] [--yes]
  apilens print-config [--spec <path-or-url>]

Commands:
  setup         Add ApiLens to agentic MCP config JSON file(s).
                If no target is specified, it will auto-detect and prompt.
  print-config  Print the mcpServers JSON snippet for manual setup.

Options:
  --mcp         Run ApiLens as an MCP stdio server.
  --config      Path to a specific custom JSON agent MCP config file.
  --provider    Configure a specific agent provider (e.g. claude, codex, antigravity, cline_vscode). Repeatable.
  --providers   Comma-separated list of agent providers to configure.
  --yes         Skip prompting and automatically setup all detected providers.
  --spec        OpenAPI JSON/YAML path or URL used as the configured spec source.
`);
}

function parseOption(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function parseAllOptions(name: string): string[] {
  const values: string[] = [];
  let index = process.argv.indexOf(name);
  while (index !== -1) {
    const val = process.argv[index + 1];
    if (val && !val.startsWith("-")) {
      values.push(val);
    }
    index = process.argv.indexOf(name, index + 1);
  }
  return values;
}

function parseProvidersOption(): string[] {
  const providers: string[] = [];
  providers.push(...parseAllOptions("--provider"));

  const csv = parseOption("--providers");
  if (csv) {
    providers.push(
      ...csv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  return providers;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function readConfig(configPath: string): Promise<McpConfig> {
  if (!existsSync(configPath)) {
    return {};
  }

  const raw = await readFile(configPath, "utf8");
  return raw.trim() ? (JSON.parse(raw) as McpConfig) : {};
}

async function configureJsonPath(configPath: string, spec?: string) {
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

async function configureTomlPath(configPath: string, spec?: string) {
  const absoluteConfigPath = resolve(configPath);
  const existing = existsSync(absoluteConfigPath) ? await readFile(absoluteConfigPath, "utf8") : "";
  const next = upsertCodexTomlServer(existing, spec);

  await mkdir(dirname(absoluteConfigPath), { recursive: true });
  await writeFile(absoluteConfigPath, next, "utf8");
  console.log(`Configured ${serverName} in ${absoluteConfigPath}`);
}

async function configurePath(configPath: string, spec?: string, format: ConfigFormat = "json") {
  if (format === "toml") {
    await configureTomlPath(configPath, spec);
    return;
  }

  await configureJsonPath(configPath, spec);
}

function upsertCodexTomlServer(content: string, spec?: string) {
  const block = formatCodexTomlServer(spec);
  const pattern = new RegExp(
    `(?:^|\\n)\\[mcp_servers\\.${serverName}\\]\\n[\\s\\S]*?(?=\\n\\[[^\\n]+\\]|$)`,
  );
  const trimmed = content.trimEnd();

  if (pattern.test(trimmed)) {
    return `${trimmed.replace(pattern, `\n${block}`).trimStart()}\n`;
  }

  return `${trimmed ? `${trimmed}\n\n` : ""}${block}\n`;
}

function formatCodexTomlServer(spec?: string) {
  const args = ["--mcp", ...(spec ? ["--spec", spec] : [])];
  return [
    `[mcp_servers.${serverName}]`,
    `command = "apilens"`,
    `args = [${args.map((arg) => `"${escapeTomlString(arg)}"`).join(", ")}]`,
    `[mcp_servers.${serverName}.env]`,
    `NODE_OPTIONS = "--use-system-ca"`,
  ].join("\n");
}

function escapeTomlString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function setup() {
  const spec = parseOption("--spec");

  // 1. Explicit config path override
  const explicitPath = parseOption("--config");
  if (explicitPath) {
    await configurePath(explicitPath, spec, "json");
    return;
  }

  // 2. Determine target provider IDs
  let selectedIds: string[] = [];
  const providerFlags = parseProvidersOption();

  if (providerFlags.length > 0) {
    selectedIds = providerFlags.filter((id) => PROVIDERS.some((p) => p.id === id));
    if (selectedIds.length === 0) {
      throw new Error(`None of the specified providers are supported: ${providerFlags.join(", ")}`);
    }
  } else {
    // Auto-detect existing providers
    const detectedOptions = PROVIDERS.map((p) => {
      const detectPath = p.detectPath();
      const detected = !!detectPath && existsSync(detectPath);
      return {
        name: p.name + (detected ? " (Detected)" : ""),
        value: p.id,
        selected: detected,
      };
    });

    if (hasFlag("--yes")) {
      selectedIds = detectedOptions.filter((o) => o.selected).map((o) => o.value);
      if (selectedIds.length === 0) {
        console.warn("No providers were auto-detected. Nothing to configure.");
        return;
      }
    } else {
      selectedIds = await promptMultiSelect(
        "Select agent providers to configure:",
        detectedOptions,
      );
    }
  }

  if (selectedIds.length === 0) {
    console.log("No providers selected. Setup cancelled.");
    return;
  }

  // 3. Configure all selected targets
  for (const id of selectedIds) {
    const provider = PROVIDERS.find((p) => p.id === id);
    if (!provider) continue;

    const path = provider.configPath();
    if (!path) {
      console.warn(`Could not resolve config path for provider: ${provider.name}`);
      continue;
    }

    try {
      await configurePath(path, spec, provider.format);
    } catch (error) {
      console.error(
        `Failed to configure ${provider.name} at ${path}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

function printConfig() {
  const spec = parseOption("--spec");
  console.log(JSON.stringify({ mcpServers: { [serverName]: getServerEntry(spec) } }, null, 2));
}

const command = process.argv[2];

try {
  if (process.argv.includes("--mcp")) {
    await startMcpServer();
  } else if (!command || command === "--help" || command === "-h") {
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
