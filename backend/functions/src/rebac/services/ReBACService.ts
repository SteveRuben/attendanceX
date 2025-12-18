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

export interface ExpandOptions extends AuditContext {
  tenantId: string;
  limit?: number;
  cursor?: string;
}

export interface ExpandResult {
  items: ParsedEntity[];
  nextCursor?: string;
}

interface ParsedEntity {
  type: string;
  id: string;
}

interface ResolveParams {
  tenantId: string;
  subject: ParsedEntity;
  permission: string;
  object: ParsedEntity;
  depth: number;
  memo: Map<string, boolean>;
  visiting: Set<string>;
}

export class ReBACService {
  private static readonly MAX_DEPTH = 10;

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
    const allowed = await this.resolve({
      tenantId: context.tenantId,
      subject,
      permission,
      object,
      depth: 0,
      memo: new Map(),
      visiting: new Set(),
    });

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

  async expand(
    subjectRef: string,
    permission: string,
    objectType: string,
    options: ExpandOptions
  ): Promise<ExpandResult> {
    if (!options?.tenantId) {
      throw new Error("tenantId is required to expand permissions");
    }

    const subject = this.parseEntity(subjectRef);
    const memo = new Map<string, Map<string, ParsedEntity>>();
    const objects = await this.collectAccessibleObjects({
      tenantId: options.tenantId,
      subject,
      permission,
      objectType,
      memo,
      visiting: new Set(),
    });

    const sorted = Array.from(objects.values()).sort((a, b) =>
      this.compareEntities(a, b)
    );

    const limit = options.limit ?? 50;
    const startIndex = this.decodeCursor(options.cursor);
    const items = sorted.slice(startIndex, startIndex + limit);
    const nextIndex = startIndex + items.length;
    const nextCursor =
      nextIndex < sorted.length ? this.encodeCursor(nextIndex) : undefined;

    await this.logAudit({
      tenantId: options.tenantId,
      action: "rebac_expand",
      resource: objectType,
      resourceId: "*",
      outcome: "success",
      severity: "low",
      context: options,
      details: {
        permission,
        subject,
        count: items.length,
        total: sorted.length,
        objectType,
      },
    });

    return {
      items,
      nextCursor,
    };
  }

  private parseEntity(reference: string): ParsedEntity {
    const [type, id] = reference.split(":");
    if (!type || !id) {
      throw new Error(`Invalid entity reference: ${reference}`);
    }

    return { type, id };
  }

  private async resolve(params: ResolveParams): Promise<boolean> {
    const { tenantId, subject, permission, object, depth, memo, visiting } =
      params;

    if (depth >= ReBACService.MAX_DEPTH) {
      return false;
    }

    const key = `${tenantId}|${subject.type}:${subject.id}|${permission}|${object.type}:${object.id}`;
    if (memo.has(key)) {
      return memo.get(key)!;
    }
    if (visiting.has(key)) {
      return false;
    }
    visiting.add(key);

    let result = false;
    try {
      const schema = this.schemaRegistry.getSchema(object.type);
      const grantingRelations = schema.permissions[permission]?.grantedBy ?? [];

      for (const relation of grantingRelations) {
        const directTuple = await this.tupleStore.findExact({
          tenantId,
          relation,
          subject: this.toTupleSubject(subject),
          object: this.toTupleObject(object),
        });

        if (directTuple) {
          result = true;
          break;
        }

        const relationDef = schema.relations[relation];
        const computed = relationDef?.computedUserset;
        if (!computed) {
          continue;
        }

        const parentTuples = await this.tupleStore.find({
          tenantId,
          relation: computed.relation,
          subject: {
            type: object.type,
            id: object.id,
          } as RelationTuple["subject"],
        });

        for (const parentTuple of parentTuples) {
          if (
            computed.namespace &&
            parentTuple.object?.type !== computed.namespace
          ) {
            continue;
          }

          if (!parentTuple.object) {
            continue;
          }

          const parentObject: ParsedEntity = {
            type: parentTuple.object.type,
            id: parentTuple.object.id,
          };

          const allowedThroughParent = await this.resolve({
            tenantId,
            subject,
            permission,
            object: parentObject,
            depth: depth + 1,
            memo,
            visiting,
          });

          if (allowedThroughParent) {
            result = true;
            break;
          }
        }

        if (result) {
          break;
        }
      }
    } finally {
      visiting.delete(key);
    }

    memo.set(key, result);
    return result;
  }

