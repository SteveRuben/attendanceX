import { NamespaceSchema } from "../types/NamespaceSchema.types";

export const TimesheetSchema: NamespaceSchema = {
  name: "timesheet",

  relations: {
    owner: { permissions: ["view", "edit", "submit"] },
    approver: { permissions: ["view", "approve", "reject", "export"] },
    viewer: { permissions: ["view"] },

    parent_organization: {
      permissions: [],
      computedUserset: { relation: "manager", namespace: "organization" }
    }
  },

  permissions: {
    view: { grantedBy: ["owner", "approver", "viewer", "parent_organization"], description: "View timesheet" },
    edit: { grantedBy: ["owner"], description: "Edit timesheet (draft only)" },
    submit: { grantedBy: ["owner"], description: "Submit timesheet" },
    approve: { grantedBy: ["approver"], description: "Approve timesheet" },
    reject: { grantedBy: ["approver"], description: "Reject timesheet" },
    export: { grantedBy: ["approver"], description: "Export timesheet" }
  }
};
