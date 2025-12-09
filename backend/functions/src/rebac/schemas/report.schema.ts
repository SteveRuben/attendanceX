import { NamespaceSchema } from "../types/NamespaceSchema.types";

export const ReportSchema: NamespaceSchema = {
  name: "report",

  relations: {
    creator: { permissions: ["view", "edit", "delete", "download"] },
    reviewer: { permissions: ["view", "comment", "download"] },
    viewer: { permissions: ["view"] },
    parent_organization: {
      permissions: [],
      computedUserset: { relation: "member", namespace: "organization" }
    }
  },

  permissions: {
    view: { grantedBy: ["creator", "reviewer", "viewer"], description: "View report" },
    edit: { grantedBy: ["creator"], description: "Edit report" },
    delete: { grantedBy: ["creator"], description: "Delete report" },
    comment: { grantedBy: ["reviewer"], description: "Comment report" },
    download: { grantedBy: ["creator", "reviewer"], description: "Download report" }
  }
};
