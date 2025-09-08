# Coding Standards

Standards de codage pour le projet.

## TypeScript

### Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Types et interfaces
```typescript
// Préférer les interfaces pour les objets
interface User {
  readonly id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// Utiliser les types pour les unions et primitives
type Status = 'active' | 'inactive' | 'pending';
type UserId = string;

// Générics pour la réutilisabilité
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
```

### Fonctions
```typescript
// Typage explicite des paramètres et retour
function calculateDuration(start: Date, end: Date): number {
  return end.getTime() - start.getTime();
}

// Fonctions async avec gestion d'erreur
async function fetchUser(id: string): Promise<User | null> {
  try {
    const user = await userService.getById(id);
    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { id, error });
    return null;
  }
}

// Utiliser les arrow functions pour les callbacks
const users = await Promise.all(
  userIds.map(async (id) => await fetchUser(id))
);
```

## Gestion d'erreurs

### Classes d'erreur personnalisées
```typescript
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}
```

### Gestion des erreurs async
```typescript
// Wrapper pour les fonctions async
async function safeExecute<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error('Operation failed', { error });
    return fallback;
  }
}

// Utilisation
const user = await safeExecute(
  () => userService.getById(id),
  null
);
```

## Logging

### Configuration
```typescript
import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' })
  ]
});
```

### Utilisation
```typescript
// Logs structurés avec contexte
logger.info('User created', {
  userId: user.id,
  email: user.email,
  organizationId: user.organizationId
});

logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  retryAttempt: 3
});

// Éviter les logs sensibles
logger.info('User authenticated', {
  userId: user.id,
  // Ne pas logger le mot de passe ou token
});
```

## Validation

### Schémas Zod
```typescript
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  organizationId: z.string().uuid('Invalid organization ID'),
  role: z.enum(['admin', 'user', 'manager']).default('user')
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
```

### Validation dans les controllers
```typescript
export async function createUser(req: Request, res: Response) {
  try {
    const validatedData = CreateUserSchema.parse(req.body);
    const user = await userService.create(validatedData);
    
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }
    
    logger.error('Failed to create user', { error });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
```

## Performance

### Optimisations Firestore
```typescript
// Utiliser les index composites
const query = db.collection('presences')
  .where('organizationId', '==', orgId)
  .where('userId', '==', userId)
  .orderBy('createdAt', 'desc')
  .limit(10);

// Batch operations pour les écritures multiples
const batch = db.batch();
users.forEach(user => {
  const ref = db.collection('users').doc();
  batch.set(ref, user);
});
await batch.commit();

// Pagination efficace
async function getPresencesPaginated(
  organizationId: string,
  lastDoc?: DocumentSnapshot,
  limit = 20
) {
  let query = db.collection('presences')
    .where('organizationId', '==', organizationId)
    .orderBy('createdAt', 'desc')
    .limit(limit);
    
  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }
  
  return await query.get();
}
```

### Mise en cache
```typescript
// Cache en mémoire simple
const cache = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item || Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache<T>(key: string, data: T, ttlMs = 300000) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttlMs
  });
}
```

## Sécurité

### Validation des entrées
```typescript
// Sanitization des données
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input.trim());
}

// Validation des permissions
async function requirePermission(
  userId: string,
  resource: string,
  action: string
): Promise<void> {
  const hasPermission = await permissionService.check(userId, resource, action);
  if (!hasPermission) {
    throw new ForbiddenError(`Access denied for ${action} on ${resource}`);
  }
}
```

### Gestion des secrets
```typescript
// Configuration sécurisée
const config = {
  jwtSecret: process.env.JWT_SECRET || (() => {
    throw new Error('JWT_SECRET is required');
  })(),
  dbUrl: process.env.DATABASE_URL || (() => {
    throw new Error('DATABASE_URL is required');
  })()
};

// Ne jamais logger les secrets
logger.info('Configuration loaded', {
  hasJwtSecret: !!config.jwtSecret,
  hasDbUrl: !!config.dbUrl
  // Ne pas logger les valeurs réelles
});
```

## Documentation

### JSDoc
```typescript
/**
 * Service de gestion des présences utilisateur
 * 
 * @example
 * ```typescript
 * const service = new PresenceService();
 * const presence = await service.create({
 *   userId: 'user-123',
 *   organizationId: 'org-456'
 * });
 * ```
 */
export class PresenceService {
  /**
   * Crée une nouvelle présence pour un utilisateur
   * 
   * @param data - Données de la présence à créer
   * @returns Promise résolvant vers la présence créée
   * @throws {ValidationError} Si les données sont invalides
   * @throws {NotFoundError} Si l'utilisateur ou l'organisation n'existe pas
   */
  async create(data: CreatePresenceData): Promise<Presence> {
    // Implementation
  }
}
```

### README des modules
```markdown
# Module Name

Brief description of what this module does.

## Usage

```typescript
import { ModuleName } from './module-name';

const instance = new ModuleName();
await instance.doSomething();
```

## API

### Methods

- `method1(param: Type): ReturnType` - Description
- `method2(param: Type): ReturnType` - Description

## Configuration

Required environment variables:
- `VAR_NAME` - Description of the variable
```