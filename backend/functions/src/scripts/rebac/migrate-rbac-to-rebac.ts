import "dotenv/config";
import { initializeFirebase } from "../../config/firebase-init";
import { collections } from "../../config/database";
import {
  TenantMembership,
  TenantRole,
  Project,
  Event,
} from "../../common/types";
import {
  autoCreateEventCreatorTuple,
  autoCreateOrganizationMemberTuple,
  autoCreateOrganizationOwnerTuple,
  autoCreateOrganizationRelationTuple,
  autoCreateProjectAssignmentTuple,
} from "../../rebac/hooks/AutoTupleHooks";
import { AuditContext } from "../../rebac/services/ReBACService";

export const MIGRATION_TAG = "rbac_to_rebac_v1";
const DEFAULT_SYSTEM_ACTOR: AuditContext = {
  userId: "rbac_migration_script",
  userEmail: "system@attendance-x",
};

export interface MigrationOptions {
  dryRun?: boolean;
  migrationId?: string;
  batchSize?: number;
  rollbackId?: string;
}

export interface MigrationStats {
  migrationId: string;
  dryRun: boolean;
  startTime: string;
  endTime?: string;
  tenantMembershipsProcessed: number;
  tenantMembershipTuplesCreated: number;
  eventCreatorTuplesCreated: number;
  projectAssignmentTuplesCreated: number;
  tuplesSkipped: number;
  tuplesWritten?: number;
}

const ROLE_RELATION_MAP: Record<TenantRole, string> = {
  [TenantRole.OWNER]: "owner",
  [TenantRole.ADMIN]: "admin",
  [TenantRole.MANAGER]: "manager",
  [TenantRole.MEMBER]: "member",
  [TenantRole.VIEWER]: "viewer",
};

export function mapTenantRoleToRelation(role: TenantRole): string {
  return ROLE_RELATION_MAP[role] || "member";
}

export function buildMigrationMetadata(
  migrationId: string,
  entity: string,
  extra: Record<string, any> = {}
): Record<string, any> {
  return {
    migrationTag: MIGRATION_TAG,
    migrationId,
    entity,
    ...extra,
  };
}

export async function migrateRBACToReBAC(
  options: MigrationOptions = {}
): Promise<MigrationStats> {
  initializeFirebase();

  const migrationId =
    options.migrationId ?? `${MIGRATION_TAG}_${Date.now().toString(36)}`;
  const stats: MigrationStats = {
    migrationId,
    dryRun: Boolean(options.dryRun),
    startTime: new Date().toISOString(),
    tenantMembershipsProcessed: 0,
    tenantMembershipTuplesCreated: 0,
    eventCreatorTuplesCreated: 0,
    projectAssignmentTuplesCreated: 0,
    tuplesSkipped: 0,
  };

  if (options.rollbackId) {
    const deleted = await rollbackMigration(options.rollbackId);
    stats.endTime = new Date().toISOString();
    stats.tuplesWritten = -deleted;
    console.log(
      `Rollback complete for migrationId=${options.rollbackId}. Deleted ${deleted} tuples.`
    );
    return stats;
  }

  console.log(
    `Starting RBAC -> ReBAC migration (dryRun=${stats.dryRun}, migrationId=${migrationId})`
  );

  await migrateTenantMemberships(stats, options);
  await migrateEventCreators(stats, options);
  await migrateProjectAssignments(stats, options);

  if (!stats.dryRun) {
    stats.tuplesWritten = await verifyMigrationOutput(migrationId);
  }

  stats.endTime = new Date().toISOString();
  console.log("Migration completed:", stats);
  return stats;
}

