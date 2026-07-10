import { OpenApiProvider } from "./openapi-provider.js";

const providerCache = new Map<string, OpenApiProvider>();

export function getProvider(filePath: string) {
  const provider = providerCache.get(filePath) ?? new OpenApiProvider(filePath);
  providerCache.set(filePath, provider);
  return provider;
}
