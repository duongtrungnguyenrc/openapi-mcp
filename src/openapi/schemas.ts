import type { OpenApiDocument } from "./types.js";
import { normalizeText } from "./utils.js";

export function getSchema(document: OpenApiDocument, name: string) {
  return document.components?.schemas?.[name];
}

export function searchSchemas(
  document: OpenApiDocument,
  query: string,
): Array<{ name: string; schema: unknown }> {
  const normalizedQuery = normalizeText(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return Object.entries(document.components?.schemas ?? {})
    .map(([name, schema]) => ({
      name,
      schema,
      score: scoreSchema(name, schema, terms, normalizedQuery),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ name, schema }) => ({ name, schema }));
}

function scoreSchema(
  name: string,
  schema: unknown,
  terms: string[],
  normalizedQuery: string,
): number {
  const haystack = normalizeText(`${name} ${JSON.stringify(schema)}`);
  let score = haystack.includes(normalizedQuery) ? 5 : 0;
  score += terms.filter((term) => haystack.includes(term)).length;
  return score;
}
