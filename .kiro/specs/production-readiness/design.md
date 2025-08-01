# Design Document - Production Readiness

## Overview

Ce design document décrit l'architecture et les solutions techniques pour résoudre les problèmes CORS et préparer AttendanceX pour la production. L'approche se concentre sur la sécurité, la fiabilité et la maintenabilité.

## Architecture

### Configuration CORS Dynamique

```typescript
// Configuration CORS adaptative selon l'environnement
const corsConfig = {
  development: {
    origins: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin']
  },
  production: {
    origins: [process.env.FRONTEND_URL, process.env.ADMIN_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
}
```

### Gestion des Secrets en Production

```typescript
// Hiérarchie de configuration des secrets
1. Variables d'environnement Firebase Functions
2. Google Secret Manager (recommandé)
3. Fichiers .env (développement uniquement)
```

## Components and Interfaces

### 1. Amélioration de la Configuration CORS Existante

La configuration CORS existe déjà dans `backend/functions/src/config/app.ts` avec :
- `corsOptions` pour la production
- `corsOptionsDev` pour le développement  
- `getDynamicCorsOptions()` pour la sélection automatique

**Problème identifié** : `index.ts` utilise `config.cors` au lieu de `getDynamicCorsOptions()`

```typescript
// Configuration actuelle à corriger
app.use(cors(config.cors)); // ❌ Utilise toujours la config production

// Configuration corrigée
app.use(cors(getDynamicCorsOptions())); // ✅ Utilise la config dynamique
```

### 2. Améliorations à apporter à la configuration existante

```typescript
// Ajout d'origines manquantes dans corsOptions
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173", 
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://attendance-app.web.app",
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD, // ← Ajouter cette variable
].filter(Boolean);
```

### 2. Service Configuration Manager

```typescript
interface ServiceConfig {
  email: EmailProviderConfig;
  sms: SmsProviderConfig;
  push: PushProviderConfig;
  database: DatabaseConfig;
}

class ConfigurationManager {
  loadConfiguration(environment: string): ServiceConfig;
  validateConfiguration(): ValidationResult;
  getSecrets(): Promise<SecretMap>;
}
```

### 3. Production Health Checker

```typescript
interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastCheck: Date;
  details?: any;
}

class ProductionHealthChecker {
  checkAllServices(): Promise<HealthCheck[]>;
  checkCorsConfiguration(): HealthCheck;
  checkExternalServices(): Promise<HealthCheck[]>;
}
```

## Data Models

### Configuration d'Environnement

```typescript
interface EnvironmentConfig {
  name: 'development' | 'staging' | 'production';
  cors: {
    allowedOrigins: string[];
    credentials: boolean;
    maxAge: number;
  };
  security: {
    jwtSecret: string;
    encryptionKey: string;
    rateLimits: RateLimitConfig;
  };
  services: {
    email: ServiceProviderConfig;
    sms: ServiceProviderConfig;
    push: ServiceProviderConfig;
  };
  monitoring: {
    logLevel: string;
    enableMetrics: boolean;
    alerting: AlertConfig;
  };
}
```

### Service Provider Configuration

```typescript
interface ServiceProviderConfig {
  primary: {
    provider: string;
    credentials: Record<string, string>;
    enabled: boolean;
  };
  fallback?: {
    provider: string;
    credentials: Record<string, string>;
    enabled: boolean;
  };
  rateLimit: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
}
```

## Error Handling

### CORS Error Handling

```typescript
class CorsErrorHandler {
  handlePreflightError(req: Request, res: Response): void;
  handleOriginRejection(origin: string, req: Request): void;
  logCorsViolation(violation: CorsViolation): void;
}
```

### Production Error Responses

```typescript
interface ProductionErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    timestamp: string;
    requestId: string;
  };
  // Pas de stack trace ou détails sensibles en production
}
```

## Testing Strategy

### 1. Tests CORS

```typescript
describe('CORS Configuration', () => {
  test('should allow localhost origins in development');
  test('should reject unauthorized origins in production');
  test('should handle preflight requests correctly');
  test('should include proper CORS headers');
});
```

### 2. Tests de Configuration

```typescript
describe('Production Configuration', () => {
  test('should load all required environment variables');
  test('should validate service configurations');
  test('should handle missing secrets gracefully');
  test('should apply correct security headers');
});
```

### 3. Tests d'Intégration

```typescript
describe('Service Integration', () => {
  test('should connect to external email service');
  test('should connect to external SMS service');
  test('should handle service failures gracefully');
  test('should implement proper fallback mechanisms');
});
```

## Security Considerations

### 1. Headers de Sécurité

```typescript
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
```

### 2. Validation des Entrées

```typescript
class InputValidator {
  sanitizeInput(input: any): any;
  validateOrigin(origin: string): boolean;
  validateAuthToken(token: string): boolean;
}
```

### 3. Rate Limiting Avancé

```typescript
interface RateLimitConfig {
  general: { windowMs: number; max: number };
  auth: { windowMs: number; max: number };
  api: { windowMs: number; max: number };
  upload: { windowMs: number; max: number };
}
```

## Performance Optimizations

### 1. Mise en Cache

```typescript
class CacheManager {
  cacheConfiguration(key: string, config: any, ttl: number): void;
  getCachedConfiguration(key: string): any | null;
  invalidateCache(pattern: string): void;
}
```

### 2. Connection Pooling

```typescript
class ConnectionManager {
  initializePools(): void;
  getConnection(service: string): Connection;
  healthCheckConnections(): Promise<HealthStatus[]>;
}
```

## Deployment Strategy

### 1. Environnements

```
Development → Staging → Production
     ↓           ↓         ↓
   Localhost   Firebase   Firebase
   Emulators   Staging    Production
```

### 2. Configuration par Environnement

```typescript
const deploymentConfig = {
  development: {
    cors: { strict: false },
    logging: { level: 'debug' },
    services: { mock: true }
  },
  staging: {
    cors: { strict: true },
    logging: { level: 'info' },
    services: { mock: false }
  },
  production: {
    cors: { strict: true },
    logging: { level: 'warn' },
    services: { mock: false }
  }
};
```

## Monitoring and Alerting

### 1. Métriques Clés

- Taux d'erreur CORS
- Temps de réponse API
- Taux de succès des services externes
- Utilisation des ressources

### 2. Alertes Critiques

- Échec de connexion aux services externes
- Taux d'erreur élevé
- Problèmes de sécurité détectés
- Surcharge du système