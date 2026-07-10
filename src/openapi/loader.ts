import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPI } from "openapi-types";
import type { OpenApiDocument } from "./types.js";

type ParserSource = string | OpenAPI.Document;

const parserOptions = {
  dereference: {
    circular: "ignore" as const,
  },
};

export class OpenApiLoader {
  private readonly sourcePath: string;
  private readonly isRemoteSource: boolean;
  private document?: OpenApiDocument;
  private dereferencedDocument?: OpenApiDocument;

  constructor(sourcePath: string) {
    this.sourcePath = normalizeSource(sourcePath);
    this.isRemoteSource = isHttpUrl(this.sourcePath);
  }

  async load(): Promise<OpenApiDocument> {
    if (!this.document) {
      const api = await SwaggerParser.parse(await this.getParserSource());
      this.document = api as OpenApiDocument;
    }

    return this.document;
  }

  async loadDereferenced(): Promise<OpenApiDocument> {
    if (!this.dereferencedDocument) {
      const parser = new SwaggerParser();
      const api = await parser.dereference(await this.getParserSource(), parserOptions);
      this.dereferencedDocument = api as OpenApiDocument;
    }

    return this.dereferencedDocument;
  }

  private async getParserSource(): Promise<ParserSource> {
    return this.isRemoteSource ? await fetchJson(this.sourcePath) : this.sourcePath;
  }
}

function normalizeSource(source: string) {
  return isHttpUrl(source) ? source : new URL(source, `file://${process.cwd()}/`).pathname;
}

function isHttpUrl(source: string) {
  return /^https?:\/\//i.test(source);
}

async function fetchJson(source: string): Promise<OpenAPI.Document> {
  const response = await fetch(source);

  if (!response.ok) {
    throw new Error(
      `Failed to load OpenAPI spec from ${source}: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as OpenAPI.Document;
}
