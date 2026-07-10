import { isRecord } from "./utils.js";

export function summarizeSecurity(security: unknown) {
  if (!Array.isArray(security) || security.length === 0) {
    return "No authentication declared.";
  }

  return security;
}

export function extractErrorResponses(responses: unknown) {
  if (!isRecord(responses)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(responses).filter(
      ([status]) => status.startsWith("4") || status.startsWith("5"),
    ),
  );
}
