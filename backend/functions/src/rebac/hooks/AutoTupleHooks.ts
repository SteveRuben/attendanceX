import { Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { AuditContext } from "../services/ReBACService";
import { getReBACService } from "../services/ReBACServiceFactory";
import { RelationTuple } from "../types/RelationTuple.types";

/**
 * Hooks centralisant la création automatique de tuples ReBAC.
 * Tests de référence : tests/backend/reBAC/AutoTupleHooks.test.ts
 */

interface BaseHookParams {
  tenantId?: string;
  actor?: AuditContext;
  metadata?: Record<string, any>;
  source?: RelationTuple["source"];
}

interface OrganizationHookParams extends BaseHookParams {
  userId?: string;
  relation?: string;
}

interface MembershipHookParams extends BaseHookParams {
  userId?: string;
  role?: string;
}

interface EventHookParams extends BaseHookParams {
  eventId?: string;
  creatorId?: string;
}

interface ProjectAssignmentHookParams extends BaseHookParams {
  projectId?: string;
  employeeId?: string;
}

const DEFAULT_SOURCE: RelationTuple["source"] = "system";

/**
 * Crée un tuple owner:user -> organization. Test: AutoTupleHooks.test.ts
 */
export async function autoCreateOrganizationOwnerTuple(
  params: OrganizationHookParams
): Promise<boolean> {
  return createTuple({
    tenantId: params.tenantId,
    relation: "owner",
    subjectId: params.userId,
    object: { type: "organization", id: params.tenantId },
    actor: params.actor,
    metadata: {
      hook: "organization_owner",
      ...params.metadata,
    },
    source: params.source,
  });
}

/**
 * Crée un tuple member:user -> organization (tenant invitation). Test: AutoTupleHooks.test.ts
 */
export async function autoCreateOrganizationMemberTuple(
  params: MembershipHookParams
): Promise<boolean> {
  return createTuple({
    tenantId: params.tenantId,
    relation: "member",
    subjectId: params.userId,
    object: { type: "organization", id: params.tenantId },
    actor: params.actor,
    metadata: {
      hook: "organization_member",
      role: params.role,
      ...params.metadata,
    },
    source: params.source,
  });
}

/**
 * Crée un tuple creator:user -> event (résout les droits du créateur). Test: AutoTupleHooks.test.ts
 */
export async function autoCreateEventCreatorTuple(
  params: EventHookParams
): Promise<boolean> {
  return createTuple({
    tenantId: params.tenantId,
    relation: "creator",
    subjectId: params.creatorId,
    object: { type: "event", id: params.eventId },
    actor: params.actor,
    metadata: {
      hook: "event_creator",
      ...params.metadata,
    },
    source: params.source,
  });
}

/**
 * Crée un tuple assigned_to:user -> project lorsque l’on assigne un salarié. Test: AutoTupleHooks.test.ts
 */
export async function autoCreateProjectAssignmentTuple(
  params: ProjectAssignmentHookParams
): Promise<boolean> {
  return createTuple({
    tenantId: params.tenantId,
    relation: "assigned_to",
    subjectId: params.employeeId,
    object: { type: "project", id: params.projectId },
    actor: params.actor,
    metadata: {
      hook: "project_assignment",
      ...params.metadata,
    },
    source: params.source,
  });
}

async function createTuple(params: {
  tenantId?: string;
  subjectId?: string;
  relation: string;
  object: RelationTuple["object"];
  actor?: AuditContext;
  metadata?: Record<string, any>;
  source?: RelationTuple["source"];
}): Promise<boolean> {
  const { tenantId, subjectId, relation, object, actor, metadata, source } = params;

  if (!tenantId || !subjectId || !object?.id) {
    return false;
  }

  const tuple: RelationTuple = {
    id: randomUUID(),
    tenantId,
    subject: {
      type: "user",
      id: subjectId,
    },
    relation,
    object,
    createdAt: Timestamp.now(),
    createdBy: actor?.userId,
    source: source ?? DEFAULT_SOURCE,
    metadata,
  };

  try {
    await getReBACService().write(tuple, actor);
    return true;
  } catch (error) {
    console.error(
      `[ReBAC][AutoTupleHooks] Failed to create tuple (${relation}) for tenant ${tenantId}`,
      error
    );
    return false;
  }
}
/**
 * Crée un tuple pour n'importe quelle relation organisationnelle (admin/manager/viewer). Test: AutoTupleHooks.test.ts
 */
export async function autoCreateOrganizationRelationTuple(
  params: OrganizationHookParams & { relation: string }
): Promise<boolean> {
  return createTuple({
    tenantId: params.tenantId,
    relation: params.relation,
    subjectId: params.userId,
    object: { type: "organization", id: params.tenantId },
    actor: params.actor,
    metadata: {
      hook: `organization_${params.relation}`,
      ...params.metadata,
    },
    source: params.source,
  });
}
