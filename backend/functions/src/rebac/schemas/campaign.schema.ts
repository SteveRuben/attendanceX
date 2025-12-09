import { NamespaceSchema } from "../types/NamespaceSchema.types";

export const CampaignSchema: NamespaceSchema = {
  name: "campaign",

  relations: {
    creator: { permissions: ["view", "edit", "delete", "launch", "view_stats"] },
    manager: { permissions: ["view", "edit", "launch", "view_stats"] },
    viewer: { permissions: ["view"] },
    parent_organization: {
      permissions: [],
      computedUserset: { relation: "member", namespace: "organization" }
    }
  },

  permissions: {
    view: { grantedBy: ["creator", "manager", "viewer"], description: "View campaign" },
    edit: { grantedBy: ["creator", "manager"], description: "Edit campaign" },
    delete: { grantedBy: ["creator"], description: "Delete campaign" },
    launch: { grantedBy: ["creator", "manager"], description: "Launch campaign" },
    view_stats: { grantedBy: ["creator", "manager"], description: "View analytics" }
  }
};
