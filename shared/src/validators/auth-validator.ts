// shared/src/validators/auth-validator.ts
import { z } from 'zod';
import { emailSchema, passwordSchema, validateAndFormat } from './common-validator';

// Schéma pour la connexion
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis'),
  rememberMe: z.boolean().default(false),
  captcha: z.string().optional()
});

// Schéma pour l'inscription
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'Prénom requis').max(50),
  lastName: z.string().min(1, 'Nom requis').max(50),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Vous devez accepter les conditions d\'utilisation'
  }),
  captcha: z.string().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
});

// Schéma pour la réinitialisation de mot de passe
export const passwordResetSchema = z.object({
  email: emailSchema,
  captcha: z.string().optional()
});

// Schéma pour confirmer la réinitialisation
export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
});

// Schéma pour changer le mot de passe
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'Le nouveau mot de passe doit être différent de l\'ancien',
  path: ['newPassword']
});

// Schéma pour la vérification 2FA
export const twoFactorSchema = z.object({
  code: z.string().length(6, 'Code à 6 chiffres requis').regex(/^\d+$/, 'Code numérique uniquement'),
  backupCode: z.string().optional()
}).refine(data => data.code || data.backupCode, {
  message: 'Code de vérification ou code de secours requis'
});

// Fonctions de validation
export function validateLogin(data: unknown) {
  return validateAndFormat(loginSchema, data);
}

export function validateRegister(data: unknown) {
  return validateAndFormat(registerSchema, data);
}

export function validatePasswordReset(data: unknown) {
  return validateAndFormat(passwordResetSchema, data);
}

export function validateConfirmPasswordReset(data: unknown) {
  return validateAndFormat(confirmPasswordResetSchema, data);
}

export function validateChangePassword(data: unknown) {
  return validateAndFormat(changePasswordSchema, data);
}

export function validateTwoFactor(data: unknown) {
  return validateAndFormat(twoFactorSchema, data);
}