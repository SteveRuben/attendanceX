// shared/src/validators/user-validator.ts
import { z } from 'zod';
import { UserStatus } from '../types/user.types';
import {UserRole} from '../types/role.types';
import { 
  baseIdSchema, 
  emailSchema, 
  phoneSchema, 
  passwordSchema,
  userPreferencesSchema,
  validateAndFormat
} from './common-validator';

// Énums pour la validation
const userRoleSchema = z.nativeEnum(UserRole);
const userStatusSchema = z.nativeEnum(UserStatus);

// Schéma complet utilisateur
export const userSchema = z.object({
  id: baseIdSchema,
  email: emailSchema,
  displayName: z.string().min(1, 'Nom d\'affichage requis').max(100, 'Nom trop long'),
  firstName: z.string().min(1, 'Prénom requis').max(50, 'Prénom trop long'),
  lastName: z.string().min(1, 'Nom requis').max(50, 'Nom trop long'),
  role: userRoleSchema,
  status: userStatusSchema,
  permissions: z.object({
    canCreateEvents: z.boolean(),
    canManageUsers: z.boolean(),
    canViewReports: z.boolean(),
    canManageSettings: z.boolean(),
    canSendNotifications: z.boolean(),
    canExportData: z.boolean(),
    canManageRoles: z.boolean(),
    canAccessAnalytics: z.boolean(),
    canModerateContent: z.boolean(),
    canManageIntegrations: z.boolean()
  }),
  profile: z.object({
    avatar: z.string().url().optional(),
    phone: phoneSchema.optional(),
    bio: z.string().max(500, 'Biographie trop longue').optional(),
    department: z.string().max(100, 'Département trop long').optional(),
    position: z.string().max(100, 'Poste trop long').optional(),
    preferences: userPreferencesSchema
  }).optional(),
  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  twoFactorEnabled: z.boolean().default(false),
  lastLoginAt: z.date().optional(),
  loginCount: z.number().int().min(0).default(0),
  failedLoginAttempts: z.number().int().min(0).default(0),
  lockedUntil: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Schéma pour créer un utilisateur
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1, 'Nom d\'affichage requis').max(100),
  firstName: z.string().min(1, 'Prénom requis').max(50),
  lastName: z.string().min(1, 'Nom requis').max(50),
  role: userRoleSchema.default(UserRole.PARTICIPANT),
  phone: phoneSchema.optional(),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  sendWelcomeEmail: z.boolean().default(true)
});

// Schéma pour mettre à jour un utilisateur
export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  phone: phoneSchema.optional(),
  bio: z.string().max(500).optional(),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  avatar: z.string().url().optional(),
  preferences: userPreferencesSchema.partial().optional()
});

// Schéma pour la recherche d'utilisateurs
export const searchUsersSchema = z.object({
  query: z.string().min(1, 'Terme de recherche requis'),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  department: z.string().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

// Fonctions de validation
export function validateUser(data: unknown) {
  return validateAndFormat(userSchema, data);
}

export function validateCreateUser(data: unknown) {
  return validateAndFormat(createUserSchema, data);
}

export function validateUpdateUser(data: unknown) {
  return validateAndFormat(updateUserSchema, data);
}

export function validateSearchUsers(data: unknown) {
  return validateAndFormat(searchUsersSchema, data);
}

// Validation spécifique pour les emails
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

// Validation spécifique pour les mots de passe
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const result = passwordSchema.safeParse(password);
  
  if (result.success) {
    return { isValid: true, errors: [] };
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => err.message)
  };
}