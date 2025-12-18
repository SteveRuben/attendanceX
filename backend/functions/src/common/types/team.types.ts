// shared/src/types/team.types.ts - Types pour la gestion des équipes

import { BaseEntity } from './common.types';
import { Permission } from './role.types';

export interface Team extends BaseEntity {
  id: string;
  tenantId: string;
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

export interface TeamMember extends BaseEntity {
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

