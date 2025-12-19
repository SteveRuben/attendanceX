import { TupleStore } from "./TupleStore";
import { SchemaRegistry } from "./SchemaRegistry";
import { SchemaValidator } from "./validation/SchemaValidator";
import { RelationTuple } from "../types/RelationTuple.types";
import {
  auditService,
  AuditService,
  AuditEntry,
} from "../../services/system/audit.service";
import { ReBACCache, ReBACCacheAdapter } from "./ReBACCache";

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

/**
 * Service principal ReBAC : résolutions de permissions,
 * gestion des tuples et couche de cache multi-niveaux.
 */
export class ReBACService {
  private static readonly MAX_DEPTH = 10;

  constructor(
    private readonly tupleStore: TupleStoreLike,
    private readonly schemaRegistry: SchemaRegistry,
    private readonly validator: SchemaValidator = new SchemaValidator(
      schemaRegistry
    ),
    private readonly auditLogger: AuditLogger = auditService,
    private readonly cache: ReBACCacheAdapter = new ReBACCache()
  ) {}

  /**
   * Vérifie si un subject possède une permission sur un objet précis.
   * Utilise le cache (check) avant de lancer la résolution récursive.
   */
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
    const cacheContext = {
      tenantId: context.tenantId,
      subject,
      permission,
      object,
    };
    const cached = await this.cache?.getCheckResult(cacheContext);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
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

  /**
   * Crée un tuple relationnel après validation et nettoie les caches.
   */
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
    await this.cache?.invalidateForTuple(tuple);

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

  /**
   * Supprime tous les tuples correspondant au filtre puis invalide les caches.
   */
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
      await this.cache?.invalidateForTuple(tuple);
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

  /**
   * Retourne la liste paginée des objets accessibles pour un subject/permission.
   * Résultats mis en cache (L1/L2) et invalidés automatiquement sur mutation.
   */
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
    const cacheContext = {
      tenantId: options.tenantId,
      subject,
      permission,
      objectType,
    };
    let sorted =
      (await this.cache?.getExpandResult(cacheContext)) ?? undefined;

    if (!sorted) {
      const memo = new Map<string, Map<string, ParsedEntity>>();
      const objects = await this.collectAccessibleObjects({
        tenantId: options.tenantId,
        subject,
        permission,
        objectType,
        memo,
        visiting: new Set(),
      });
      sorted = Array.from(objects.values()).sort((a, b) =>
        this.compareEntities(a, b)
      );
      await this.cache?.setExpandResult(cacheContext, sorted);
    }

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

  /**
   * Convertit une référence "type:id" en structure ParsedEntity.
   */
  private parseEntity(reference: string): ParsedEntity {
    const [type, id] = reference.split(":");
    if (!type || !id) {
      throw new Error(`Invalid entity reference: ${reference}`);
    }

    return { type, id };
  }

  /**
   * Résolution récursive permission -> relations -> computedUserset.
   * Utilise un mémo et un jeu "visiting" pour éviter les boucles.
   */
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

  /**
   * Transforme un ParsedEntity en structure relationnelle côté subject.
   */
  private toTupleSubject(entity: ParsedEntity): RelationTuple["subject"] {
    return {
      type: entity.type as RelationTuple["subject"]["type"],
      id: entity.id,
    };
  }

  /**
   * Transforme un ParsedEntity en structure relationnelle côté object.
   */
  private toTupleObject(entity: ParsedEntity): RelationTuple["object"] {
    return {
      type: entity.type,
      id: entity.id,
    };
  }

  /**
   * Parse un subject issu d'un tuple Firestore en ParsedEntity.
   */
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

  /**
   * Ordonne les entités (type puis id) pour garantir une pagination stable.
   */
  private compareEntities(a: ParsedEntity, b: ParsedEntity): number {
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type);
    }
    return a.id.localeCompare(b.id);
  }

  /**
   * Sérialise un index de pagination en curseur base64.
   */
  private encodeCursor(index: number): string {
    const payload = JSON.stringify({ index });
    return Buffer.from(payload).toString("base64");
  }

  /**
   * Reconstitue l'index de pagination à partir du curseur fourni.
   */
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

  /**
   * Explore récursivement les namespaces via computedUserset pour construire
   * la liste complète des objets accessibles par un subject donné.
   */
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

  /**
   * Centralise l'écriture des entrées d'audit ReBAC.
   * Tente de ne jamais faire échouer l'appel business en cas d'erreur.
   */
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
