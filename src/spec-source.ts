export function getDefaultSpecSource() {
  const specOptionIndex = process.argv.indexOf("--spec");
  const specFromOption = specOptionIndex === -1 ? undefined : process.argv[specOptionIndex + 1];
  return specFromOption ?? process.env.OPENAPI_SPEC;
}

export function requireSpecSource() {
  const specSource = getDefaultSpecSource();

  if (!specSource) {
    throw new Error(
      "Missing OpenAPI spec source. Start the server with --spec <path-or-url> or set OPENAPI_SPEC.",
    );
  }

  return specSource;
}
