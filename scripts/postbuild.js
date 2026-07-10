import { chmod } from "node:fs/promises";

await Promise.all([chmod("dist/index.js", 0o755), chmod("dist/cli.js", 0o755)]);
