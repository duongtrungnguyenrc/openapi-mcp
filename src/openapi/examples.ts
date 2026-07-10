import { isRecord } from "./utils.js";

export function generateExampleFromRequestBody(requestBody: unknown): unknown {
  const schema = extractRequestSchema(requestBody);
  return schema ? generateExampleFromSchema(schema) : undefined;
}

export function extractJsonRequestSchema(requestBody: unknown): unknown {
  return extractRequestSchema(requestBody, (type) => type.includes("json"));
}

function extractRequestSchema(
  requestBody: unknown,
  matchesType?: (type: string) => boolean,
): unknown {
  if (!isRecord(requestBody)) {
    return undefined;
  }

  const content = requestBody.content;
  if (!isRecord(content)) {
    return undefined;
  }

  const mediaType = matchesType
    ? Object.entries(content).find(([type]) => matchesType(type))?.[1]
    : (content["application/json"] ??
      Object.entries(content).find(([type]) => type.includes("json"))?.[1] ??
      content["multipart/form-data"] ??
      Object.values(content)[0]);
  if (!isRecord(mediaType)) {
    return undefined;
  }

  return mediaType.schema;
}

function generateExampleFromSchema(schema: unknown): unknown {
  if (!isRecord(schema)) {
    return undefined;
  }

  if (typeof schema.$ref === "string") {
    return `<${schema.$ref}>`;
  }

  if (Array.isArray(schema.allOf)) {
    return mergeExamples(schema.allOf.map(generateExampleFromSchema));
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return generateExampleFromSchema(schema.oneOf[0]);
  }

  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return generateExampleFromSchema(schema.anyOf[0]);
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

  if (schema.format === "binary") {
    return "<binary file>";
  }

  return "string";
}

function mergeExamples(examples: unknown[]) {
  const records = examples.filter(isRecord);

  if (records.length > 0) {
    return Object.assign({}, ...records);
  }

  return examples.find((example) => example !== undefined);
}
