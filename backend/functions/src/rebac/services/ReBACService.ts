import { TupleStore } from "./TupleStore";
import { SchemaRegistry } from "./SchemaRegistry";
import { SchemaValidator } from "./validation/SchemaValidator";
import { RelationTuple } from "../types/RelationTuple.types";
import {
  auditService,
  AuditService,
  AuditEntry,
} from "../../services/system/audit.service";

type TupleStoreLike = Pick<
  TupleStore,
  "create" | "find" | "findExact" | "delete"
>;

type AuditLogger = Pick<AuditService, "logAuditEntry">;

export interface AuditContext {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
}

export interface CheckContext extends AuditContext {
  tenantId: string;
}

interface ParsedEntity {
  type: string;
  id: string;
}

export class ReBACService {
  constructor(
    private readonly tupleStore: TupleStoreLike,
    private readonly schemaRegistry: SchemaRegistry,
    private readonly validator: SchemaValidator = new SchemaValidator(
      schemaRegistry
    ),
    private readonly auditLogger: AuditLogger = auditService
  ) {}

  async check(
    subjectRef: string,
    permission: string,
    objectRef: string,
    context: CheckContext
  ): Promise<boolean> {
    if (!context?.tenantId) {
      throw new Error("tenantId is required to evaluate permissions");
    }

    const subject = this.parseEntity(subjectRef);
    const object = this.parseEntity(objectRef);
    const schema = this.schemaRegistry.getSchema(object.type);
    const grantingRelations = schema.permissions[permission]?.grantedBy ?? [];

    let allowed = false;

    if (grantingRelations.length > 0) {
      for (const relation of grantingRelations) {
        const match = await this.tupleStore.findExact({
          tenantId: context.tenantId,
          relation,
          subject: {
            type: subject.type as RelationTuple["subject"]["type"],
            id: subject.id,
          },
          object: {
            type: object.type,
            id: object.id,
          },
        });

        if (match) {
          allowed = true;
          break;
        }
      }
    }

    await this.logAudit({
      tenantId: context.tenantId,
      action: "rebac_check",
      resource: object.type,
      resourceId: object.id,
      outcome: allowed ? "success" : "failure",
      severity: "low",
      context,
      details: {
        permission,
        subject,
        grantingRelations,
        allowed,
      },
    });

    return allowed;
  }

  async write(tuple: RelationTuple, actor?: AuditContext): Promise<void> {
    await this.validator.validateTuple(tuple);

    const existing = await this.tupleStore.findExact({
      tenantId: tuple.tenantId,
      relation: tuple.relation,
      subject: tuple.subject,
      object: tuple.object,
    });

    if (existing) {
      await this.logAudit({
        tenantId: tuple.tenantId,
        action: "rebac_write",
        resource: tuple.object.type,
        resourceId: tuple.object.id,
        outcome: "warning",
        severity: "low",
        context: actor,
        details: {
          relation: tuple.relation,
          subject: tuple.subject,
          reason: "duplicate_tuple",
        },
      });
      return;
    }

    await this.tupleStore.create(tuple);

    await this.logAudit({
      tenantId: tuple.tenantId,
      action: "rebac_write",
      resource: tuple.object.type,
      resourceId: tuple.object.id,
      outcome: "success",
      severity: "medium",
      context: actor,
      details: {
        relation: tuple.relation,
        subject: tuple.subject,
      },
    });
  }

  async delete(filter: Partial<RelationTuple>, actor?: AuditContext): Promise<void> {
    const tuples = await this.tupleStore.find(filter);

    if (tuples.length === 0) {
      if (filter.tenantId) {
        await this.logAudit({
          tenantId: filter.tenantId,
          action: "rebac_delete",
          resource: filter.object?.type ?? "rebac_tuple",
          resourceId: filter.object?.id ?? "unknown",
          outcome: "warning",
          severity: "low",
          context: actor,
          details: {
            filter,
            reason: "no_tuples_found",
          },
        });
      }
      return;
    }

    for (const tuple of tuples) {
      await this.tupleStore.delete(tuple.id);
      await this.logAudit({
        tenantId: tuple.tenantId,
        action: "rebac_delete",
        resource: tuple.object.type,
        resourceId: tuple.object.id,
        outcome: "success",
        severity: "medium",
        context: actor,
        details: {
          relation: tuple.relation,
          subject: tuple.subject,
          tupleId: tuple.id,
        },
      });
    }
  }

  private parseEntity(reference: string): ParsedEntity {
    const [type, id] = reference.split(":");
    if (!type || !id) {
      throw new Error(`Invalid entity reference: ${reference}`);
    }

    return { type, id };
  }

  private async logAudit(params: {
    tenantId: string;
    action: string;
    resource: string;
    resourceId: string;
    outcome: AuditEntry["outcome"];
    severity: AuditEntry["severity"];
    details: Record<string, any>;
    context?: AuditContext;
  }): Promise<void> {
    try {
      await this.auditLogger.logAuditEntry({
        organizationId: params.tenantId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        outcome: params.outcome,
        severity: params.severity,
        category: "system",
        details: params.details,
        userId: params.context?.userId ?? "system",
        userEmail: params.context?.userEmail ?? "",
        ipAddress: params.context?.ipAddress,
        userAgent: params.context?.userAgent,
        sessionId: params.context?.sessionId,
        metadata: {
          source: "rebac_service",
          version: "1.0",
          correlationId: params.context?.correlationId,
        },
      });
    } catch (error) {
      console.error("Failed to log ReBAC audit entry", error);
    }
  }
}
