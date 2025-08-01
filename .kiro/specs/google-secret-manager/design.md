# Design Document - Google Secret Manager Integration

## Overview

Ce design document décrit l'architecture pour intégrer Google Secret Manager dans AttendanceX, permettant une gestion sécurisée des secrets avec rotation automatique, monitoring et fallback selon l'environnement.

## Architecture

### Secret Manager Service Architecture

```typescript
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│                  Secret Manager Service                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │   Cache Layer   │  │  Fallback Layer │  │  Audit Layer    ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                 Google Secret Manager API                   │
└─────────────────────────────────────────────────────────────┘
```

### Secret Naming Convention

```
Environment Prefixes:
- dev-{secret-name}      (Development)
- staging-{secret-name}  (Staging)  
- prod-{secret-name}     (Production)
- {secret-name}          (Default/Fallback)

Examples:
- prod-jwt-secret
- staging-sendgrid-api-key
- dev-twilio-auth-token
```

## Components and Interfaces

### 1. Secret Manager Service

```typescript
interface SecretManagerService {
  // Core secret operations
  getSecret(name: string): Promise<string>;
  getSecrets(names: string[]): Promise<Record<string, string>>;
  setSecret(name: string, value: string): Promise<void>;
  deleteSecret(name: string): Promise<void>;
  
  // Environment-aware operations
  getEnvironmentSecret(name: string, environment?: string): Promise<string>;
  
  // Caching and performance
  getCachedSecret(name: string): string | null;
  invalidateCache(name?: string): void;
  
  // Health and monitoring
  healthCheck(): Promise<SecretHealthStatus>;
  getSecretMetadata(name: string): Promise<SecretMetadata>;
}
```

### 2. Secret Configuration Manager

```typescript
interface SecretConfig {
  name: string;
  required: boolean;
  fallbackEnvVar?: string;
  cacheTTL?: number;
  rotationInterval?: number;
  validator?: (value: string) => boolean;
}

interface SecretConfigManager {
  registerSecret(config: SecretConfig): void;
  loadAllSecrets(): Promise<Record<string, string>>;
  validateSecrets(): Promise<ValidationResult[]>;
  getSecretConfig(name: string): SecretConfig | null;
}
```

### 3. Secret Cache Layer

```typescript
interface SecretCache {
  get(key: string): CachedSecret | null;
  set(key: string, value: string, ttl: number): void;
  delete(key: string): void;
  clear(): void;
  getStats(): CacheStats;
}

interface CachedSecret {
  value: string;
  cachedAt: Date;
  expiresAt: Date;
  accessCount: number;
}
```

## Data Models

### Secret Metadata

```typescript
interface SecretMetadata {
  name: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  environment: string;
  rotationSchedule?: RotationSchedule;
  accessPolicy: AccessPolicy;
  tags: Record<string, string>;
}

interface RotationSchedule {
  enabled: boolean;
  intervalDays: number;
  nextRotation: Date;
  gracePeriodHours: number;
}
```

### Secret Health Status

```typescript
interface SecretHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  secrets: Array<{
    name: string;
    status: 'available' | 'cached' | 'fallback' | 'missing';
    lastAccessed: Date;
    error?: string;
  }>;
  cacheStats: {
    hitRate: number;
    totalRequests: number;
    cacheSize: number;
  };
}
```

## Implementation Strategy

### 1. Secret Registration and Loading

```typescript
// Configuration des secrets critiques
const CRITICAL_SECRETS: SecretConfig[] = [
  {
    name: 'jwt-secret',
    required: true,
    fallbackEnvVar: 'JWT_SECRET',
    cacheTTL: 3600, // 1 hour
    validator: (value) => value.length >= 32
  },
  {
    name: 'sendgrid-api-key',
    required: false,
    fallbackEnvVar: 'SENDGRID_API_KEY',
    cacheTTL: 1800, // 30 minutes
    validator: (value) => value.startsWith('SG.')
  },
  {
    name: 'twilio-auth-token',
    required: false,
    fallbackEnvVar: 'TWILIO_AUTH_TOKEN',
    cacheTTL: 1800
  }
];
```

### 2. Environment-Aware Secret Resolution

```typescript
class EnvironmentSecretResolver {
  async resolveSecret(baseName: string): Promise<string> {
    const environment = process.env.APP_ENV || 'development';
    
    // Try environment-specific secret first
    const envSecretName = `${environment}-${baseName}`;
    try {
      return await this.secretManager.getSecret(envSecretName);
    } catch (error) {
      // Fallback to default secret
      return await this.secretManager.getSecret(baseName);
    }
  }
}
```

### 3. Caching Strategy

