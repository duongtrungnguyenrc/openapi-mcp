import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenApiDocument } from "./types.js";

const parserOptions = {
  dereference: {
    circular: "ignore" as const,
  },
};

export class OpenApiLoader {
  private readonly sourcePath: string;
  private document?: OpenApiDocument;
  private dereferencedDocument?: OpenApiDocument;

  constructor(sourcePath: string) {
    this.sourcePath = normalizeSource(sourcePath);
  }

  async load(): Promise<OpenApiDocument> {
    if (!this.document) {
      const api = await SwaggerParser.validate(this.sourcePath, parserOptions);
      this.document = api as OpenApiDocument;
    }

    return this.document;
  }

  async loadDereferenced(): Promise<OpenApiDocument> {
    if (!this.dereferencedDocument) {
      const parser = new SwaggerParser();
      const api = await parser.dereference(this.sourcePath, parserOptions);
      this.dereferencedDocument = api as OpenApiDocument;
    }

    return this.dereferencedDocument;
  }
}

function normalizeSource(source: string) {
  return /^https?:\/\//i.test(source)
    ? source
    : new URL(source, `file://${process.cwd()}/`).pathname;
}
