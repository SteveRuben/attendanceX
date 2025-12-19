import { ExpressionEvaluator } from "../../../backend/functions/src/rebac/services/ExpressionEvaluator";

describe("ExpressionEvaluator", () => {
  const evaluator = new ExpressionEvaluator();

  it("évalue les comparaisons numériques et logiques", () => {
    const result = evaluator.evaluate(
      "object.count > condition.minimum AND context.tenantId == 'tenant-1'",
      {
        object: { count: 10 },
        condition: { minimum: 5 },
        context: { tenantId: "tenant-1" },
      }
    );

    expect(result).toBe(true);
  });

  it("gère les comparaisons de chaînes avec OR", () => {
    const result = evaluator.evaluate(
      "object.status == 'draft' OR object.status == 'archived'",
      {
        object: { status: "archived" },
      }
    );

    expect(result).toBe(true);
  });

  it("retourne false sur expression invalide", () => {
    expect(() =>
      evaluator.evaluate("object.status === 'draft'", { object: {} })
    ).toThrow();
  });
});
