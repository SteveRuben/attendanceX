import { SchemaRegistry } from "../../../backend/functions/src/rebac/services/SchemaRegistry";
import { SchemaValidator } from "../../../backend/functions/src/rebac/services/validation/SchemaValidator";

describe("SchemaValidator", () => {
  let registry: SchemaRegistry;
  let validator: SchemaValidator;

  beforeEach(() => {
    registry = new SchemaRegistry();
    registry.register({
      name: "document",
      relations: {
        editor: { permissions: ["view", "edit"] },
      },
      permissions: {
        view: { description: "View document", grantedBy: ["creator", "editor", "viewer", "parent_resource"] },
      }
    });

    validator = new SchemaValidator(registry);
  });

  test("valid tuple should pass", () => {
    expect(() =>
      validator.validateTuple({
        id: "1",
        tenantId: "t1",
        subject: { type: "user", id: "u1" },
        relation: "owner",
        object: { type: "document", id: "d1" }
      })
    ).not.toThrow();
  });

  test("invalid relation should fail", () => {
    expect(() =>
      validator.validateTuple({
        id: "1",
        tenantId: "t1",
        subject: { type: "user", id: "u1" },
        relation: "invalid",
        object: { type: "document", id: "d1" }
      })
    ).toThrow("Invalid relation");
  });

  test("invalid subject type should fail", () => {
    expect(() =>
      validator.validateTuple({
        id: "1",
        tenantId: "t1",
        subject: { type: "organization", id: "o1" },
        relation: "owner",
        object: { type: "document", id: "d1" }
      })
    ).toThrow("Subject type");
  });
});
