import { SchemaRegistry } from "../SchemaRegistry";
import { RelationTuple } from "rebac/types/RelationTuple.types";

type Subject = RelationTuple["subject"];

export class SchemaValidator {
  private static readonly DEFAULT_ALLOWED_SUBJECTS: Subject["type"][] = [
    "user",
    "team",
    "role",
    "organization",
  ];

  constructor(private registry: SchemaRegistry) {}

  validateTuple(tuple: RelationTuple): boolean {
    if (!tuple.object?.type) {
      throw new Error("Tuple object type is required");
    }

    if (!tuple.relation) {
      throw new Error("Tuple relation is required");
    }

    const namespace = tuple.object.type;
    const schema = this.registry.getSchema(namespace);
    const relation = schema.relations[tuple.relation];

    if (!relation) {
      throw new Error(
        `Invalid relation "${tuple.relation}" for namespace "${namespace}"`
      );
    }

    this.validateSubject(tuple.subject, relation.allowedSubjects, namespace);

    if (tuple.subject.relation) {
      this.validateIndirectSubject(tuple.subject.relation);
    }

    return true;
  }

  private validateSubject(
    subject: Subject,
    allowedSubjects: string[] | undefined,
    namespace: string
  ): void {
    if (!subject?.type) {
      throw new Error("Subject type is required");
    }

    if (!subject.id) {
      throw new Error("Subject id is required");
    }

    const constraints =
      allowedSubjects && allowedSubjects.length > 0
        ? allowedSubjects
        : SchemaValidator.DEFAULT_ALLOWED_SUBJECTS;

    const isAllowed = constraints.some((allowed) =>
      this.matchesAllowedSubject(allowed, subject)
    );

    if (!isAllowed) {
      throw new Error(
        `Subject type "${subject.type}" not allowed for namespace "${namespace}"`
      );
    }
  }

  private matchesAllowedSubject(allowed: string, subject: Subject): boolean {
    const [expectedType, expectedRelation] = allowed.split("#");

    if (subject.type !== expectedType) {
      return false;
    }

    if (!expectedRelation) {
      return true;
    }

    if (!subject.relation) {
      return false;
    }

    const [relationName] = subject.relation.split("#");
    return relationName === expectedRelation;
  }

  private validateIndirectSubject(reference: string): void {
    if (!reference.includes("#")) {
      throw new Error(
        `Invalid indirect relation format: ${reference}. Expected "relation#namespace:id"`
      );
    }

    const [relationName, objectReference] = reference.split("#");
    if (!relationName || !objectReference) {
      throw new Error(`Malformed indirect relation: ${reference}`);
    }

    const [namespace, objectId] = objectReference.split(":");
    if (!namespace || !objectId) {
      throw new Error(
        `Malformed indirect relation target: ${objectReference}`
      );
    }
  }
}
