import { Ajv } from "ajv/dist/ajv.js";
import { extractJsonRequestSchema } from "./examples.js";

export function validateRequestBody(requestBody: unknown, data: unknown) {
  const schema = extractJsonRequestSchema(requestBody);

  if (!schema) {
    return { valid: true, errors: [], message: "Endpoint has no JSON request body schema." };
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(data);

  return {
    valid,
    errors: validate.errors ?? [],
  };
}