```typescript
class SecretCacheManager {
  private cache = new Map<string, CachedSecret>();
  
  async getWithCache(name: string, ttl: number = 3600): Promise<string> {
    const cached = this.cache.get(name);
    
    if (cached && cached.expiresAt > new Date()) {
      cached.accessCount++;
      return cached.value;
    }
    
    // Fetch from Secret Manager
    const value = await this.secretManager.getSecret(name);
    
    // Cache the result
    this.cache.set(name, {
      value,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + ttl * 1000),
      accessCount: 1
    });
    
    return value;
  }
}
```

## Error Handling

### Fallback Strategy

```typescript
class SecretFallbackHandler {
  async getSecretWithFallback(config: SecretConfig): Promise<string> {
    try {
      // Try Secret Manager first
      return await this.secretManager.getEnvironmentSecret(config.name);
    } catch (error) {
      if (config.fallbackEnvVar && process.env.APP_ENV === 'development') {
        // Use environment variable in development
        const fallbackValue = process.env[config.fallbackEnvVar];
        if (fallbackValue) {
          this.logger.warn(`Using fallback env var for ${config.name}`);
          return fallbackValue;
        }
      }
      
      if (config.required) {
        throw new Error(`Required secret ${config.name} not found`);
      }
      
      return ''; // Return empty string for optional secrets
    }
  }
}
```

### Error Types

```typescript
enum SecretErrorType {
  SECRET_NOT_FOUND = 'SECRET_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CACHE_ERROR = 'CACHE_ERROR'
}

class SecretError extends Error {
  constructor(
    public type: SecretErrorType,
    public secretName: string,
    message: string,
    public cause?: Error
  ) {
    super(message);
  }
}
```

## Security Considerations

### 1. Access Control

```typescript
// IAM permissions requises pour Firebase Functions
const REQUIRED_PERMISSIONS = [
  'secretmanager.secrets.get',
  'secretmanager.versions.access',
  'secretmanager.secrets.create', // Pour la rotation
  'secretmanager.versions.add'    // Pour la rotation
];
```

### 2. Audit Logging

```typescript
interface SecretAuditLog {
  timestamp: Date;
  action: 'GET' | 'SET' | 'DELETE' | 'ROTATE';
  secretName: string;
  environment: string;
  userId?: string;
  source: 'cache' | 'secret-manager' | 'fallback';
  success: boolean;
  error?: string;
}
```

### 3. Secret Validation

```typescript
class SecretValidator {
  validateJwtSecret(secret: string): boolean {
    return secret.length >= 32 && !/\s/.test(secret);
  }
  
  validateApiKey(key: string, provider: string): boolean {
    const patterns = {
      sendgrid: /^SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/,
      twilio: /^[A-Za-z0-9]{32}$/,
    };
    
    return patterns[provider]?.test(key) || false;
  }
}
```

## Testing Strategy

### 1. Unit Tests

```typescript
describe('SecretManagerService', () => {
  test('should retrieve secret from Google Secret Manager');
  test('should use cached secret when available');
  test('should fallback to environment variable in development');
  test('should throw error for missing required secret');
  test('should validate secret format');
});
```

### 2. Integration Tests

```typescript
describe('Secret Manager Integration', () => {
  test('should load all critical secrets on startup');
  test('should handle Secret Manager API failures gracefully');
  test('should rotate secrets according to schedule');
  test('should maintain service availability during secret rotation');
});
```

## Deployment and Migration

### 1. Migration Steps

```bash
# 1. Create secrets in Google Secret Manager
gcloud secrets create prod-jwt-secret --data-file=jwt-secret.txt

# 2. Grant access to Firebase Functions service account
gcloud secrets add-iam-policy-binding prod-jwt-secret \
  --member="serviceAccount:firebase-functions@project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 3. Update application configuration
# 4. Deploy with new secret management
# 5. Verify all secrets are accessible
# 6. Remove old .env secrets
```

### 2. Rollback Strategy

```typescript
// Maintain dual support during migration
class HybridSecretManager {
  async getSecret(name: string): Promise<string> {
    try {
      return await this.googleSecretManager.getSecret(name);
    } catch (error) {
      // Fallback to old method during migration
      return process.env[name.toUpperCase().replace('-', '_')] || '';
    }
  }
}
```

## Monitoring and Alerting

### 1. Metrics to Track

- Secret access frequency
- Cache hit/miss rates
- Secret Manager API latency
- Failed secret retrievals
- Secret rotation success/failure

### 2. Alerts Configuration

```typescript
const ALERT_CONDITIONS = {
  secretAccessFailure: {
    threshold: 5, // failures in 5 minutes
    severity: 'critical'
  },
  cacheHitRateBelow: {
    threshold: 0.8, // 80%
    severity: 'warning'
  },
  secretRotationFailure: {
    threshold: 1,
    severity: 'critical'
  }
};
```