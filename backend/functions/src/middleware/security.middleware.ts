// backend/functions/src/middleware/security.middleware.ts - Middleware de sécurité centralisé

import { NextFunction, Request, Response } from 'express';
// Note: Ces imports nécessitent l'installation des packages correspondants
// npm install express-rate-limit helmet cors
// import rateLimit from 'express-rate-limit';
// import helmet from 'helmet';
// import cors from 'cors';
import { RATE_LIMIT_CONFIG, SECURITY_HEADERS, SecurityUtils } from '../config/security.config';
import { extractClientIp } from '../utils/ip-utils';

/**
 * Middleware de headers de sécurité (version simplifiée sans helmet)
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Ajouter les headers de sécurité manuellement
  Object.entries(SECURITY_HEADERS.SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
};

/**
 * Configuration CORS sécurisée (version simplifiée sans cors package)
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin');
  
  // Vérifier l'origine
  if (!origin || SECURITY_HEADERS.CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', SECURITY_HEADERS.CORS_METHODS.join(', '));
    res.setHeader('Access-Control-Allow-Headers', SECURITY_HEADERS.CORS_HEADERS.join(', '));
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Gérer les requêtes OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return next();
};

/**
 * Rate limiting pour les connexions (version simplifiée)
 */
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

export const loginRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = extractClientIp(req);
  const now = Date.now();
  const windowMs = RATE_LIMIT_CONFIG.LOGIN.windowMs;
  const maxAttempts = RATE_LIMIT_CONFIG.LOGIN.max;
  
  const attempts = loginAttempts.get(clientIp);
  
  if (!attempts || now > attempts.resetTime) {
    loginAttempts.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }
  
  if (attempts.count >= maxAttempts) {
    return res.status(429).json({
      success: false,
      error: RATE_LIMIT_CONFIG.LOGIN.message
    });
  }
  
  attempts.count++;
  next();
};

/**
 * Rate limiting pour les inscriptions (version simplifiée)
 */
const registerAttempts = new Map<string, { count: number; resetTime: number }>();

export const registerRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = extractClientIp(req);
  const now = Date.now();
  const windowMs = RATE_LIMIT_CONFIG.REGISTER.windowMs;
  const maxAttempts = RATE_LIMIT_CONFIG.REGISTER.max;
  
  const attempts = registerAttempts.get(clientIp);
  
  if (!attempts || now > attempts.resetTime) {
    registerAttempts.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }
  
  if (attempts.count >= maxAttempts) {
    return res.status(429).json({
      success: false,
      error: RATE_LIMIT_CONFIG.REGISTER.message
    });
  }
  
  attempts.count++;
  next();
};

/**
 * Rate limiting pour la réinitialisation de mot de passe
 */
const passwordResetAttempts = new Map<string, { count: number; resetTime: number }>();

export const passwordResetRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = extractClientIp(req);
  const now = Date.now();
  const windowMs = RATE_LIMIT_CONFIG.PASSWORD_RESET.windowMs;
  const maxAttempts = RATE_LIMIT_CONFIG.PASSWORD_RESET.max;
  
  const attempts = passwordResetAttempts.get(clientIp);
  
  if (!attempts || now > attempts.resetTime) {
    passwordResetAttempts.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }
  
  if (attempts.count >= maxAttempts) {
    return res.status(429).json({
      success: false,
      error: RATE_LIMIT_CONFIG.PASSWORD_RESET.message
    });
  }
  
  attempts.count++;
  next();
};

/**
 * Rate limiting général pour l'API
 */
const apiAttempts = new Map<string, { count: number; resetTime: number }>();

export const apiRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = extractClientIp(req);
  const now = Date.now();
  const windowMs = RATE_LIMIT_CONFIG.API_GENERAL.windowMs;
  const maxAttempts = RATE_LIMIT_CONFIG.API_GENERAL.max;
  
  const attempts = apiAttempts.get(clientIp);
  
  if (!attempts || now > attempts.resetTime) {
    apiAttempts.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }
  
  if (attempts.count >= maxAttempts) {
    return res.status(429).json({
      success: false,
      error: RATE_LIMIT_CONFIG.API_GENERAL.message
    });
  }
  
  attempts.count++;
  next();
};

/**
 * Middleware de validation des entrées
 */
export const inputSanitization = (req: Request, res: Response, next: NextFunction) => {
  // Sanitiser les entrées pour prévenir les attaques XSS
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Middleware de logging de sécurité
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const clientIp = extractClientIp(req);
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  // Log des requêtes sensibles
  const sensitiveEndpoints = ['/auth/login', '/auth/register', '/auth/reset-password'];
  const isSensitive = sensitiveEndpoints.some(endpoint => req.path.includes(endpoint));
  
  if (isSensitive) {
    console.log(`[SECURITY] ${req.method} ${req.path} - IP: ${clientIp} - UA: ${userAgent}`);
  }
  
  // Intercepter la réponse pour logger les erreurs de sécurité
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    if (res.statusCode >= 400) {
      console.log(`[SECURITY] ${req.method} ${req.path} - ${res.statusCode} - ${responseTime}ms - IP: ${clientIp}`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware de détection d'attaques
 */
export const attackDetection = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = extractClientIp(req);
  const userAgent = req.get('User-Agent') || '';
  const path = req.path;
  
  // Détection de patterns d'attaque courants
  const suspiciousPatterns = [
    /(\.\.\/){2,}/,  // Path traversal
    /<script/i,     // XSS
    /union.*select/i, // SQL injection
    /javascript:/i,   // JavaScript injection
    /vbscript:/i,     // VBScript injection
  ];
  
  const requestString = JSON.stringify(req.body) + req.url + userAgent;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      console.warn(`[SECURITY ALERT] Suspicious request detected - IP: ${clientIp} - Pattern: ${pattern} - Path: ${path}`);
      
      return res.status(403).json({
        success: false,
        error: 'Requête suspecte détectée'
      });
    }
  }
  
  return next();
};

/**
 * Middleware de vérification des permissions
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise'
      });
    }
    
    if (!SecurityUtils.hasPermission(user.role, permission)) {
      console.warn(`[SECURITY] Permission denied - User: ${user.uid} - Permission: ${permission} - IP: ${extractClientIp(req)}`);
      
      return res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes'
      });
    }
    
    return next();
  };
};

/**
 * Middleware de vérification du rôle minimum
 */
export const requireMinimumRole = (minimumRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise'
      });
    }
    
    if (!SecurityUtils.hasMinimumRole(user.role, minimumRole as any)) {
      console.warn(`[SECURITY] Role check failed - User: ${user.uid} - Required: ${minimumRole} - IP: ${extractClientIp(req)}`);
      
      return res.status(403).json({
        success: false,
        error: 'Rôle insuffisant'
      });
    }
    
    return next();
  };
};

/**
 * Bundle de middlewares de sécurité de base
 */
export const basicSecurity = [
  securityHeaders,
  corsMiddleware,
  inputSanitization,
  securityLogger,
  attackDetection
];

/**
 * Bundle de middlewares pour les endpoints d'authentification
 */
export const authSecurity = [
  ...basicSecurity,
  loginRateLimit
];

export default {
  securityHeaders,
  corsMiddleware,
  loginRateLimit,
  registerRateLimit,
  passwordResetRateLimit,
  apiRateLimit,
  inputSanitization,
  securityLogger,
  attackDetection,
  requirePermission,
  requireMinimumRole,
  basicSecurity,
  authSecurity
};