import {
  buildMigrationMetadata,
  mapTenantRoleToRelation,
  MIGRATION_TAG,
} from "../../../backend/functions/src/scripts/rebac/migrate-rbac-to-rebac";
import { TenantRole } from "../../../backend/functions/src/common/types/tenant.types";

describe("RBAC migration helpers", () => {
  it("maps tenant roles to organization relations", () => {
    expect(mapTenantRoleToRelation(TenantRole.OWNER)).toBe("owner");
    expect(mapTenantRoleToRelation(TenantRole.ADMIN)).toBe("admin");
    expect(mapTenantRoleToRelation(TenantRole.MANAGER)).toBe("manager");
    expect(mapTenantRoleToRelation(TenantRole.MEMBER)).toBe("member");
    expect(mapTenantRoleToRelation(TenantRole.VIEWER)).toBe("viewer");
  });

  it("builds migration metadata with defaults", () => {
    const metadata = buildMigrationMetadata("test-run", "entity", {
      foo: "bar",
    });

    expect(metadata).toEqual({
      migrationTag: MIGRATION_TAG,
      migrationId: "test-run",
      entity: "entity",
      foo: "bar",
    });
  });
});
