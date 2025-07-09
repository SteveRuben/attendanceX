// ==========================================
// 4. VALIDATION - validation.ts
// ==========================================

import {Request, Response, NextFunction} from "express";
import {body, param, query, validationResult, ValidationChain} from "express-validator";
import {logger} from "firebase-functions";
import { ZodSchema } from 'zod';

/**
 * Middleware de validation générique
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Exécuter toutes les validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().reduce((acc, error) => {
        const field = error.type === "field" ? error.path : "unknown";
        if (!acc[field]) {
          acc[field] = [];
        }
        acc[field].push(error.msg);
        return acc;
      }, {} as Record<string, string[]>);

      logger.warn("Validation failed", {
        errors: formattedErrors,
        body: req.body,
        params: req.params,
        query: req.query,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Données invalides",
        errors: formattedErrors,
      });
    }

    return next();
  };
};

export function validateParams<T>(
  schema: ZodSchema<T>
){
  return (req: Request, res: Response, next: NextFunction) => {
    let processedParams = req.params;
    const result = schema.safeParse(processedParams);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.errors.map(err => err.message),
        timestamp: new Date().toISOString()
      });
    }
    return next();
  }
}

/**
 * Validation des query parameters (req.query)
 * @param query - Query parameters à valider (req.query)
 * @param schema - Schéma Zod
 * @param options - Options de validation
 * @returns Résultat de validation typé
 */
export function validateZQuery<T>(
  query: any,
  schema: ZodSchema<T>
): {isValid: boolean; errors: string[]} {
  try {
    const options = {
      errorFormat: 'simple',
      coerceTypes: true,
      allowEmpty: true,
      trimStrings: true,
      allowExtraFields: true,
      arrayDelimiter: ','
    };


    // Pré-traitement des query parameters
    const processedQuery = preprocessQueryParams(query, {
      coerceTypes: options.coerceTypes,
      trimStrings: options.trimStrings,
      arrayDelimiter: options.arrayDelimiter
    });

    // Validation avec Zod
    const result = schema.safeParse(processedQuery);

    if (result.success) {
      return {
        isValid: true,
        errors: []
      };
    } else {
      
      return {
        isValid: false,
        errors:result.error.errors.map(err => err.message),
      };
    }

  } catch (error) {
    console.error('Query validation error:', error);
    return {
      isValid: false,
      errors: ['Erreur interne lors de la validation des query parameters']
    };
  }
}

/**
 * Middleware Express pour validation des query parameters
 */
export function validateQuery<T>(
  schema: ZodSchema<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validation = validateZQuery(req.query, schema);

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        code: 'QUERY_VALIDATION_ERROR',
        details: validation.errors,
        timestamp: new Date().toISOString()
      });
    }

    // Remplacer les query params par les données validées
    return next();
  };
}

/**
 * Pré-traitement des query parameters
 */
function preprocessQueryParams(
  query: any,
  options: {
    coerceTypes: boolean;
    trimStrings: boolean;
    arrayDelimiter: string;
  }
): any {
  const processed: any = {};

  Object.entries(query).forEach(([key, value]) => {
    let processedValue = value;

    // Traitement des chaînes
    if (typeof processedValue === 'string' && options.trimStrings) {
      processedValue = processedValue.trim();
    }

    // Conversion des types si activée
    if (options.coerceTypes && typeof processedValue === 'string') {
      // Conversion des booléens
      if (processedValue === 'true') {
        processedValue = true;
      } else if (processedValue === 'false') {
        processedValue = false;
      }
      // Conversion des nombres
      else if (/^\d+$/.test(processedValue)) {
        processedValue = parseInt(processedValue, 10);
      } else if (/^\d*\.\d+$/.test(processedValue)) {
        processedValue = parseFloat(processedValue);
      }
      // Conversion des arrays (délimiteur par défaut: virgule)
      else if (processedValue.includes(options.arrayDelimiter)) {
        processedValue = processedValue.split(options.arrayDelimiter).map((item: string) => {
          const trimmed = item.trim();
          // Conversion récursive des éléments d'array
          if (trimmed === 'true') return true;
          if (trimmed === 'false') return false;
          if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
          if (/^\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
          return trimmed;
        });
      }
    }

    processed[key] = processedValue;
  });

  return processed;
}

export function validateBody<T>(
  schema: ZodSchema<T>
){
  return (req: Request, res: Response, next: NextFunction) => {
    const validation = validateZBody(req.body, schema);

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.errors,
        timestamp: new Date().toISOString()
      });
    }

    return next();
  };
}

export function validateZBody<T>(
  body: any, 
  schema: ZodSchema<T>
): {isValid: boolean; errors: string[];} {
  try {
    // Validation avec Zod
    const result = schema.safeParse(body);

    if (result.success) {
      return {
        isValid: true,
        errors: []
      };
    } else {
  
      return {
        isValid: false,
        errors: result.error.errors.map(err => err.message)
      };
    }

  } catch (error) {
    console.error('Validation error:', error);
    return {
      isValid: false,
      errors: ['Erreur interne lors de la validation']
    };
  }
}

/**
 * Validations communes
 */