async function migrateTenantMemberships(
  stats: MigrationStats,
  options: MigrationOptions
) {
  const snapshot = await collections.tenant_memberships.get();
  for (const doc of snapshot.docs) {
    const membership = doc.data() as TenantMembership;
    stats.tenantMembershipsProcessed += 1;
    const relation = mapTenantRoleToRelation(membership.role);

    if (!membership.tenantId || !membership.userId) {
      stats.tuplesSkipped += 1;
      continue;
    }

    if (options.dryRun) {
      stats.tenantMembershipTuplesCreated += 1;
      continue;
    }

    const commonParams = {
      tenantId: membership.tenantId,
      userId: membership.userId,
      actor: DEFAULT_SYSTEM_ACTOR,
      metadata: buildMigrationMetadata(stats.migrationId, "tenant_membership", {
        membershipId: doc.id,
        role: membership.role,
      }),
    };

    const result =
      relation === "owner"
        ? await autoCreateOrganizationOwnerTuple(commonParams)
        : relation === "member"
        ? await autoCreateOrganizationMemberTuple({
            ...commonParams,
            role: membership.role,
          })
        : await autoCreateOrganizationRelationTuple({
            ...commonParams,
            relation,
          });

    if (result) {
      stats.tenantMembershipTuplesCreated += 1;
    }
  }
}

async function migrateEventCreators(
  stats: MigrationStats,
  options: MigrationOptions
) {
  const snapshot = await collections.events.get();
  for (const doc of snapshot.docs) {
    const event = doc.data() as Event;
    if (!event.organizerId) {
      stats.tuplesSkipped += 1;
      continue;
    }

    const tenantId = (event as any).tenantId || event.organizationId;
    if (!tenantId) {
      stats.tuplesSkipped += 1;
      continue;
    }

    if (options.dryRun) {
      stats.eventCreatorTuplesCreated += 1;
      continue;
    }

    const created = await autoCreateEventCreatorTuple({
      tenantId,
      eventId: doc.id,
      creatorId: event.organizerId,
      actor: DEFAULT_SYSTEM_ACTOR,
      metadata: buildMigrationMetadata(stats.migrationId, "event_creator", {
        eventId: doc.id,
      }),
    });

    if (created) {
      stats.eventCreatorTuplesCreated += 1;
    }
  }
}

async function migrateProjectAssignments(
  stats: MigrationStats,
  options: MigrationOptions
) {
  const snapshot = await collections.projects.get();
  for (const doc of snapshot.docs) {
    const project = doc.data() as Project;
    const tenantId = project.tenantId;
    if (!tenantId || !Array.isArray(project.assignedEmployees)) {
      continue;
    }

    for (const employeeId of project.assignedEmployees) {
      if (!employeeId) {
        continue;
      }

      if (options.dryRun) {
        stats.projectAssignmentTuplesCreated += 1;
        continue;
      }

      const created = await autoCreateProjectAssignmentTuple({
        tenantId,
        projectId: doc.id,
        employeeId,
        actor: DEFAULT_SYSTEM_ACTOR,
        metadata: buildMigrationMetadata(
          stats.migrationId,
          "project_assignment",
          {
            projectId: doc.id,
            employeeId,
          }
        ),
      });

      if (created) {
        stats.projectAssignmentTuplesCreated += 1;
      }
    }
  }
}

async function verifyMigrationOutput(migrationId: string): Promise<number> {
  const snapshot = await collections.rebac_tuples
    .where("metadata.migrationId", "==", migrationId)
    .get();
  return snapshot.size;
}

export async function rollbackMigration(
  migrationId: string
): Promise<number> {
  initializeFirebase();
  const snapshot = await collections.rebac_tuples
    .where("metadata.migrationId", "==", migrationId)
    .get();

  let deleted = 0;
  for (const doc of snapshot.docs) {
    await doc.ref.delete();
    deleted += 1;
  }
  return deleted;
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.replace("--", "");
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

if (require.main === module) {
  const argv = parseArgs(process.argv.slice(2));
  migrateRBACToReBAC({
    dryRun: Boolean(argv["dry-run"]),
    migrationId: typeof argv["migration-id"] === "string" ? (argv["migration-id"] as string) : undefined,
    rollbackId: typeof argv.rollback === "string" ? (argv.rollback as string) : undefined,
  })
    .then(() => {
      if (!argv["dry-run"]) {
        console.log("Migration completed successfully.");
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
