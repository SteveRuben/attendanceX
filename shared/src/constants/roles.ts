// shared/src/constants/roles.ts

import { UserRole } from "@/types";


export const ROLE_LEVELS = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.ADMIN]: 80,
  [UserRole.ORGANIZER]: 60,
  [UserRole.MANAGER]: 40,
  [UserRole.PARTICIPANT]: 20,
  [UserRole.GUEST]: 10
} as const;

export const ROLE_LABELS = {
  [UserRole.SUPER_ADMIN]: 'Super Administrateur',
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.ORGANIZER]: 'Organisateur',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.PARTICIPANT]: 'Participant',
  [UserRole.GUEST]: 'Invité'
} as const;

export const ROLE_DESCRIPTIONS = {
  [UserRole.SUPER_ADMIN]: 'Accès complet au système, gestion des paramètres globaux',
  [UserRole.ADMIN]: 'Gestion des utilisateurs, événements et paramètres avancés',
  [UserRole.ORGANIZER]: 'Création et gestion d\'événements, génération de rapports',
  [UserRole.MANAGER]: 'Gestion d\'équipe et validation des présences',
  [UserRole.PARTICIPANT]: 'Participation aux événements et marquage de présence',
  [UserRole.GUEST]: 'Accès limité aux événements publics'
} as const;

export const DEFAULT_USER_ROLE = UserRole.PARTICIPANT;

export const ROLE_HIERARCHY = {
  [UserRole.SUPER_ADMIN]: [UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MANAGER, UserRole.PARTICIPANT, UserRole.GUEST],
  [UserRole.ADMIN]: [UserRole.ORGANIZER, UserRole.MANAGER, UserRole.PARTICIPANT, UserRole.GUEST],
  [UserRole.ORGANIZER]: [UserRole.MANAGER, UserRole.PARTICIPANT, UserRole.GUEST],
  [UserRole.MANAGER]: [UserRole.PARTICIPANT, UserRole.GUEST],
  [UserRole.PARTICIPANT]: [UserRole.GUEST],
  [UserRole.GUEST]: []
} as const;

// Rôles qui peuvent créer d'autres utilisateurs
export const ROLES_CAN_CREATE_USERS = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.ORGANIZER,
  UserRole.MANAGER
] as const;

// Rôles qui peuvent gérer les événements
export const ROLES_CAN_MANAGE_EVENTS = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.ORGANIZER
] as const;