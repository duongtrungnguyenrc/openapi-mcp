import { isRecord } from "./utils.js";

export function generateExampleFromRequestBody(requestBody: unknown): unknown {
  const schema = extractJsonRequestSchema(requestBody);
  return schema ? generateExampleFromSchema(schema) : undefined;
}

export function extractJsonRequestSchema(requestBody: unknown): unknown {
  if (!isRecord(requestBody)) {
    return undefined;
  }

  const content = requestBody.content;
  if (!isRecord(content)) {
    return undefined;
  }

  const jsonMediaType =
    content["application/json"] ??
    Object.entries(content).find(([type]) => type.includes("json"))?.[1];
  if (!isRecord(jsonMediaType)) {
    return undefined;
  }

  return jsonMediaType.schema;
}

function generateExampleFromSchema(schema: unknown): unknown {
  if (!isRecord(schema)) {
    return undefined;
  }

  if ("example" in schema) {
    return schema.example;
  }

  if ("default" in schema) {
    return schema.default;
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }

  if (schema.type === "object" || isRecord(schema.properties)) {
    const properties = isRecord(schema.properties) ? schema.properties : {};
    return Object.fromEntries(
      Object.entries(properties).map(([propertyName, propertySchema]) => [
        propertyName,
        generateExampleFromSchema(propertySchema),
      ]),
    );
  }

  if (schema.type === "array") {
    return [generateExampleFromSchema(schema.items)];
  }

  if (schema.type === "integer" || schema.type === "number") {
    return 0;
  }

  if (schema.type === "boolean") {
    return true;
  }

  return "string";
}