export const commonValidations = {
  // Email
  email: body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Email invalide"),

  // Mot de passe
  password: body("password")
    .isLength({min: 8, max: 128})
    .withMessage("Le mot de passe doit contenir entre 8 et 128 caractères")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial"),

  // Nom
  name: body("name")
    .trim()
    .isLength({min: 2, max: 100})
    .withMessage("Le nom doit contenir entre 2 et 100 caractères")
    .matches(/^[a-zA-ZÀ-ÿ\s\-']+$/)
    .withMessage("Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes"),

  // Téléphone
  phone: body("phoneNumber")
    .optional()
    .isMobilePhone("any")
    .withMessage("Numéro de téléphone invalide"),

  // ID MongoDB/Firestore
  id: param("id")
    .isLength({min: 1, max: 50})
    .withMessage("ID invalide"),

  // Date
  date: body("date")
    .isISO8601()
    .toDate()
    .withMessage("Date invalide (format ISO 8601 requis)"),

  // Pagination
  page: query("page")
    .optional()
    .isInt({min: 1})
    .toInt()
    .withMessage("Numéro de page invalide"),

  limit: query("limit")
    .optional()
    .isInt({min: 1, max: 100})
    .toInt()
    .withMessage("Limite invalide (1-100)"),

  // URL
  url: body("url")
    .optional()
    .isURL()
    .withMessage("URL invalide"),
};

/**
 * Validations spécifiques aux événements
 */
export const eventValidations = {
  createEvent: [
    body("title")
      .trim()
      .isLength({min: 3, max: 200})
      .withMessage("Le titre doit contenir entre 3 et 200 caractères"),

    body("description")
      .trim()
      .isLength({min: 10, max: 2000})
      .withMessage("La description doit contenir entre 10 et 2000 caractères"),

    body("startDateTime")
      .isISO8601()
      .toDate()
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error("La date de début doit être dans le futur");
        }
        return true;
      }),

    body("endDateTime")
      .isISO8601()
      .toDate()
      .custom((value, {req}) => {
        if (new Date(value) <= new Date(req.body.startDateTime)) {
          throw new Error("La date de fin doit être après la date de début");
        }
        return true;
      }),

    body("type")
      .isIn(["meeting", "training", "conference", "workshop", "seminar", "other"])
      .withMessage("Type d'événement invalide"),

    body("participants")
      .isArray({min: 1})
      .withMessage("Au moins un participant requis"),

    body("location.type")
      .isIn(["physical", "virtual", "hybrid"])
      .withMessage("Type de lieu invalide"),

    body("maxParticipants")
      .optional()
      .isInt({min: 1, max: 10000})
      .withMessage("Nombre maximum de participants invalide"),
  ],
};

/**
 * Validations spécifiques aux utilisateurs
 */
export const userValidations = {
  createUser: [
    commonValidations.email,
    body("displayName")
      .trim()
      .isLength({min: 2, max: 100})
      .withMessage("Le nom d'affichage doit contenir entre 2 et 100 caractères"),

    body("firstName")
      .trim()
      .isLength({min: 1, max: 50})
      .withMessage("Le prénom est requis (max 50 caractères)"),

    body("lastName")
      .trim()
      .isLength({min: 1, max: 50})
      .withMessage("Le nom est requis (max 50 caractères)"),

    body("role")
      .isIn(["super_admin", "admin", "organizer", "manager", "participant"])
      .withMessage("Rôle invalide"),

    commonValidations.phone,
  ],

  updateProfile: [
    body("displayName")
      .optional()
      .trim()
      .isLength({min: 2, max: 100})
      .withMessage("Le nom d'affichage doit contenir entre 2 et 100 caractères"),

    body("bio")
      .optional()
      .trim()
      .isLength({max: 500})
      .withMessage("La bio ne peut pas dépasser 500 caractères"),

    commonValidations.phone,
  ],
};

/**
 * Validations pour l'authentification
 */
export const authValidations = {
  login: [
    commonValidations.email,
    body("password")
      .notEmpty()
      .withMessage("Mot de passe requis"),
  ],

  register: [
    commonValidations.email,
    commonValidations.password,
    commonValidations.name,
  ],

  resetPassword: [
    body("token")
      .notEmpty()
      .withMessage("Token requis"),
    commonValidations.password,
  ],
};

/**
 * Validations pour les présences
 */
export const attendanceValidations = {
  markAttendance: [
    body("eventId")
      .notEmpty()
      .withMessage("ID de l'événement requis"),

    body("method")
      .isIn(["qr_code", "geolocation", "manual", "biometric"])
      .withMessage("Méthode de check-in invalide"),

    body("location")
      .optional()
      .custom((value) => {
        if (value && (!value.latitude || !value.longitude)) {
          throw new Error("Latitude et longitude requises pour la géolocalisation");
        }
        return true;
      }),
  ],
};

/**
 * Sanitisation des données
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Supprimer les propriétés dangereuses
  const dangerousKeys = ["__proto__", "constructor", "prototype"];

  const sanitizeObject = (obj: any): any => {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!dangerousKeys.includes(key)) {
        sanitized[key] = sanitizeObject(value);
      }
    }

    return sanitized;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

/**
 * Validation personnalisée pour les fichiers
 */
export const validateFileUpload = (
  allowedTypes: string[],
  maxSize: number = 10 * 1024 * 1024 // 10MB par défaut
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Fichier requis",
      });
    }

    // Vérifier le type
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(", ")}`,
      });
    }

    // Vérifier la taille
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: `Fichier trop volumineux. Taille maximum: ${Math.round(maxSize / 1024 / 1024)}MB`,
      });
    }

    return next();
  };
};
