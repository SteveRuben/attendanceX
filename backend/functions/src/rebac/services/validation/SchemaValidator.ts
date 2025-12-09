import { SchemaRegistry } from "../SchemaRegistry";
import { RelationTuple } from "rebac/types/RelationTuple.types";

export class SchemaValidator {
  constructor(private registry: SchemaRegistry) {}

  validateTuple(tuple: RelationTuple) {
    const namespace = tuple.object.type;
    const schema = this.registry.getSchema(namespace);

    if (!schema) {
      throw new Error(`Schema not found for namespace: ${namespace}`);
    }

    const relation = schema.relations[tuple.relation];
    if (!relation) {
      throw new Error(
        `Invalid relation "${tuple.relation}" for namespace "${namespace}"`
      );
    }

    // Validate subject type
    const allowedSubjects = relation.allowedSubjects || [];
    const subjectType = tuple.subject.type;

    if (!allowedSubjects.includes(subjectType)) {
      throw new Error(
        `Subject type "${subjectType}" not allowed for relation "${tuple.relation}" in "${namespace}"`
      );
    }

    // Validate relation indirecte  "user#member@team:123"
    if (tuple.subject.relation) {
      this.validateIndirectSubject(tuple.subject);
    }

    return true;
  }

  private validateIndirectSubject(subject: any) {
    const relation = subject.relation;

    if (!relation.includes("#")) {
      throw new Error(
        `Invalid indirect relation format: ${relation}. Expected "role#group:123"`
      );
    }

    // Optionnel : découper et vérifier
    // exemple: "member#organization:123"
    const [subRel, obj] = relation.split("#");

    if (!subRel || !obj) {
      throw new Error(`Malformed indirect relation: ${relation}`);
    }
  }
}
