// tests/helpers/mocks/error-mocks.ts
// Mock des classes d'erreur personnalisées pour les tests backend

export class ValidationError extends Error {
  public statusCode: number = 400;
  public code: string = 'VALIDATION_ERROR';

  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends Error {
  public statusCode: number = 401;
  public code: string = 'AUTHENTICATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class ForbiddenError extends Error {
  public statusCode: number = 403;
  public code: string = 'FORBIDDEN_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class NotFoundError extends Error {
  public statusCode: number = 404;
  public code: string = 'NOT_FOUND_ERROR';

  constructor(message: string, public resource?: string) {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends Error {
  public statusCode: number = 409;
  public code: string = 'CONFLICT_ERROR';

  constructor(message: string, public resource?: string) {
    super(message);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class InternalServerError extends Error {
  public statusCode: number = 500;
  public code: string = 'INTERNAL_SERVER_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'InternalServerError';
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

export class RateLimitError extends Error {
  public statusCode: number = 429;
  public code: string = 'RATE_LIMIT_ERROR';

  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

// Helper pour créer des erreurs de test
export const createTestError = (type: string, message: string, options: any = {}) => {
  switch (type) {
    case 'validation':
      return new ValidationError(message, options.field);
    case 'authentication':
      return new AuthenticationError(message);
    case 'forbidden':
      return new ForbiddenError(message);
    case 'notFound':
      return new NotFoundError(message, options.resource);
    case 'conflict':
      return new ConflictError(message, options.resource);
    case 'rateLimit':
      return new RateLimitError(message, options.retryAfter);
    case 'internal':
      return new InternalServerError(message);
    default:
      return new Error(message);
  }
};

// Mock des erreurs Firebase
export const createFirebaseError = (code: string, message: string) => {
  const error = new Error(message);
  (error as any).code = code;
  return error;
};

// Erreurs Firebase communes
export const firebaseErrors = {
  authUserNotFound: createFirebaseError('auth/user-not-found', 'User not found'),
  authInvalidEmail: createFirebaseError('auth/invalid-email', 'Invalid email'),
  authEmailAlreadyExists: createFirebaseError('auth/email-already-exists', 'Email already exists'),
  authWeakPassword: createFirebaseError('auth/weak-password', 'Password is too weak'),
  authTooManyRequests: createFirebaseError('auth/too-many-requests', 'Too many requests'),
  firestorePermissionDenied: createFirebaseError('firestore/permission-denied', 'Permission denied'),
  firestoreNotFound: createFirebaseError('firestore/not-found', 'Document not found'),
  firestoreUnavailable: createFirebaseError('firestore/unavailable', 'Service unavailable'),
};

// Helper pour tester les erreurs
export const expectError = async (
  promise: Promise<any>,
  expectedErrorType: string,
  expectedMessage?: string
) => {
  try {
    await promise;
    throw new Error('Expected promise to reject');
  } catch (error: any) {
    expect(error.name).toBe(expectedErrorType);
    if (expectedMessage) {
      expect(error.message).toContain(expectedMessage);
    }
  }
};

// Mock du gestionnaire d'erreurs Express
export const mockErrorHandler = (error: Error, req: any, res: any, next: any) => {
  const statusCode = (error as any).statusCode || 500;
  const code = (error as any).code || 'UNKNOWN_ERROR';
  
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
};

// Assertions personnalisées pour les tests
export const expectValidationError = (error: any, field?: string) => {
  expect(error).toBeInstanceOf(ValidationError);
  expect(error.statusCode).toBe(400);
  expect(error.code).toBe('VALIDATION_ERROR');
  if (field) {
    expect(error.field).toBe(field);
  }
};

export const expectAuthenticationError = (error: any) => {
  expect(error).toBeInstanceOf(AuthenticationError);
  expect(error.statusCode).toBe(401);
  expect(error.code).toBe('AUTHENTICATION_ERROR');
};

export const expectForbiddenError = (error: any) => {
  expect(error).toBeInstanceOf(ForbiddenError);
  expect(error.statusCode).toBe(403);
  expect(error.code).toBe('FORBIDDEN_ERROR');
};

export const expectNotFoundError = (error: any, resource?: string) => {
  expect(error).toBeInstanceOf(NotFoundError);
  expect(error.statusCode).toBe(404);
  expect(error.code).toBe('NOT_FOUND_ERROR');
  if (resource) {
    expect(error.resource).toBe(resource);
  }
};

export const expectConflictError = (error: any, resource?: string) => {
  expect(error).toBeInstanceOf(ConflictError);
  expect(error.statusCode).toBe(409);
  expect(error.code).toBe('CONFLICT_ERROR');
  if (resource) {
    expect(error.resource).toBe(resource);
  }
};