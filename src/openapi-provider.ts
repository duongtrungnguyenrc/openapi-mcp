import type { EndpointSummary } from "./openapi/types.js";
import { findEndpoints, getOperation, listEndpoints } from "./openapi/endpoints.js";
import { generateExampleFromRequestBody } from "./openapi/examples.js";
import { OpenApiLoader } from "./openapi/loader.js";
import { getSchema as getSchemaByName, searchSchemas } from "./openapi/schemas.js";
import { extractErrorResponses, summarizeSecurity } from "./openapi/documentation.js";
import { validateRequestBody } from "./openapi/validation.js";

export class OpenApiProvider {
  private readonly loader: OpenApiLoader;
  private endpoints?: EndpointSummary[];

  constructor(sourcePath: string) {
    this.loader = new OpenApiLoader(sourcePath);
  }

  async summarize() {
    const document = await this.loader.load();
    const endpoints = await this.listEndpoints();

    return {
      title: document.info?.title,
      version: document.info?.version,
      description: document.info?.description,
      openapi: document.openapi ?? document.swagger,
      servers: document.servers ?? [],
      pathCount: Object.keys(document.paths ?? {}).length,
      operationCount: endpoints.length,
      schemaCount: Object.keys(document.components?.schemas ?? {}).length,
    };
  }

  async listEndpoints(): Promise<EndpointSummary[]> {
    if (!this.endpoints) {
      this.endpoints = listEndpoints(await this.loader.load());
    }

    return this.endpoints;
  }

  async findEndpoint(query: string): Promise<EndpointSummary[]> {
    return findEndpoints(await this.listEndpoints(), query);
  }

  async getEndpoint(method: string, path: string, dereference = false) {
    const document = dereference ? await this.loader.loadDereferenced() : await this.loader.load();
    const operation = getOperation(document, method, path);

    if (!operation) {
      throw new Error(`Endpoint not found: ${method.toUpperCase()} ${path}`);
    }

    return {
      method: method.toUpperCase(),
      path,
      servers: operation.servers ?? document.servers ?? [],
      security: operation.security ?? document.security ?? [],
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags,
      operationId: operation.operationId,
      parameters: operation.parameters ?? [],
      requestBody: operation.requestBody,
      responses: operation.responses ?? {},
    };
  }

  async getSchema(name: string, dereference = false) {
    const document = dereference ? await this.loader.loadDereferenced() : await this.loader.load();
    const schema = getSchemaByName(document, name);

    if (!schema) {
      throw new Error(`Schema not found: ${name}`);
    }

    return schema;
  }

  async searchSchema(query: string): Promise<Array<{ name: string; schema: unknown }>> {
    return searchSchemas(await this.loader.load(), query);
  }

  async explainEndpoint(method: string, path: string) {
    const endpoint = await this.getEndpoint(method, path, true);

    return {
      endpoint: `${endpoint.method} ${endpoint.path}`,
      authentication: summarizeSecurity(endpoint.security),
      request: {
        parameters: endpoint.parameters,
        body: endpoint.requestBody,
      },
      response: endpoint.responses,
      errors: extractErrorResponses(endpoint.responses),
      example: generateExampleFromRequestBody(endpoint.requestBody),
    };
  }

  async generateExample(method: string, path: string) {
    const endpoint = await this.getEndpoint(method, path, true);
    return generateExampleFromRequestBody(endpoint.requestBody);
  }

  async validateRequest(method: string, path: string, data: unknown) {
    const endpoint = await this.getEndpoint(method, path, true);
    return validateRequestBody(endpoint.requestBody, data);
  }

  async getAuth() {
    const document = await this.loader.load();
    return {
      security: document.security ?? [],
      securitySchemes: document.components?.securitySchemes ?? {},
    };
  }

  async getInfoResource() {
    const document = await this.loader.load();
    return {
      info: document.info ?? {},
      openapi: document.openapi ?? document.swagger,
      servers: document.servers ?? [],
    };
  }

  async getComponentsResource() {
    const document = await this.loader.load();
    return document.components ?? {};
  }

  async getServersResource() {
    const document = await this.loader.load();
    return document.servers ?? [];
  }
}
