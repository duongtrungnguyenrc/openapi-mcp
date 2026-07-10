export function getDefaultSpecSource() {
  const specOptionIndex = process.argv.indexOf("--spec");
  const specFromOption = specOptionIndex === -1 ? undefined : process.argv[specOptionIndex + 1];
  return specFromOption ?? process.env.OPENAPI_SPEC;
}

export function requireSpecSource(filePath?: string) {
  const specSource = filePath ?? getDefaultSpecSource();

  if (!specSource) {
    throw new Error(
      "Missing OpenAPI spec source. Pass filePath to the tool, start the server with --spec <path-or-url>, or set OPENAPI_SPEC.",
    );
  }

  return specSource;
}
