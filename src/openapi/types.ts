export type AnyRecord = Record<string, unknown>;

export type OpenApiDocument = {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{ url?: string; description?: string }>;
  paths?: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
    [key: string]: unknown;
  };
  security?: unknown[];
};

export type EndpointSummary = {
  method: string;
  path: string;
  operationId?: unknown;
  summary?: unknown;
  description?: unknown;
  tags?: unknown;
};

export type EndpointDetail = EndpointSummary & {
  servers: unknown;
  security: unknown;
  parameters: unknown;
  requestBody: unknown;
  responses: unknown;
};

export type SearchResult<T> = {
  item: T;
  score: number;
};
