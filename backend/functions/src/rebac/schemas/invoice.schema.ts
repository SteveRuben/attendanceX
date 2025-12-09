import { NamespaceSchema } from "../types/NamespaceSchema.types";

export const InvoiceSchema: NamespaceSchema = {
  name: "invoice",

  relations: {
    creator: { permissions: ["view", "edit", "delete", "send", "download"] },
    approver: { permissions: ["view", "approve", "reject"] },
    payer: { permissions: ["view", "download"] },
    viewer: { permissions: ["view"] },

    parent_organization: {
      permissions: [],
      computedUserset: { relation: "admin", namespace: "organization" }
    }
  },

  permissions: {
    view: { grantedBy: ["creator", "approver", "payer", "viewer"], description: "View invoice" },
    edit: { grantedBy: ["creator"], description: "Edit invoice" },
    delete: { grantedBy: ["creator"], description: "Delete invoice" },
    send: { grantedBy: ["creator"], description: "Send invoice" },
    approve: { grantedBy: ["approver"], description: "Approve invoice" },
    reject: { grantedBy: ["approver"], description: "Reject invoice" },
    download: { grantedBy: ["creator", "payer"], description: "Download invoice" }
  }
};
