import { ParallelRunService } from "rebac/services/ParallelRunService";
import type {
  ParallelRunAlert,
  ParallelRunLog,
} from "rebac/services/ParallelRunService";
import type { CollectionReference } from "firebase-admin/firestore";

const createLoggerMock = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

type CollectionDouble<T extends { createdAt?: Date }> = {
  records: T[];
  add: jest.Mock<Promise<void>, [T]>;
  orderBy: jest.Mock<
    {
      limit: (limit: number) => {
        get: () => Promise<{
          docs: Array<{ id: string; data(): T }>;
        }>;
      };
    },
    [string, "asc" | "desc"?]
  >;
  count: jest.Mock<
    {
      get: () => Promise<{
        data(): { count: number };
      }>;
    },
    []
  >;
};

const createCollectionDouble = <T extends { createdAt?: Date }>(
  seed: T[] = []
): CollectionDouble<T> => {
  const records = [...seed];
  return {
    records,
    add: jest.fn(async (doc: T) => {
      records.push(doc);
    }),
    orderBy: jest.fn(() => ({
      limit: (limit: number) => ({
        get: async () => ({
          docs: records
            .slice()
            .sort(
              (a, b) =>
                (b.createdAt?.getTime?.() ?? 0) -
                (a.createdAt?.getTime?.() ?? 0)
            )
            .slice(0, limit)
            .map((data, index) => ({
              id: `doc-${records.length - index}`,
              data: () => data,
            })),
        }),
      }),
    })),
    count: jest.fn(() => ({
      get: async () => ({
        data: () => ({ count: records.length }),
      }),
    })),
  };
};

const toCollectionReference = <T>(
  collection: CollectionDouble<T>
): CollectionReference<T> => collection as unknown as CollectionReference<T>;

describe("ParallelRunService", () => {
  const baseInput = {
    tenantId: "tenant-1",
    userId: "user-1",
    permission: "view_reports",
    subjectRef: "user:user-1",
    objectRef: "organization:tenant-1",
    rebacAllowed: false,
    requestPath: "/api/test",
    context: {
      ipAddress: "127.0.0.1",
      userAgent: "jest",
      correlationId: "corr-1",
      sessionId: "sess-1",
    },
  };

  let legacyChecker: { hasPermission: jest.Mock };
  let diffs: CollectionDouble<ParallelRunLog>;
  let alerts: CollectionDouble<ParallelRunAlert>;
  let logger: ReturnType<typeof createLoggerMock>;
  let now: jest.Mock<() => Date>;

  beforeEach(() => {
    legacyChecker = { hasPermission: jest.fn() };
    diffs = createCollectionDouble<ParallelRunLog>();
    alerts = createCollectionDouble<ParallelRunAlert>();
    logger = createLoggerMock();
    now = jest.fn(() => new Date("2024-01-01T00:00:00.000Z"));
  });

  it("skips comparison when the feature is disabled", async () => {
    const service = new ParallelRunService({
      enabled: false,
      legacyChecker,
      collections: {
        diffs: toCollectionReference(diffs),
        alerts: toCollectionReference(alerts),
      },
      logger,
      now,
    });

    await service.comparePermission(baseInput);
    expect(legacyChecker.hasPermission).not.toHaveBeenCalled();
    expect(diffs.add).not.toHaveBeenCalled();
  });

  it("does nothing when RBAC and ReBAC agree", async () => {
    legacyChecker.hasPermission.mockResolvedValue(false);
    const service = new ParallelRunService({
      enabled: true,
      legacyChecker,
      collections: {
        diffs: toCollectionReference(diffs),
        alerts: toCollectionReference(alerts),
      },
      logger,
      now,
    });

    await service.comparePermission(baseInput);
    expect(legacyChecker.hasPermission).toHaveBeenCalledWith(
      baseInput.userId,
      baseInput.permission
    );
    expect(diffs.add).not.toHaveBeenCalled();
  });

  it("logs and alerts when RBAC allows but ReBAC denies", async () => {
    legacyChecker.hasPermission.mockResolvedValue(true);
    const service = new ParallelRunService({
      enabled: true,
      legacyChecker,
      collections: {
        diffs: toCollectionReference(diffs),
        alerts: toCollectionReference(alerts),
      },
      logger,
      now,
    });

    await service.comparePermission(baseInput);

    expect(diffs.add).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: baseInput.tenantId,
        mismatchType: "rbac_allow_rebac_deny",
        impact: "access_blocked",
        severity: "high",
      })
    );
    expect(alerts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "rbac_allow_rebac_deny",
        severity: "critical",
      })
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it("logs without alert when ReBAC allows but RBAC denies", async () => {
    legacyChecker.hasPermission.mockResolvedValue(false);
    const service = new ParallelRunService({
      enabled: true,
      legacyChecker,
      collections: {
        diffs: toCollectionReference(diffs),
        alerts: toCollectionReference(alerts),
      },
      logger,
      now,
    });

    await service.comparePermission({
      ...baseInput,
      rebacAllowed: true,
    });

    expect(diffs.add).toHaveBeenCalledWith(
      expect.objectContaining({
        mismatchType: "rbac_deny_rebac_allow",
        impact: "unexpected_access",
      })
    );
    expect(alerts.add).not.toHaveBeenCalled();
  });

  it("aggregates stats with breakdown and recent entries", async () => {
    const diffSeed: ParallelRunLog[] = [
      {
        tenantId: "tenant-1",
        userId: "u1",
        permission: "p1",
        subjectRef: "user:u1",
        objectRef: "organization:tenant-1",
        rebacAllowed: false,
        legacyAllowed: true,
        mismatchType: "rbac_allow_rebac_deny",
        impact: "access_blocked",
        severity: "high",
        createdAt: new Date("2024-01-02T00:00:00.000Z"),
      },
      {
        tenantId: "tenant-1",
        userId: "u2",
        permission: "p2",
        subjectRef: "user:u2",
        objectRef: "organization:tenant-1",
        rebacAllowed: true,
        legacyAllowed: false,
        mismatchType: "rbac_deny_rebac_allow",
        impact: "unexpected_access",
        severity: "medium",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ];
    const alertSeed: ParallelRunAlert[] = [
      {
        tenantId: "tenant-1",
        userId: "u1",
        permission: "p1",
        type: "rbac_allow_rebac_deny",
        severity: "critical",
        createdAt: new Date("2024-01-02T00:00:00.000Z"),
      },
    ];

    diffs = createCollectionDouble(diffSeed);
    alerts = createCollectionDouble(alertSeed);

    const service = new ParallelRunService({
      enabled: true,
      legacyChecker,
      collections: {
        diffs: toCollectionReference(diffs),
        alerts: toCollectionReference(alerts),
      },
      logger,
      now,
    });

    const stats = await service.getStats(10);

    expect(stats.enabled).toBe(true);
    expect(stats.mismatchCount).toBe(2);
    expect(stats.alertsCount).toBe(1);
    expect(stats.breakdown).toEqual({
      rbac_allow_rebac_deny: 1,
      rbac_deny_rebac_allow: 1,
    });
    expect(stats.recentMismatches).toHaveLength(2);
    expect(stats.recentAlerts).toHaveLength(1);
    expect(stats.lastUpdated).toBe("2024-01-01T00:00:00.000Z");
  });
});
