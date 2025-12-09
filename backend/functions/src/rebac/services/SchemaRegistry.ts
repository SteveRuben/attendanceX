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


const schemas = [OrganizationSchema, ClientSchema, EventSchema, CampaignSchema, DocumentSchema, InvoiceSchema, ProjectSchema, ReportSchema, TimesheetSchema]

export class SchemaRegistry {
  private schemas: Map<string, NamespaceSchema> = new Map();
  
  constructor() {
    this.registerMany(schemas);
  }

  registerMany(schemas: NamespaceSchema[]) {
    schemas.forEach(schema => this.register(schema));
  }

   register(schema: NamespaceSchema) {
        this.schemas.set(schema.name, schema);
    }
  
  getSchema(namespace: string): NamespaceSchema {
    const schema = this.schemas.get(namespace);
    // if (!schema) {
    //   throw new Error(`Schema not found for namespace: ${namespace}`);
    // }
    return schema;
  }
}
