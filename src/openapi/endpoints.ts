import type { EndpointSummary, OpenApiDocument } from "./types.js";
import { isRecord, normalizeText } from "./utils.js";

const httpMethods = new Set(["get", "put", "post", "delete", "options", "head", "patch", "trace"]);

export function listEndpoints(document: OpenApiDocument): EndpointSummary[] {
  return Object.entries(document.paths ?? {}).flatMap(([path, pathItem]) => {
    if (!isRecord(pathItem)) {
      return [];
    }

    return Object.entries(pathItem)
      .filter(([method]) => httpMethods.has(method.toLowerCase()))
      .map(([method, operation]) => toEndpointSummary(path, method, operation));
  });
}

export function getOperation(document: OpenApiDocument, method: string, path: string) {
  const normalizedMethod = method.toLowerCase();
  const matchedPath = findMatchingPath(Object.keys(document.paths ?? {}), path);
  const operation = matchedPath ? document.paths?.[matchedPath]?.[normalizedMethod] : undefined;

  return isRecord(operation) ? operation : undefined;
}

function findMatchingPath(paths: string[], inputPath: string) {
  const normalizedInput = normalizePathSegments(inputPath);

  return (
    paths.find((path) => normalizePathSegments(path) === normalizedInput) ??
    paths.find((path) => pathMatchesSuffix(normalizePathSegments(path), normalizedInput))
  );
}

function pathMatchesSuffix(specPath: string, inputPath: string) {
  return specPath.endsWith(`/${inputPath}`) || inputPath.endsWith(`/${specPath}`);
}

function normalizePathSegments(path: string) {
  return path
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/")
    .toLowerCase();
}

export function findEndpoints(endpoints: EndpointSummary[], query: string): EndpointSummary[] {
  const normalizedQuery = normalizeText(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return endpoints
    .map((endpoint) => ({ endpoint, score: scoreEndpoint(endpoint, terms, normalizedQuery) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ endpoint }) => endpoint);
}

function toEndpointSummary(path: string, method: string, operation: unknown): EndpointSummary {
  const operationObject = isRecord(operation) ? operation : {};

  return {
    method: method.toUpperCase(),
    path,
    operationId: operationObject.operationId,
    summary: operationObject.summary,
    description: operationObject.description,
    tags: operationObject.tags,
  };
}

function scoreEndpoint(
  endpoint: EndpointSummary,
  terms: string[],
  normalizedQuery: string,
): number {
  const haystack = normalizeText(
    [
      endpoint.method,
      endpoint.path,
      endpoint.operationId,
      endpoint.summary,
      endpoint.description,
      Array.isArray(endpoint.tags) ? endpoint.tags.join(" ") : endpoint.tags,
    ]
      .filter(Boolean)
      .join(" "),
  );

  let score = haystack.includes(normalizedQuery) ? 5 : 0;
  score += terms.filter((term) => haystack.includes(term)).length;
  return score;
}
