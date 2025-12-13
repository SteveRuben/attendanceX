import { NamespaceSchema } from "rebac/types/NamespaceSchema.types";
import { OrganizationSchema } from "rebac/schemas/organization.schema";
import { ClientSchema } from "rebac/schemas/client.schema";
import { EventSchema } from "rebac/schemas/event.schema";
import { CampaignSchema } from "rebac/schemas/campaign.schema";
import { DocumentSchema } from "rebac/schemas/document.schema";
import { InvoiceSchema } from "rebac/schemas/invoice.schema";
import { ProjectSchema } from "rebac/schemas/project.schema";
import { ReportSchema } from "rebac/schemas/report.schema";
import { TimesheetSchema } from "rebac/schemas/timesheet.schema";

const DEFAULT_SCHEMAS: NamespaceSchema[] = [
  OrganizationSchema,
  ClientSchema,
  EventSchema,
  CampaignSchema,
  DocumentSchema,
  InvoiceSchema,
  ProjectSchema,
  ReportSchema,
  TimesheetSchema,
];

export class SchemaRegistry {
  private schemas: Map<string, NamespaceSchema> = new Map();

  constructor(initialSchemas: NamespaceSchema[] = DEFAULT_SCHEMAS) {
    this.registerMany(initialSchemas);
  }

  registerMany(schemas: NamespaceSchema[]): void {
    schemas.forEach((schema) => this.register(schema));
  }

  register(schema: NamespaceSchema): void {
    if (!schema?.name) {
      throw new Error("Cannot register schema without a namespace name");
    }

    this.schemas.set(schema.name, schema);
  }

  hasSchema(namespace: string): boolean {
    return this.schemas.has(namespace);
  }

  listNamespaces(): string[] {
    return Array.from(this.schemas.keys());
  }

  getSchema(namespace: string): NamespaceSchema {
    const schema = this.schemas.get(namespace);
    if (!schema) {
      throw new Error(`Schema not found for namespace: ${namespace}`);
    }

    return schema;
  }
}
