---
inclusion: fileMatch
fileMatchPattern: ['backend/**/*.ts']
---

# API Development Guidelines - AttendanceX

Essential patterns and conventions for backend API development in AttendanceX.

## Core Architecture

### MVC Pattern Flow
**Route → Middleware → Controller → Service → Model → Database**

Always follow this separation:
- **Routes**: Define endpoints and middleware chain
- **Controllers**: Handle HTTP requests/responses, minimal logic
- **Services**: Business logic and data orchestration
- **Models**: Data validation and Firestore operations

### Standard Response Format
```typescript
// Success
{ success: true, data: T, message?: string, pagination?: PaginationMeta }

// Error  
{ success: false, error: { code: string, message: string, details?: any, field?: string } }
```

## Required Middleware Chain

### Standard Order
```typescript
router.use(
  smartRateLimit,        // 1. Rate limiting (use smartRateLimit.ts)
  cors,                  // 2. CORS headers
  authMiddleware,        // 3. JWT authentication
  tenantContextMiddleware, // 4. Tenant context extraction
  permissionMiddleware   // 5. Role/permission validation
);
```

### Authentication Patterns
```typescript
// Protected endpoints
router.get('/users', authMiddleware, getUsersController);

// Tenant-scoped endpoints (most common)
router.get('/events', authMiddleware, tenantContextMiddleware, getEventsController);

// Permission-specific endpoints
router.delete('/users/:id', authMiddleware, requireRole(['admin', 'owner']), deleteUserController);
```

## Error Handling

### Use Custom Error Classes
```typescript
// From utils/common/errors.ts
throw new ValidationError('Invalid email format', { field: 'email' });
throw new NotFoundError('User not found');
throw new UnauthorizedError('Insufficient permissions');
throw new ConflictError('Email already exists');
```

### Controller Error Pattern
```typescript
export const createUserController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userData = req.body;
    const user = await userService.createUser(userData, req.user.tenantId);
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error) {
    handleControllerError(error, res); // Use existing error handler
  }
};
```

## Data Validation

### Use Existing Validators
```typescript
// Import from common/validators/
import { validateCreateUser } from '../common/validators/user.validators';

export const createUser = async (userData: any, tenantId: string): Promise<User> => {
  const validatedData = validateCreateUser(userData);
  // Always include tenantId in operations
  return await userModel.create({ ...validatedData, tenantId });
};
```

### Input Sanitization
```typescript
const sanitizedData = {
  email: userData.email?.toLowerCase().trim(),
  name: userData.name?.trim(),
  // Remove sensitive fields before processing
};
```

## Tenant Context & Security

### Always Scope by Tenant
```typescript
// Controllers must extract tenantId from req.user
export const getUsersController = async (req: AuthenticatedRequest, res: Response) => {
  const { tenantId } = req.user;
  const users = await userService.getUsers(tenantId, req.query);
  res.json({ success: true, data: users });
};

// Services must accept and use tenantId
export const getUsers = async (tenantId: string, filters: UserFilters) => {
  return await userModel.findByTenant(tenantId, filters);
};
```

### Permission Validation
```typescript
// Use existing permission system
import { hasPermission } from '../services/permissions/tenant-permission.service';

// In controllers or middleware
if (!hasPermission(req.user, 'canManageUsers', tenantId)) {
  throw new UnauthorizedError('Insufficient permissions');
}
```

## Pagination & Filtering

### Standard Pagination
```typescript
interface PaginationParams {
  page?: number;      // Default: 1
  limit?: number;     // Default: 20, Max: 100
  sortBy?: string;    // Default: 'createdAt'
  sortOrder?: 'asc' | 'desc'; // Default: 'desc'
}

// Return format
return {
  data: items,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
};
```

## Rate Limiting

### Use Smart Rate Limiting
```typescript
// Import existing middleware
import { smartRateLimit } from '../middleware/smartRateLimit';

// Apply to sensitive endpoints
router.post('/users', smartRateLimit, authMiddleware, createUserController);
```

## Firebase/Firestore Patterns

### Collection Structure
```typescript
// Always use tenant-scoped collections
const usersRef = db.collection('tenants').doc(tenantId).collection('users');
const eventsRef = db.collection('tenants').doc(tenantId).collection('events');
```

### Batch Operations
```typescript
// Use batches for multiple operations
const batch = db.batch();
batch.set(userRef, userData);
batch.update(statsRef, { userCount: admin.firestore.FieldValue.increment(1) });
await batch.commit();
```

## Testing Requirements

### Integration Test Pattern
```typescript
describe('Users API', () => {
  beforeEach(async () => {
    await setupTestTenant();
    authToken = await getTestAuthToken();
  });

  it('should create user with valid data', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validUserData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(validUserData.email);
  });
});
```

## Performance Guidelines

### Firestore Optimization
- Use compound indexes for complex queries
- Implement pagination for large datasets
- Avoid N+1 queries by batching reads
- Use subcollections for tenant isolation

### Caching Strategy
- Cache frequently accessed data (user profiles, tenant settings)
- Use Redis for session data and temporary storage
- Implement cache invalidation on data updates

## Logging Standards

### Structured Logging
```typescript
import { logger } from '../utils/logger';

logger.info('User operation', {
  operation: 'create',
  userId: user.id,
  tenantId,
  email: user.email
});

logger.error('Operation failed', {
  operation: 'create',
  error: error.message,
  tenantId,
  context: { email: userData.email }
});
```

## Common Patterns to Follow

### Service Layer Pattern
```typescript
// Services handle business logic, not HTTP concerns
export const userService = {
  async createUser(userData: CreateUserRequest, tenantId: string): Promise<User> {
    const validatedData = validateCreateUser(userData);
    
    // Check business rules
    const existingUser = await userModel.findByEmail(validatedData.email, tenantId);
    if (existingUser) {
      throw new ConflictError('Email already exists');
    }
    
    return await userModel.create({ ...validatedData, tenantId });
  }
};
```

### Model Layer Pattern
```typescript
// Models handle data access and basic validation
export const userModel = {
  async create(userData: UserData): Promise<User> {
    const userRef = db.collection('tenants').doc(userData.tenantId).collection('users').doc();
    const user = { ...userData, id: userRef.id, createdAt: new Date() };
    await userRef.set(user);
    return user;
  },
  
  async findByTenant(tenantId: string, filters: UserFilters): Promise<User[]> {
    let query = db.collection('tenants').doc(tenantId).collection('users');
    
    if (filters.role) {
      query = query.where('role', '==', filters.role);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }
};
```