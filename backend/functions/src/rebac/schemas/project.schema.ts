import { NamespaceSchema } from "../types/NamespaceSchema.types";

export const ProjectSchema: NamespaceSchema = {
  name: "project",

  relations: {
    owner: { permissions: ["view", "edit", "delete", "manage_team", "log_time", "view_financials"] },
    manager: { permissions: ["view", "edit", "manage_team", "log_time", "view_financials"] },
    contributor: { permissions: ["view", "log_time"] },
    viewer: { permissions: ["view"] },

    parent_organization: {
      permissions: [],
      computedUserset: { relation: "member", namespace: "organization" }
    },

    linked_client: {
      permissions: [],
      computedUserset: { relation: "owner", namespace: "client" }
    }
  },

  permissions: {
    view: { description: "View project", grantedBy: ["owner", "manager", "contributor", "viewer", "parent_organization"] },
    edit: { description: "Edit project", grantedBy: ["owner", "manager"] },
    delete: { description: "Delete project", grantedBy: ["owner"] },
    manage_team: { description: "Manage team", grantedBy: ["owner", "manager"] },
    log_time: { description: "Log time", grantedBy: ["owner", "manager", "contributor"] },
    view_financials: { description: "View finances", grantedBy: ["owner", "manager"] }
  }
};
