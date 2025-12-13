import { SchemaRegistry } from "rebac/services/SchemaRegistry";
import { ReBACService } from "rebac/services/ReBACService";
import { SchemaValidator } from "rebac/services/validation/SchemaValidator";
import { NamespaceSchema } from "rebac/types/NamespaceSchema.types";
import { RelationTuple } from "rebac/types/RelationTuple.types";
import type { TupleStore } from "rebac/services/TupleStore";
import type { Timestamp } from "firebase-admin/firestore";

type TupleStoreMock = Pick<
  TupleStore,
  "findExact" | "find" | "create" | "delete"
>;

const createTupleStoreMock = (): jest.Mocked<TupleStoreMock> => ({
  findExact: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
});

const createAuditLoggerMock = () => ({
  logAuditEntry: jest.fn().mockResolvedValue({} as any),
});

const createTestSchema = (): NamespaceSchema => ({
  name: "document",
  relations: {
    viewer: {
      permissions: ["view"],
      allowedSubjects: ["user"],
    },
    editor: {
      permissions: ["view", "edit"],
      allowedSubjects: ["user"],
    },
  },
  permissions: {
    view: {
      description: "View document",
      grantedBy: ["viewer", "editor"],
    },
    edit: {
      description: "Edit document",
      grantedBy: ["editor"],
    },
  },
});

const buildTuple = (overrides: Partial<RelationTuple> = {}): RelationTuple => ({
  id: overrides.id ?? "tuple-1",
  tenantId: overrides.tenantId ?? "tenant-1",
  subject:
    overrides.subject ?? ({
      type: "user",
      id: "user-1",
    } as RelationTuple["subject"]),
  relation: overrides.relation ?? "viewer",
  object: overrides.object ?? { type: "document", id: "doc-1" },
  createdAt: overrides.createdAt ?? ({ toDate: () => new Date() } as Timestamp),
  source: overrides.source ?? "system",
  metadata: overrides.metadata,
  condition: overrides.condition,
  createdBy: overrides.createdBy,
  expiresAt: overrides.expiresAt,
});

describe("ReBACService", () => {
  let tupleStore: jest.Mocked<TupleStoreMock>;
  let schemaRegistry: SchemaRegistry;
  let validator: SchemaValidator;
  let validateTupleSpy: jest.SpyInstance;
  let auditLogger: ReturnType<typeof createAuditLoggerMock>;
  let service: ReBACService;

  beforeEach(() => {
    tupleStore = createTupleStoreMock();
    schemaRegistry = new SchemaRegistry([]);
    schemaRegistry.register(createTestSchema());
    validator = new SchemaValidator(schemaRegistry);
    validateTupleSpy = jest
      .spyOn(validator, "validateTuple")
      .mockReturnValue(true);
    auditLogger = createAuditLoggerMock();
    service = new ReBACService(
      tupleStore,
      schemaRegistry,
      validator,
      auditLogger
    );
  });

  afterEach(() => {
    validateTupleSpy.mockRestore();
  });

  describe("check", () => {
    it("returns true when a direct tuple exists for the permission", async () => {
      tupleStore.findExact.mockResolvedValueOnce(buildTuple());

      const allowed = await service.check(
        "user:user-1",
        "view",
        "document:doc-1",
        { tenantId: "tenant-1" }
      );

      expect(allowed).toBe(true);
      expect(tupleStore.findExact).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-1",
          relation: "viewer",
        })
      );
      expect(auditLogger.logAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rebac_check",
          outcome: "success",
          organizationId: "tenant-1",
        })
      );
    });

    it("returns false when no tuple matches the permission", async () => {
      tupleStore.findExact.mockResolvedValue(null);

      const allowed = await service.check(
        "user:user-1",
        "edit",
        "document:doc-1",
        { tenantId: "tenant-1" }
      );

      expect(allowed).toBe(false);
      expect(tupleStore.findExact).toHaveBeenCalledWith(
        expect.objectContaining({
          relation: "editor",
        })
      );
      expect(auditLogger.logAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rebac_check",
          outcome: "failure",
          organizationId: "tenant-1",
        })
      );
    });

    it("throws when tenantId is missing in context", async () => {
      await expect(
        service.check("user:user-1", "view", "document:doc-1", undefined as any)
      ).rejects.toThrow("tenantId is required");
    });
  });

  describe("write", () => {
    it("validates tuples and creates them when they do not exist", async () => {
      const tuple = buildTuple();
      tupleStore.findExact.mockResolvedValue(null);

      await service.write(tuple);

      expect(validateTupleSpy).toHaveBeenCalledWith(tuple);
      expect(tupleStore.create).toHaveBeenCalledWith(tuple);
      expect(auditLogger.logAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rebac_write",
          outcome: "success",
          organizationId: "tenant-1",
        })
      );
    });

    it("skips creation when a tuple is already stored", async () => {
      const tuple = buildTuple();
      tupleStore.findExact.mockResolvedValue(tuple);

      await service.write(tuple);

      expect(tupleStore.create).not.toHaveBeenCalled();
      expect(auditLogger.logAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rebac_write",
          outcome: "warning",
          organizationId: "tenant-1",
        })
      );
    });
  });

  describe("delete", () => {
    it("deletes every tuple matching the filter", async () => {
      const tuples = [buildTuple({ id: "1" }), buildTuple({ id: "2" })];
      tupleStore.find.mockResolvedValue(tuples);

      await service.delete({ tenantId: "tenant-1", relation: "viewer" });

      expect(tupleStore.delete).toHaveBeenCalledTimes(2);
      expect(tupleStore.delete).toHaveBeenCalledWith("1");
      expect(tupleStore.delete).toHaveBeenCalledWith("2");
      expect(auditLogger.logAuditEntry).toHaveBeenCalledTimes(2);
      auditLogger.logAuditEntry.mock.calls.forEach((call) => {
        expect(call[0]).toMatchObject({
          action: "rebac_delete",
          outcome: "success",
        });
      });
    });

    it("logs a warning when no tuples are found but tenant is provided", async () => {
      tupleStore.find.mockResolvedValue([]);

      await service.delete(
        { tenantId: "tenant-1", relation: "viewer", object: { type: "doc", id: "1" } },
        { userId: "user" }
      );

      expect(tupleStore.delete).not.toHaveBeenCalled();
      expect(auditLogger.logAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rebac_delete",
          outcome: "warning",
          organizationId: "tenant-1",
        })
      );
    });
  });
});
