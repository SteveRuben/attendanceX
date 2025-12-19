import { ReBACCache } from "rebac/services/ReBACCache";
import { RelationTuple } from "rebac/types/RelationTuple.types";

const defaultContext = {
  tenantId: "tenant-1",
  subject: { type: "user", id: "user-1" },
  permission: "view",
  object: { type: "document", id: "doc-1" },
};

const buildTuple = (overrides: Partial<RelationTuple> = {}): RelationTuple => ({
  id: overrides.id ?? "tuple-1",
  tenantId: overrides.tenantId ?? "tenant-1",
  subject:
    overrides.subject ??
    ({
      type: "user",
      id: "user-1",
    } as RelationTuple["subject"]),
  relation: overrides.relation ?? "viewer",
  object: overrides.object ?? { type: "document", id: "doc-1" },
  createdAt:
    overrides.createdAt ??
    ({
      toDate: () => new Date(),
    } as any),
  source: overrides.source ?? "system",
  metadata: overrides.metadata,
  condition: overrides.condition,
  createdBy: overrides.createdBy,
  expiresAt: overrides.expiresAt,
});

describe("ReBACCache", () => {
  it("stores and retrieves check results from L1 cache", async () => {
    const cache = new ReBACCache({ enableRedis: false });

    await cache.setCheckResult(defaultContext, true);
    const cached = await cache.getCheckResult(defaultContext);

    expect(cached).toBe(true);
    expect(cache.getMetrics().l1Hits).toBe(1);
  });

  it("invalidates cache entries when tuples change", async () => {
    const cache = new ReBACCache({ enableRedis: false });

    await cache.setCheckResult(defaultContext, true);
    await cache.invalidateForTuple(buildTuple());

    const cached = await cache.getCheckResult(defaultContext);
    expect(cached).toBeNull();
  });

  it("caches expand results arrays", async () => {
    const cache = new ReBACCache({ enableRedis: false });
    const expandContext = {
      tenantId: "tenant-1",
      subject: { type: "user", id: "user-1" },
      permission: "view",
      objectType: "document",
    };
    const items = [
      { type: "document", id: "doc-1" },
      { type: "document", id: "doc-2" },
    ];

    await cache.setExpandResult(expandContext, items);
    const cached = await cache.getExpandResult(expandContext);

    expect(cached).toEqual(items);
  });
});
