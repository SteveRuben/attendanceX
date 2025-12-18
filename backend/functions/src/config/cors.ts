// config/cors.ts - Configuration CORS centralisée avec middleware ultra-agressif
import { CorsOptions } from "cors";
import * as logger from "firebase-functions/logger";
import { appConfig } from "./app";

/**
 * Liste des domaines autorisés
 * Centralisée et réutilisable
 */
const getAllowedOrigins = (): string[] => {
  const baseOrigins = [
    "http://localhost:3000",
    "http://localhost:5173", 
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "https://attendance-app.web.app"
  ];

  // Ajouter les origines depuis les variables d'environnement
  const envOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_PROD,
    process.env.ADDITIONAL_ORIGINS
  ].filter(Boolean) as string[];

  // Gérer ADDITIONAL_ORIGINS s'il contient plusieurs URLs séparées par des virgules
  const additionalOrigins = process.env.ADDITIONAL_ORIGINS
    ?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean) || [];

  return [...baseOrigins, ...envOrigins, ...additionalOrigins];
};

/**
 * Fonction de validation d'origine centralisée
 */
const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) {
    // Autoriser les requêtes sans origine (Postman, curl, etc.)
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  
  // Vérification exacte
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // En développement, autoriser tous les localhost/127.0.0.1
  if (appConfig.isDevelopment && 
      (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return true;
  }

  return false;
};

/**
 * Headers autorisés centralisés
 */
const getAllowedHeaders = (): string[] => [
  "Content-Type",
  "Authorization", 
  "X-Requested-With",
  "Accept",
  "Origin",
  "Cache-Control",
  "X-Request-ID",
  "X-Client-Version",
  "X-API-Key"
];

/**
 * Méthodes HTTP autorisées
 */
const getAllowedMethods = (): string[] => [
  "GET", 
  "POST", 
  "PUT", 
  "DELETE", 
  "PATCH", 
  "OPTIONS"
];

/**
 * Configuration CORS principale
 */
const createCorsOptions = (): CorsOptions => ({
  origin: (origin, callback) => {
    const originInfo = origin || 'no-origin';
    logger.info('🌐 CORS Origin Check', {
      origin: originInfo,
      environment: appConfig.environment,
      isDevelopment: appConfig.isDevelopment
    });

    if (isOriginAllowed(origin)) {
      logger.info('✅ CORS Origin Allowed', {
        origin: originInfo,
        allowed: true
      });
      return callback(null, true);
    }

    logger.warn('❌ CORS Origin Blocked', {
      origin: originInfo,
      allowedOrigins: getAllowedOrigins(),
      environment: appConfig.environment
    });
    
    return callback(
      new Error(`CORS non autorisé pour cette origine: ${originInfo}`),
      false
    );
  },
  methods: getAllowedMethods(),
  allowedHeaders: getAllowedHeaders(),
  credentials: true, // CRITIQUE: Nécessaire pour les cookies/auth
  maxAge: appConfig.isDevelopment ? 300 : 86400, // Cache plus court en dev
  preflightContinue: false,
  optionsSuccessStatus: 204
});

/**
 * Configuration CORS exportée
 */
export const corsOptions = createCorsOptions();

/**
 * Middleware CORS ULTRA-AGRESSIF principal
 * À utiliser en premier dans l'application
 */
export const corsUltraAggressiveMiddleware = (req: any, res: any, next: any) => {
  const origin = req.get('Origin');
  
  logger.info('🚨 CORS ULTRA-AGRESSIF', {
    method: req.method,
    url: req.url,
    origin: origin || 'no-origin',
    timestamp: new Date().toISOString()
  });
  
  // FORCER TOUS LES HEADERS CORS SANS EXCEPTION
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  }
  
  // FORCER CREDENTIALS - C'EST LE HEADER CRITIQUE MANQUANT
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', getAllowedMethods().join(','));
  res.setHeader('Access-Control-Allow-Headers', getAllowedHeaders().join(','));
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // LOG DÉTAILLÉ POUR VÉRIFIER
  logger.info('🚨 CORS Headers Forcés', {
    method: req.method,
    url: req.url,
    origin: origin || 'no-origin',
    headersSet: {
      'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials'),
      'Access-Control-Allow-Methods': res.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': res.get('Access-Control-Allow-Headers')
    }
  });
  
  // GESTION OPTIONS IMMÉDIATE
  if (req.method === 'OPTIONS') {
    logger.info('🚨 OPTIONS Request Handled Immediately', {
      origin: origin || 'no-origin',
      finalHeaders: {
        'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials'),
        'Access-Control-Allow-Methods': res.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': res.get('Access-Control-Allow-Headers')
      }
    });
    return res.status(204).end();
  }
  
  next();
};

