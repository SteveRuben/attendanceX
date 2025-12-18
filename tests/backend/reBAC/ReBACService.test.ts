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
    parent_link: {
      permissions: [],
    },
    inherited: {
      permissions: ["view"],
      computedUserset: {
        relation: "parent_link",
        namespace: "folder",
      },
    },
  },
  permissions: {
    view: {
      description: "View document",
      grantedBy: ["viewer", "editor", "inherited"],
    },
    edit: {
      description: "Edit document",
      grantedBy: ["editor"],
    },
  },
});

const createFolderSchema = (): NamespaceSchema => ({
  name: "folder",
  relations: {
    viewer: {
      permissions: ["view"],
      allowedSubjects: ["user"],
    },
  },
  permissions: {
    view: {
      description: "View folder",
      grantedBy: ["viewer"],
    },
  },
});

const createChainSchema = (): NamespaceSchema => ({
  name: "chain",
  relations: {
    link: {
      permissions: [],
    },
    inherited: {
      permissions: ["access"],
      computedUserset: {
        relation: "link",
        namespace: "chain",
      },
    },
  },
  permissions: {
    access: {
      description: "Recursive access",
      grantedBy: ["inherited"],
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
    tupleStore.find.mockResolvedValue([]);
    tupleStore.findExact.mockResolvedValue(null);
    schemaRegistry = new SchemaRegistry([]);
    schemaRegistry.register(createTestSchema());
    schemaRegistry.register(createFolderSchema());
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

    it("resolves permission via computed userset recursion", async () => {
      tupleStore.findExact
        .mockResolvedValueOnce(null) // viewer
        .mockResolvedValueOnce(null) // editor
        .mockResolvedValueOnce(null) // inherited direct
        .mockResolvedValueOnce(
          buildTuple({
            relation: "viewer",
            object: { type: "folder", id: "folder-1" },
          })
        ); // folder viewer

      tupleStore.find.mockResolvedValueOnce([
        buildTuple({
          id: "parent-link",
          relation: "parent_link",
          subject: {
            type: "document",
            id: "doc-1",
          } as unknown as RelationTuple["subject"],
          object: { type: "folder", id: "folder-1" },
        }),
      ]);

      const allowed = await service.check(
        "user:user-1",
        "view",
        "document:doc-1",
        { tenantId: "tenant-1" }
      );

      expect(allowed).toBe(true);
      expect(tupleStore.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relation: "parent_link",
        })
      );
      expect(tupleStore.findExact).toHaveBeenCalledWith(
        expect.objectContaining({
          relation: "viewer",
          object: { type: "folder", id: "folder-1" },
        })
      );
    });

    it("enforces depth limit to avoid infinite recursion", async () => {
      schemaRegistry.register(createChainSchema());
      validateTupleSpy.mockRestore();
      validator = new SchemaValidator(schemaRegistry);
      validateTupleSpy = jest
        .spyOn(validator, "validateTuple")
        .mockReturnValue(true);
      service = new ReBACService(
        tupleStore,
        schemaRegistry,
        validator,
        auditLogger
      );

      tupleStore.findExact.mockResolvedValue(null);

      const chainMap: Record<string, string> = {};
      for (let i = 1; i <= 11; i++) {
        chainMap[`node-${i}`] = `node-${i + 1}`;
      }

      tupleStore.find.mockImplementation(
        async (filter: Partial<RelationTuple>) => {
          const subjectId = (filter.subject as any)?.id;
          const nextId = subjectId ? chainMap[subjectId] : undefined;
          if (filter.relation === "link" && nextId) {
            return [
              buildTuple({
                id: `link-${subjectId}`,
                relation: "link",
                subject: {
                  type: "chain",
                  id: subjectId,
                } as unknown as RelationTuple["subject"],
                object: { type: "chain", id: nextId },
              }),
            ];
          }
          return [];
        }
      );

      const allowed = await service.check(
        "user:user-1",
        "access",
        "chain:node-1",
        { tenantId: "tenant-1" }
      );

      expect(allowed).toBe(false);
      expect(auditLogger.logAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rebac_check",
          outcome: "failure",
          organizationId: "tenant-1",
        })
      );
      tupleStore.find.mockResolvedValue([]);
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
