/**
 * Schémas de validation pour les invitations utilisateurs
 */

import { z } from 'zod';

// Schéma pour inviter un utilisateur unique
export const inviteUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must not exceed 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must not exceed 50 characters'),
  role: z.enum(['admin', 'manager', 'user', 'viewer'], {
    errorMap: () => ({ message: 'Invalid role' })
  }),
  department: z.string().max(100, 'Department must not exceed 100 characters').optional(),
  message: z.string().max(500, 'Message must not exceed 500 characters').optional(),
  permissions: z.array(z.string()).optional()
});

// Schéma pour les invitations en lot
export const bulkInviteSchema = z.object({
  invitations: z.array(inviteUserSchema).min(1, 'At least one invitation is required').max(100, 'Maximum 100 invitations allowed'),
  customMessage: z.string().max(500, 'Custom message must not exceed 500 characters').optional(),
  sendWelcomeEmail: z.boolean().optional()
});

// Schéma pour l'import CSV
export const csvImportSchema = z.object({
  defaultRole: z.enum(['admin', 'manager', 'user', 'viewer']).optional(),
  customMessage: z.string().max(500, 'Custom message must not exceed 500 characters').optional()
});

// Schéma pour les filtres de recherche d'invitations
export const invitationFiltersSchema = z.object({
  status: z.enum(['pending', 'accepted', 'declined', 'expired', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'email', 'status', 'role']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Schéma pour accepter une invitation
export const acceptInvitationSchema = z.object({
  token: z.string().min(32, 'Invalid invitation token').max(128, 'Invalid invitation token'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
  acceptTerms: z.literal('true', {
    errorMap: () => ({ message: 'Terms of service must be accepted' })
  }),
  marketingConsent: z.boolean().optional()
});

// Schéma pour décliner une invitation
export const declineInvitationSchema = z.object({
  token: z.string().min(32, 'Invalid invitation token').max(128, 'Invalid invitation token'),
  reason: z.string().max(500, 'Reason must not exceed 500 characters').optional()
});

// Schéma pour valider un token d'invitation
export const validateTokenSchema = z.object({
  token: z.string().min(32, 'Invalid invitation token').max(128, 'Invalid invitation token')
});