/**
 * Middleware de protection contre l'écrasement des headers CORS
 */
export const corsProtectionMiddleware = (req: any, res: any, next: any) => {
  // Intercepter toutes les méthodes qui pourraient écraser les headers
  const originalSetHeader = res.setHeader;
  const originalSet = res.set;
  const originalHeader = res.header;
  
  logger.debug('🛡️ CORS Protection Middleware activé', {
    url: req.url,
    method: req.method
  });
  
  res.setHeader = function(name: string, value: string | string[]) {
    if (name.toLowerCase() === 'access-control-allow-credentials' && value !== 'true') {
      logger.warn('🚨 TENTATIVE ÉCRASEMENT ACCESS-CONTROL-ALLOW-CREDENTIALS via setHeader', {
        url: req.url,
        tentativeValue: value,
        forcedValue: 'true'
      });
      return originalSetHeader.call(this, name, 'true');
    }
    if (name.toLowerCase() === 'access-control-allow-origin' && !value) {
      logger.warn('🚨 TENTATIVE SUPPRESSION ACCESS-CONTROL-ALLOW-ORIGIN via setHeader', {
        url: req.url,
        tentativeValue: value,
        origin: req.get('Origin')
      });
      return originalSetHeader.call(this, name, req.get('Origin') || 'http://localhost:3000');
    }
    return originalSetHeader.call(this, name, value);
  };
  
  res.set = function(field: any, val?: any) {
    if (typeof field === 'object') {
      const corsKeys = Object.keys(field).filter(key => 
        key.toLowerCase().startsWith('access-control-')
      );
      
      if (corsKeys.length > 0) {
        logger.warn('🚨 TENTATIVE ÉCRASEMENT CORS HEADERS via set()', {
          url: req.url,
          corsKeys,
          values: corsKeys.reduce((acc, key) => ({ ...acc, [key]: field[key] }), {})
        });
        
        // Forcer les bonnes valeurs
        field['access-control-allow-credentials'] = 'true';
        if (!field['access-control-allow-origin']) {
          field['access-control-allow-origin'] = req.get('Origin') || 'http://localhost:3000';
        }
      }
    }
    return originalSet.call(this, field, val);
  };
  
  res.header = function(field: string, val?: any) {
    if (field.toLowerCase() === 'access-control-allow-credentials' && val !== 'true') {
      logger.warn('🚨 TENTATIVE ÉCRASEMENT ACCESS-CONTROL-ALLOW-CREDENTIALS via header()', {
        url: req.url,
        field,
        tentativeValue: val,
        forcedValue: 'true'
      });
      return originalHeader.call(this, field, 'true');
    }
    return originalHeader.call(this, field, val);
  };
  
  next();
};

/**
 * Middleware CORS manuel de secours
 * À utiliser après le middleware cors() principal
 */
export const corsBackupMiddleware = (req: any, res: any, next: any) => {
  const origin = req.get('Origin');
  
  logger.debug('🔧 CORS Backup Middleware Check', {
    origin: origin || 'no-origin',
    hasExistingOriginHeader: !!res.get('Access-Control-Allow-Origin'),
    hasExistingCredentialsHeader: !!res.get('Access-Control-Allow-Credentials')
  });
  
  // Vérifier et forcer les headers manquants
  if (!res.get('Access-Control-Allow-Origin') && origin && isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    logger.info('🔧 CORS Backup: Origin header ajouté', { origin });
  }
  
  if (!res.get('Access-Control-Allow-Credentials')) {
    res.header('Access-Control-Allow-Credentials', 'true');
    logger.info('🔧 CORS Backup: Credentials header ajouté');
  }
  
  if (!res.get('Access-Control-Allow-Methods')) {
    res.header('Access-Control-Allow-Methods', getAllowedMethods().join(','));
    logger.info('🔧 CORS Backup: Methods header ajouté');
  }
  
  if (!res.get('Access-Control-Allow-Headers')) {
    res.header('Access-Control-Allow-Headers', getAllowedHeaders().join(','));
    logger.info('🔧 CORS Backup: Headers header ajouté');
  }
  
  next();
};

