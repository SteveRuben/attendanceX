import { CollectionReference } from "firebase-admin/firestore";
import { logger as firebaseLogger } from "firebase-functions";
import { collections } from "../../config";
import { authService } from "../../services/auth/auth.service";

type LegacyPermissionChecker = Pick<typeof authService, "hasPermission">;

export type ParallelRunMismatchType =
  | "rbac_allow_rebac_deny"
  | "rbac_deny_rebac_allow";

type ParallelRunImpact = "access_blocked" | "unexpected_access";

export interface ParallelRunCompareInput {
  tenantId: string;
  userId: string;
  permission: string;
  subjectRef: string;
  objectRef: string;
  rebacAllowed: boolean;
  requestPath?: string;
  context?: Record<string, any>;
}

export interface ParallelRunLog {
  tenantId: string;
  userId: string;
  permission: string;
  subjectRef: string;
  objectRef: string;
  rebacAllowed: boolean;
  legacyAllowed: boolean;
  mismatchType: ParallelRunMismatchType;
  impact: ParallelRunImpact;
  severity: "medium" | "high";
  requestPath?: string;
  correlationId?: string;
  context?: ParallelRunContextSnapshot;
  createdAt: Date;
}

export interface ParallelRunAlert {
  tenantId: string;
  userId: string;
  permission: string;
  type: ParallelRunMismatchType;
  severity: "warning" | "critical";
  createdAt: Date;
  details?: {
    requestPath?: string;
    correlationId?: string;
  };
}

export interface ParallelRunStats {
  enabled: boolean;
  mismatchCount: number;
  alertsCount: number;
  breakdown: Record<ParallelRunMismatchType, number>;
  recentMismatches: Array<ParallelRunLog & { id: string }>;
  recentAlerts: Array<ParallelRunAlert & { id: string }>;
  lastUpdated: string;
}

interface ParallelRunServiceOptions {
  enabled?: boolean;
  collections?: {
    diffs: CollectionReference<ParallelRunLog>;
    alerts: CollectionReference<ParallelRunAlert>;
  };
  legacyChecker?: LegacyPermissionChecker;
  now?: () => Date;
  logger?: Pick<typeof firebaseLogger, "info" | "warn" | "error">;
}

interface ParallelRunContextSnapshot {
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  userEmail?: string;
}

const DEFAULT_BREAKDOWN: Record<ParallelRunMismatchType, number> = {
  rbac_allow_rebac_deny: 0,
  rbac_deny_rebac_allow: 0,
};

export class ParallelRunService {
  private readonly collections: {
    diffs: CollectionReference<ParallelRunLog>;
    alerts: CollectionReference<ParallelRunAlert>;
  };
  private readonly legacyChecker: LegacyPermissionChecker;
  private readonly now: () => Date;
  private readonly logger: Pick<
    typeof firebaseLogger,
    "info" | "warn" | "error"
  >;

  constructor(private readonly options: ParallelRunServiceOptions = {}) {
    this.collections = options.collections ?? {
      diffs: collections.rebac_parallel_run as CollectionReference<ParallelRunLog>,
      alerts:
        collections.rebac_parallel_alerts as CollectionReference<ParallelRunAlert>,
    };
    this.legacyChecker = options.legacyChecker ?? authService;
    this.now = options.now ?? (() => new Date());
    this.logger = options.logger ?? firebaseLogger;
  }

  async comparePermission(input: ParallelRunCompareInput): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    if (!input.userId || !input.tenantId) {
      return;
    }

