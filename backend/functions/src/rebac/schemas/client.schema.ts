import { NamespaceSchema } from "../types/NamespaceSchema.types";

export const ClientSchema: NamespaceSchema = {
  name: "client",

  relations: {
    owner: { permissions: ["view", "edit", "delete", "manage_appointments", "view_history"] },
    assigned_to: { permissions: ["view", "edit", "manage_appointments", "view_history"] },
    viewer: { permissions: ["view"] },

    parent_organization: {
      permissions: [],
      computedUserset: {
        relation: "member",
        namespace: "organization"
      }
    }
  },

  permissions: {
    view: { description: "View client", grantedBy: ["owner", "assigned_to", "viewer", "parent_organization"] },
    edit: { description: "Edit client", grantedBy: ["owner", "assigned_to"] },
    delete: { description: "Delete client", grantedBy: ["owner"] },
    manage_appointments: { description: "Manage appointments", grantedBy: ["owner", "assigned_to"] },
    view_history: { description: "View history", grantedBy: ["owner", "assigned_to"] }
  }
};
