import { isRecord } from "./utils.js";
import { generateExampleFromSchema } from "./examples.js";

export interface FlatRequestBody {
  required: boolean;
  contentType: string;
  schema: unknown;
  example: unknown;
}

export interface FlatResponse {
  description: string;
  contentType?: string;
  schema?: unknown;
  example?: unknown;
}

export function flattenRequestBody(requestBody: unknown): FlatRequestBody | undefined {
  if (!isRecord(requestBody)) {
    return undefined;
  }

  const content = requestBody.content;
  if (!isRecord(content)) {
    return undefined;
  }

  const [contentType, mediaType] = pickMediaType(content);
  if (!contentType || !isRecord(mediaType)) {
    return undefined;
  }

  const schema = mediaType.schema;

  return {
    required: requestBody.required === true,
    contentType,
    schema,
    example: isRecord(schema) ? generateExampleFromSchema(schema) : undefined,
  };
}

export function flattenResponses(responses: unknown): Record<string, FlatResponse> | undefined {
  if (!isRecord(responses)) {
    return undefined;
  }

  const result: Record<string, FlatResponse> = {};

  for (const [status, responseObj] of Object.entries(responses)) {
    if (!isRecord(responseObj)) {
      result[status] = { description: "" };
      continue;
    }

    const description = typeof responseObj.description === "string" ? responseObj.description : "";
    const content = responseObj.content;

    if (!isRecord(content)) {
      result[status] = { description };
      continue;
    }

    const [contentType, mediaType] = pickMediaType(content);

    if (!contentType || !isRecord(mediaType)) {
      result[status] = { description };
      continue;
    }

    const schema = mediaType.schema;

    result[status] = {
      description,
      contentType,
      schema,
      example: isRecord(schema) ? generateExampleFromSchema(schema) : undefined,
    };
  }

  return result;
}

function pickMediaType(content: Record<string, unknown>): [string, unknown] {
  const jsonKey = Object.keys(content).find((type) => type.includes("json"));
  if (jsonKey) {
    return [jsonKey, content[jsonKey]];
  }

  const firstKey = Object.keys(content)[0];
  return firstKey ? [firstKey, content[firstKey]] : ["", undefined];
}
