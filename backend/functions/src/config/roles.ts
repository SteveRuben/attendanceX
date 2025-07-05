import {RoleDefinition, USER_PERMISSIONS} from "@attendance-x/shared";


/**
 * Définition des rôles du système avec leurs permissions
 * Chaque rôle hérite des permissions des rôles inférieurs
 */
/* export const roles: Record<string, RoleDefinition> = {
  // Super administrateur - accès complet au système
  SUPER_ADMIN: {
    level: 100,
    inherits: ["ADMIN"],
    permissions: [
      "manage_roles",
      "manage_system_settings",
      "delete_any_user",
      "reset_any_password",
      "view_audit_logs",
      "manage_sms_providers",
      "manage_email_providers",
      "export_all_data",
    ],
  },

  // Administrateur - gestion des utilisateurs et paramètres
  ADMIN: {
    level: 80,
    inherits: ["ORGANIZER"],
    permissions: [
      "manage_users",
      "view_all_users",
      "view_all_events",
      "view_all_attendances",
      "generate_all_reports",
      "create_admin_users",
      "delete_events",
      "delete_attendances",
      "manage_templates",
      "send_system_notifications",
    ],
  },

  // Organisateur - création et gestion d'événements
  ORGANIZER: {
    level: 60,
    inherits: ["MANAGER"],
    permissions: [
      "create_events",
      "edit_events",
      "delete_own_events",
      "view_event_attendances",
      "validate_attendances",
      "generate_qr_codes",
      "send_event_notifications",
      "generate_event_reports",
      "export_event_data",
    ],
  },

  // Manager - gestion d'équipe et vérification des présences
  MANAGER: {
    level: 40,
    inherits: ["PARTICIPANT"],
    permissions: [
      "view_team_users",
      "view_team_attendances",
      "generate_team_reports",
      "validate_team_attendances",
      "create_participants",
      "edit_team_profiles",
    ],
  },

  // Participant - utilisateur standard
  PARTICIPANT: {
    level: 20,
    inherits: [],
    permissions: [
      "mark_attendance",
      "view_own_attendance",
      "view_own_events",
      "update_profile",
      "view_notifications",
      "mark_notifications_read",
    ],
  },

  // Invité - accès limité sans authentification
  GUEST: {
    level: 10,
    inherits: [],
    permissions: [
      "view_public_events",
    ],
  },
}; */

/**
 * Map de toutes les permissions disponibles avec descriptions
 */
/* export const permissionsMap: Record<typeof USER_PERMISSIONS, string> = {
  // Permissions système
  manage_roles: "Gérer les rôles et permissions",
  manage_system_settings: "Configurer les paramètres système",
  view_audit_logs: "Consulter les logs d'audit",
  manage_sms_providers: "Gérer les fournisseurs SMS",
  manage_email_providers: "Gérer les fournisseurs d'email",
  export_all_data: "Exporter toutes les données",

  // Permissions utilisateurs
  manage_users: "Gérer tous les utilisateurs",
  view_all_users: "Voir tous les utilisateurs",
  create_admin_users: "Créer des utilisateurs admin",
  delete_any_user: "Supprimer n'importe quel utilisateur",
  reset_any_password: "Réinitialiser n'importe quel mot de passe",
  view_team_users: "Voir les utilisateurs de son équipe",
  create_participants: "Créer des utilisateurs participants",
  edit_team_profiles: "Modifier les profils de son équipe",
  update_profile: "Mettre à jour son profil",

  // Permissions événements
  create_events: "Créer des événements",
  edit_events: "Modifier des événements",
  delete_events: "Supprimer n'importe quel événement",
  delete_own_events: "Supprimer ses propres événements",
  view_all_events: "Voir tous les événements",
  view_own_events: "Voir ses propres événements",
  view_public_events: "Voir les événements publics",
  generate_qr_codes: "Générer des codes QR",

  // Permissions présences
  mark_attendance: "Marquer sa présence",
  validate_attendances: "Valider les présences",
  validate_team_attendances: "Valider les présences de son équipe",
  view_all_attendances: "Voir toutes les présences",
  view_event_attendances: "Voir les présences d'un événement",
  view_team_attendances: "Voir les présences de son équipe",
  view_own_attendance: "Voir ses propres présences",
  delete_attendances: "Supprimer des présences",

  // Permissions rapports
  generate_all_reports: "Générer tous types de rapports",
  generate_event_reports: "Générer des rapports pour ses événements",
  generate_team_reports: "Générer des rapports pour son équipe",
  export_event_data: "Exporter les données de ses événements",

  // Permissions notifications
  send_system_notifications: "Envoyer des notifications système",
  send_event_notifications: "Envoyer des notifications pour ses événements",
  view_notifications: "Voir ses notifications",
  mark_notifications_read: "Marquer ses notifications comme lues",

  // Permissions templates
  manage_templates: "Gérer les templates (email, SMS)",
}; */

/**
 * Vérifie si un rôle a une permission spécifique
 */
/* export function hasPermission(roleName: string, permission: keyof Permissions): boolean {
  // Récupérer le rôle
  const role = roles[roleName];

  if (!role) {
    return false;
  }

  // Vérifier si le rôle a directement la permission
  if (role.permissions.includes(permission)) {
    return true;
  }

  // Vérifier les permissions héritées
  for (const inheritedRole of role.inherits) {
    if (hasPermission(inheritedRole, permission)) {
      return true;
    }
  }

  return false;
} */
