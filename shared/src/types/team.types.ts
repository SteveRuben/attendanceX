// shared/src/types/team.types.ts - Types pour la gestion des équipes

import { BaseEntity } from './common.types';
import { OrganizationRole } from './organization.types';
import { Permission, UserRole } from './role.types';

export interface Team extends BaseEntity {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  department?: string;
  managerId: string; // Chef d'équipe
  members: string[]; // IDs des utilisateurs
  permissions: Permission[]; // Permissions spécifiques à l'équipe
  settings: TeamSettings;
  isActive: boolean;
}

export interface TeamSettings {
  canValidateAttendance: boolean;
  canCreateEvents: boolean;
  canInviteParticipants: boolean;
  canViewAllEvents: boolean;
  canExportData: boolean;
  maxEventsPerMonth?: number;
  allowedEventTypes?: string[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
  isActive: boolean;
  permissions: Permission[];
}

export enum TeamRole {
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  department?: string;
  managerId: string;
  settings: Partial<TeamSettings>;
  initialMembers?: string[];
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  department?: string;
  managerId?: string;
  settings?: Partial<TeamSettings>;
}

export interface TeamStats {
  memberCount: number;
  activeMembers: number;
  eventsCreated: number;
  attendanceValidations: number;
  lastActivity: Date;
}

// Extension de OrganizationUser pour support multi-équipes
export interface OrganizationUser {
  id: string;
  userId: string;
  organizationId: string;
  systemRole: UserRole; // Rôle système (CONTRIBUTOR par défaut)
  organizationRole: OrganizationRole; // Rôle dans l'organisation
  teams: string[]; // IDs des équipes auxquelles il appartient
  primaryTeamId?: string; // Équipe principale
  permissions: Permission[]; // Permissions calculées
  canValidateAttendance: boolean; // Calculé selon les équipes et rôles
  isActive: boolean;
  joinedAt: Date;
  lastActiveAt?: Date;
  department?: string;
  jobTitle?: string;
  metadata: Record<string, any>;
}