    try {
      const legacyAllowed = await this.legacyChecker.hasPermission(
        input.userId,
        input.permission
      );

      if (legacyAllowed === input.rebacAllowed) {
        return;
      }

      const mismatchType: ParallelRunMismatchType =
        legacyAllowed && !input.rebacAllowed
          ? "rbac_allow_rebac_deny"
          : "rbac_deny_rebac_allow";
      const entry: ParallelRunLog = {
        tenantId: input.tenantId,
        userId: input.userId,
        permission: input.permission,
        subjectRef: input.subjectRef,
        objectRef: input.objectRef,
        rebacAllowed: input.rebacAllowed,
        legacyAllowed,
        mismatchType,
        impact:
          mismatchType === "rbac_allow_rebac_deny"
            ? "access_blocked"
            : "unexpected_access",
        severity: mismatchType === "rbac_allow_rebac_deny" ? "high" : "medium",
        requestPath: input.requestPath,
        correlationId: input.context?.correlationId,
        context: this.buildContextSnapshot(input.context),
        createdAt: this.now(),
      };

      await this.collections.diffs.add(entry);

      if (mismatchType === "rbac_allow_rebac_deny") {
        await this.collections.alerts.add({
          tenantId: input.tenantId,
          userId: input.userId,
          permission: input.permission,
          type: mismatchType,
          severity: "critical",
          createdAt: entry.createdAt,
          details: {
            requestPath: input.requestPath,
            correlationId: input.context?.correlationId,
          },
        });

        this.logger.warn?.("[ReBAC][ParallelRun] Access regression detected", {
          tenantId: input.tenantId,
          userId: input.userId,
          permission: input.permission,
          requestPath: input.requestPath,
        });
      }
    } catch (error) {
      this.logError("Failed to compare RBAC/ReBAC permission", error, input);
    }
  }

  async getStats(limit = 25): Promise<ParallelRunStats> {
    const timestamp = this.now().toISOString();
    if (!this.isEnabled()) {
      return {
        enabled: false,
        mismatchCount: 0,
        alertsCount: 0,
        breakdown: { ...DEFAULT_BREAKDOWN },
        recentMismatches: [],
        recentAlerts: [],
        lastUpdated: timestamp,
      };
    }

    try {
      const [diffSnapshot, alertSnapshot] = await Promise.all([
        this.collections.diffs.orderBy("createdAt", "desc").limit(limit).get(),
        this.collections.alerts
          .orderBy("createdAt", "desc")
          .limit(Math.min(limit, 10))
          .get(),
      ]);

      const breakdown: Record<ParallelRunMismatchType, number> = {
        ...DEFAULT_BREAKDOWN,
      };

      const recentMismatches = diffSnapshot.docs.map((doc) => {
        const data = doc.data();
        breakdown[data.mismatchType] =
          (breakdown[data.mismatchType] ?? 0) + 1;
        return {
          id: doc.id,
          ...data,
        };
      });

      const recentAlerts = alertSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const [mismatchCount, alertsCount] = await Promise.all([
        this.fetchCount(this.collections.diffs).catch(
          () => recentMismatches.length
        ),
        this.fetchCount(this.collections.alerts).catch(
          () => recentAlerts.length
        ),
      ]);

      return {
        enabled: true,
        mismatchCount,
        alertsCount,
        breakdown,
        recentMismatches,
        recentAlerts,
        lastUpdated: timestamp,
      };
    } catch (error) {
      this.logError("Failed to load parallel run stats", error);
      return {
        enabled: true,
        mismatchCount: 0,
        alertsCount: 0,
        breakdown: { ...DEFAULT_BREAKDOWN },
        recentMismatches: [],
        recentAlerts: [],
        lastUpdated: timestamp,
      };
    }
  }

  private async fetchCount(
    collection: CollectionReference
  ): Promise<number> {
    if (typeof collection.count !== "function") {
      return 0;
    }

    const snapshot = await collection.count().get();
    return snapshot.data().count;
  }

  private buildContextSnapshot(
    context?: Record<string, any>
  ): ParallelRunContextSnapshot | undefined {
    if (!context) {
      return undefined;
    }

    return {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      userEmail: context.userEmail,
    };
  }

  private isEnabled(): boolean {
    if (typeof this.options.enabled === "boolean") {
      return this.options.enabled;
    }
    return process.env.RBAC_PARALLEL_RUN_ENABLED === "true";
  }

  private logError(
    message: string,
    error: unknown,
    context?: Record<string, any>
  ): void {
    const payload = {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    };
    this.logger.error?.(`[ReBAC][ParallelRun] ${message}`, payload);
  }
}

export const parallelRunService = new ParallelRunService();
