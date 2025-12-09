import { NamespaceSchema } from "../types/NamespaceSchema.types";

export const DocumentSchema: NamespaceSchema = {
  name: "document",

  relations: {
    creator: { permissions: ["view", "edit", "delete", "share", "download"] },
    editor: { permissions: ["view", "edit", "share", "download"] },
    viewer: { permissions: ["view", "download"] },

    parent_resource: {
      permissions: [],
      computedUserset: {
        relation: "viewer",
        namespace: "project" // ou organization, event… dépendra du système
      }
    }
  },

  permissions: {
    view: { description: "View document", grantedBy: ["creator", "editor", "viewer", "parent_resource"] },
    edit: { description: "Edit document", grantedBy: ["creator", "editor"] },
    delete: { description: "Delete document", grantedBy: ["creator"] },
    share: { description: "Share document", grantedBy: ["creator", "editor"] },
    download: { description: "Download document", grantedBy: ["creator", "editor", "viewer"] }
  }
};