/**
 * Middleware de debug des headers de réponse
 */
export const corsDebugMiddleware = (req: any, res: any, next: any) => {
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  const logFinalHeaders = () => {
    logger.debug('📤 Final CORS Headers', {
      method: req.method,
      url: req.url,
      requestOrigin: req.get('Origin'),
      responseHeaders: {
        'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin') || 'NOT SET',
        'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials') || 'NOT SET',
        'Access-Control-Allow-Methods': res.get('Access-Control-Allow-Methods') || 'NOT SET',
        'Access-Control-Allow-Headers': res.get('Access-Control-Allow-Headers') || 'NOT SET'
      }
    });
  };

  res.send = function(body: any) {
    logFinalHeaders();
    return originalSend.call(this, body);
  };

  res.json = function(obj: any) {
    logFinalHeaders();
    return originalJson.call(this, obj);
  };

  res.end = function(chunk?: any, encoding?: any) {
    logFinalHeaders();
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware final de vérification et force des headers CORS
 */
export const corsFinalCheckMiddleware = (req: any, res: any, next: any) => {
  const originalEnd = res.end;
  
  res.end = function(chunk?: any, encoding?: any) {
    logger.debug('📤 CORS Final Check', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      finalHeaders: {
        'Access-Control-Allow-Origin': this.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Credentials': this.get('Access-Control-Allow-Credentials')
      }
    });

    // FORCE FINALE des headers si manquants (dernière chance)
    if (!this.get('Access-Control-Allow-Credentials')) {
      logger.warn('🚨 FINAL FORCE: Setting missing Access-Control-Allow-Credentials', {
        url: req.url,
        origin: req.get('Origin')
      });
      this.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (!this.get('Access-Control-Allow-Origin') && req.get('Origin')) {
      logger.warn('🚨 FINAL FORCE: Setting missing Access-Control-Allow-Origin', {
        url: req.url,
        origin: req.get('Origin')
      });
      this.setHeader('Access-Control-Allow-Origin', req.get('Origin')!);
    }

    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Utilitaires pour debugging
 */
export const corsDebugInfo = {
  getAllowedOrigins,
  getAllowedHeaders,
  getAllowedMethods,
  isOriginAllowed,
  environment: appConfig.environment,
  isDevelopment: appConfig.isDevelopment
};

/**
 * Validation de la configuration CORS
 */
export const validateCorsConfig = (): boolean => {
  const origins = getAllowedOrigins();
  const headers = getAllowedHeaders();
  const methods = getAllowedMethods();

  logger.info('🔍 CORS Configuration Validation', {
    originsCount: origins.length,
    headersCount: headers.length,
    methodsCount: methods.length,
    credentialsEnabled: true,
    environment: appConfig.environment,
    isDevelopment: appConfig.isDevelopment,
    allowedOrigins: origins,
    allowedHeaders: headers,
    allowedMethods: methods
  });

  const isValid = origins.length > 0 && headers.length > 0 && methods.length > 0;
  
  if (!isValid) {
    logger.error('❌ CORS Configuration Invalid', {
      originsEmpty: origins.length === 0,
      headersEmpty: headers.length === 0,
      methodsEmpty: methods.length === 0
    });
  } else {
    logger.info('✅ CORS Configuration Valid');
  }

  return isValid;
};

export default {
  corsOptions,
  corsUltraAggressiveMiddleware,
  corsProtectionMiddleware,
  corsBackupMiddleware,
  corsDebugMiddleware,
  corsFinalCheckMiddleware,
  corsDebugInfo,
  validateCorsConfig
};