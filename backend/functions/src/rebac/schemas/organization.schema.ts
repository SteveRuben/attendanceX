import { NamespaceSchema } from "../types/NamespaceSchema.types";

export const OrganizationSchema: NamespaceSchema = {
  name: "organization",

  relations: {
    owner: {
      permissions: ["view", "edit", "delete", "manage_members", "manage_billing", "view_analytics"]
    },
    admin: {
      permissions: ["view", "edit", "manage_members", "view_analytics"]
    },
    manager: {
      permissions: ["view", "view_analytics"]
    },
    member: {
      permissions: ["view"]
    },
    viewer: {
      permissions: ["view"]
    },
  },

  permissions: {
    view: { description: "Can view organization", grantedBy: ["owner", "admin", "manager", "member", "viewer"] },
    edit: { description: "Can edit organization", grantedBy: ["owner", "admin"] },
    delete: { description: "Can delete organization", grantedBy: ["owner"] },
    manage_members: { description: "Can manage members", grantedBy: ["owner", "admin"] },
    manage_billing: { description: "Can manage billing", grantedBy: ["owner"] },
    view_analytics: { description: "Can view analytics", grantedBy: ["owner", "admin", "manager"] }
  }
};