  private toTupleSubject(entity: ParsedEntity): RelationTuple["subject"] {
    return {
      type: entity.type as RelationTuple["subject"]["type"],
      id: entity.id,
    };
  }

  private toTupleObject(entity: ParsedEntity): RelationTuple["object"] {
    return {
      type: entity.type,
      id: entity.id,
    };
  }

  private parseTupleSubject(
    subject: RelationTuple["subject"]
  ): ParsedEntity | null {
    if (!subject?.type || !subject.id) {
      return null;
    }
    return {
      type: subject.type as string,
      id: subject.id,
    };
  }

  private compareEntities(a: ParsedEntity, b: ParsedEntity): number {
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type);
    }
    return a.id.localeCompare(b.id);
  }

  private encodeCursor(index: number): string {
    const payload = JSON.stringify({ index });
    return Buffer.from(payload).toString("base64");
  }

  private decodeCursor(cursor?: string): number {
    if (!cursor) {
      return 0;
    }
    try {
      const decoded = Buffer.from(cursor, "base64").toString("utf8");
      const payload = JSON.parse(decoded);
      return typeof payload.index === "number" && payload.index >= 0
        ? payload.index
        : 0;
    } catch {
      return 0;
    }
  }

  private async collectAccessibleObjects(params: {
    tenantId: string;
    subject: ParsedEntity;
    permission: string;
    objectType: string;
    memo: Map<string, Map<string, ParsedEntity>>;
    visiting: Set<string>;
  }): Promise<Map<string, ParsedEntity>> {
    const { tenantId, subject, permission, objectType, memo, visiting } =
      params;
    const key = `${tenantId}|${subject.type}:${subject.id}|${permission}|${objectType}`;

    if (memo.has(key)) {
      return memo.get(key)!;
    }

    if (visiting.has(key)) {
      return new Map();
    }

    visiting.add(key);
    const results = new Map<string, ParsedEntity>();

    try {
      const schema = this.schemaRegistry.getSchema(objectType);
      const grantingRelations = schema.permissions[permission]?.grantedBy ?? [];

      if (grantingRelations.length === 0) {
        memo.set(key, results);
        return results;
      }

      for (const relation of grantingRelations) {
        const tuples = await this.tupleStore.find({
          tenantId,
          relation,
          subject: this.toTupleSubject(subject),
        });

        for (const tuple of tuples) {
          if (!tuple.object || tuple.object.type !== objectType) {
            continue;
          }
          const entity = {
            type: tuple.object.type,
            id: tuple.object.id,
          };
          results.set(`${entity.type}:${entity.id}`, entity);
        }

        const relationDef = schema.relations[relation];
        const computed = relationDef?.computedUserset;
        if (!computed) {
          continue;
        }

        const parents = await this.collectAccessibleObjects({
          tenantId,
          subject,
          permission,
          objectType: computed.namespace,
          memo,
          visiting,
        });

        for (const parent of parents.values()) {
          const childTuples = await this.tupleStore.find({
            tenantId,
            relation: computed.relation,
            object: this.toTupleObject(parent),
          });

          for (const childTuple of childTuples) {
            const child = this.parseTupleSubject(childTuple.subject);
            if (!child || child.type !== objectType) {
              continue;
            }
            results.set(`${child.type}:${child.id}`, child);
          }
        }
      }
    } finally {
      visiting.delete(key);
    }

    memo.set(key, results);
    return results;
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
