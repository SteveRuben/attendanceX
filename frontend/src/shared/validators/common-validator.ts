// shared/src/validators/common-validator.ts
import { z } from 'zod';

// Schémas de base réutilisables
export const baseIdSchema = z.string().min(1, 'ID requis');
export const emailSchema = z.string().email('Email invalide');
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Numéro de téléphone invalide');
export const urlSchema = z.string().url('URL invalide');
export const dateSchema = z.date();
export const timestampSchema = z.union([z.date(), z.string().datetime()]);

// Schémas pour la pagination
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

// Schémas pour les coordonnées GPS
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional()
});

// Schémas pour les adresses
export const addressSchema = z.object({
  street: z.string().min(1, 'Rue requise'),
  city: z.string().min(1, 'Ville requise'),
  postalCode: z.string().min(1, 'Code postal requis'),
  country: z.string().min(2, 'Pays requis').max(2, 'Code pays sur 2 caractères'),
  region: z.string().optional(),
  coordinates: coordinatesSchema.optional()
});

// Validation des mots de passe
export const passwordSchema = z.string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .regex(/^(?=.*[a-z])/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/^(?=.*[A-Z])/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/^(?=.*\d)/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])/, 'Le mot de passe doit contenir au moins un caractère spécial');

// Validation des fichiers uploadés
export const fileUploadSchema = z.object({
  filename: z.string().min(1, 'Nom de fichier requis'),
  mimeType: z.string().min(1, 'Type MIME requis'),
  size: z.number().positive().max(10 * 1024 * 1024, 'Fichier trop volumineux (max 10MB)'),
  url: urlSchema.optional()
});

// Schémas pour les préférences utilisateur
export const userPreferencesSchema = z.object({
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  pushNotifications: z.boolean().default(true),
  language: z.enum(['fr', 'en', 'es', 'de']).default('fr'),
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  timezone: z.string().default('Europe/Paris'),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).default('DD/MM/YYYY'),
  timeFormat: z.enum(['12h', '24h']).default('24h'),
  weekStartsOn: z.number().int().min(0).max(6).default(1) // 0 = dimanche, 1 = lundi
});

// Utilitaires de validation
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function createValidationError(field: string, message: string): ValidationError {
  return new ValidationError(message, field);
}

// Fonction helper pour valider et formater les erreurs
export function validateAndFormat<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string; code: string }>;
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));
  
  return { success: false, errors };
}