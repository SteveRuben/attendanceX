import type { Timestamp } from "firebase-admin/firestore";
import { SchemaRegistry } from "rebac/services/SchemaRegistry";
import { SchemaValidator } from "rebac/services/validation/SchemaValidator";
import { NamespaceSchema } from "rebac/types/NamespaceSchema.types";
import { RelationTuple } from "rebac/types/RelationTuple.types";

const defaultTimestamp = { toDate: () => new Date() } as unknown as Timestamp;

const buildTuple = (overrides: Partial<RelationTuple> = {}): RelationTuple => ({
  id: overrides.id ?? "tuple-1",
  tenantId: overrides.tenantId ?? "tenant-1",
  subject: overrides.subject ?? { type: "user", id: "user-1" },
  relation: overrides.relation ?? "viewer",
  object: overrides.object ?? { type: "test", id: "obj-1" },
  createdAt: overrides.createdAt ?? defaultTimestamp,
  source: overrides.source ?? "system",
  metadata: overrides.metadata,
  condition: overrides.condition,
  createdBy: overrides.createdBy,
  expiresAt: overrides.expiresAt,
});

const TestSchema: NamespaceSchema = {
  name: "test",
  relations: {
    viewer: {
      permissions: ["view"],
      allowedSubjects: ["user", "team#member"],
    },
    admin: {
      permissions: ["view", "edit"],
      allowedSubjects: ["role"],
    },
  },
  permissions: {
    view: {
      description: "Allow viewing resource",
      grantedBy: ["viewer", "admin"],
    },
    edit: {
      description: "Allow editing resource",
      grantedBy: ["admin"],
    },
  },
};

describe("SchemaRegistry", () => {
  it("loads the default schemas", () => {
    const registry = new SchemaRegistry();
    const schema = registry.getSchema("organization");

    expect(schema.name).toBe("organization");
    expect(schema.relations.owner).toBeDefined();
  });

  it("throws when namespace is not registered", () => {
    const registry = new SchemaRegistry([]);
    expect(() => registry.getSchema("unknown")).toThrow(
      'Schema not found for namespace: unknown'
    );
  });
});

describe("SchemaValidator", () => {
  let registry: SchemaRegistry;
  let validator: SchemaValidator;

  beforeEach(() => {
    registry = new SchemaRegistry([]);
    registry.register(TestSchema);
    validator = new SchemaValidator(registry);
  });

  it("accepts tuples matching the schema", () => {
    const tuple = buildTuple();
    expect(validator.validateTuple(tuple)).toBe(true);
  });

  it("throws when the schema does not define the relation", () => {
    const tuple = buildTuple({ relation: "unknown" });
    expect(() => validator.validateTuple(tuple)).toThrow(
      'Invalid relation "unknown" for namespace "test"'
    );
  });

  it("throws when subject type is not allowed", () => {
    const tuple = buildTuple({
      subject: { type: "team", id: "team-1" },
    });

    expect(() => validator.validateTuple(tuple)).toThrow(
      'Subject type "team" not allowed for namespace "test"'
    );
  });

  it("accepts tuples with indirect subjects that match allowed subjects", () => {
    const tuple = buildTuple({
      subject: { type: "team", id: "team-1", relation: "member#organization:org-1" },
    });

    expect(validator.validateTuple(tuple)).toBe(true);
  });

  it("throws for malformed indirect subject references", () => {
    const tuple = buildTuple({
      subject: { type: "team", id: "team-1", relation: "member" },
    });

    expect(() => validator.validateTuple(tuple)).toThrow(
      'Invalid indirect relation format: member. Expected "relation#namespace:id"'
    );
  });

  it("throws when the schema for the namespace is missing", () => {
    const tuple = buildTuple({
      object: { type: "unknown", id: "obj" },
    });

    expect(() => validator.validateTuple(tuple)).toThrow(
      'Schema not found for namespace: unknown'
    );
  });
});
