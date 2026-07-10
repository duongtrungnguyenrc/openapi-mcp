import type { EndpointSummary } from "./openapi/types.js";
import { findEndpoints, getOperation, listEndpoints } from "./openapi/endpoints.js";
import { OpenApiLoader } from "./openapi/loader.js";
import { getSchema as getSchemaByName, searchSchemas } from "./openapi/schemas.js";
import { validateRequestBody } from "./openapi/validation.js";
import { flattenRequestBody, flattenResponses } from "./openapi/response-formatter.js";

export class OpenApiProvider {
  private readonly loader: OpenApiLoader;
  private endpoints?: EndpointSummary[];

  constructor(sourcePath: string) {
    this.loader = new OpenApiLoader(sourcePath);
  }

  async summarize() {
    const document = await this.loader.load();
    const { endpoints } = await this.listEndpoints();

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

  async listEndpoints(): Promise<{ endpoints: EndpointSummary[] }> {
    this.endpoints ??= listEndpoints(await this.loader.load());

    return {
      endpoints: this.endpoints,
    };
  }

  async findEndpoint(query: string): Promise<{ endpoints: EndpointSummary[] }> {
    return { endpoints: findEndpoints((await this.listEndpoints()).endpoints, query) };
  }

  async getEndpoint(method: string, path: string) {
    const document = await this.loadDereferenced();
    const operation = getOperation(document, method, path);

    if (!operation) {
      throw new Error(`Endpoint not found: ${method.toUpperCase()} ${path}`);
    }

    return {
      method: method.toUpperCase(),
      path,
      summary: operation.summary,
      description: operation.description,
      operationId: operation.operationId,
      tags: operation.tags,
      servers: operation.servers ?? document.servers ?? [],
      security: operation.security ?? document.security ?? [],
      parameters: operation.parameters ?? [],
      requestBody: flattenRequestBody(operation.requestBody),
      responses: flattenResponses(operation.responses),
    };
  }

  async getSchema(name: string) {
    const document = await this.loadDereferenced();
    const schema = getSchemaByName(document, name);

    if (!schema) {
      throw new Error(`Schema not found: ${name}`);
    }

    return schema;
  }

  async searchSchema(query: string): Promise<Array<{ name: string; schema: unknown }>> {
    return searchSchemas(await this.loader.load(), query);
  }

  async validateRequest(
    method: string,
    path: string,
    data: unknown,
  ): Promise<Record<string, unknown>> {
    const document = await this.loadDereferenced();
    const operation = getOperation(document, method, path);

    if (!operation) {
      throw new Error(`Endpoint not found: ${method.toUpperCase()} ${path}`);
    }

    return validateRequestBody(operation.requestBody, data) as Record<string, unknown>;
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

  private async loadDereferenced() {
    try {
      return await this.loader.loadDereferenced();
    } catch {
      return this.loader.load();
    }
  }
}
