import { NamespaceSchema } from "../types/NamespaceSchema.types";

export const EventSchema: NamespaceSchema = {
  name: "event",

  relations: {
    creator: { permissions: ["view", "edit", "delete", "manage_participants", "view_analytics"] },
    organizer: { permissions: ["view", "edit", "manage_participants", "view_analytics"] },
    participant: { permissions: ["view", "mark_attendance"] },
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
    view: {
      description: "View an event",
      grantedBy: ["creator", "organizer", "participant", "viewer", "parent_organization"]
    },
    edit: { description: "Edit event", grantedBy: ["creator", "organizer"] },
    delete: { description: "Delete event", grantedBy: ["creator"] },
    manage_participants: { description: "Manage participants", grantedBy: ["creator", "organizer"] },
    mark_attendance: { description: "Mark attendance", grantedBy: ["participant"] },
    view_analytics: { description: "View analytics", grantedBy: ["creator", "organizer"] }
  }
};
