// shared/utils/common/errors.ts

export interface ErrorDetails {
  field?: string;
  code?: string;
  details?: any;
  fieldErrorDetails?: Record<string, string>;
}

export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;
  public readonly fieldErrorDetails?: Record<string, string>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: ErrorDetails
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details?.details;
    this.fieldErrorDetails = details?.fieldErrorDetails;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string = 'Too many requests', details?: ErrorDetails) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string = 'Internal server error', details?: ErrorDetails) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

// Helper function to create field validation errors
export function createFieldValidationError(
  message: string,
  fieldErrors: Record<string, string>
): ValidationError {
  return new ValidationError(message, {
    fieldErrorDetails: fieldErrors
  });
}

// Helper function to handle common error scenarios
export function handleServiceError(error: any, context?: string): never {
  if (error instanceof BaseError) {
    throw error;
  }

  // Handle Firebase Auth errors
  if (error.code?.startsWith('auth/')) {
    switch (error.code) {
      case 'auth/user-not-found':
        throw new NotFoundError('User not found');
      case 'auth/invalid-email':
        throw new ValidationError('Invalid email format');
      case 'auth/email-already-in-use':
        throw new ConflictError('Email already in use');
      case 'auth/weak-password':
        throw new ValidationError('Password is too weak');
      case 'auth/wrong-password':
        throw new AuthenticationError('Invalid credentials');
      case 'auth/too-many-requests':
        throw new RateLimitError('Too many authentication attempts');
      default:
        throw new AuthenticationError(error.message || 'Authentication failed');
    }
  }

  // Handle Firestore errors
  if (error.code?.startsWith('firestore/')) {
    switch (error.code) {
      case 'firestore/permission-denied':
        throw new ForbiddenError('Access denied');
      case 'firestore/not-found':
        throw new NotFoundError('Resource not found');
      case 'firestore/already-exists':
        throw new ConflictError('Resource already exists');
      default:
        throw new InternalServerError('Database operation failed');
    }
  }

  // Default to internal server error
  const message = context 
    ? `${context}: ${error.message || 'Unknown error'}`
    : error.message || 'Internal server error';
  
  throw new InternalServerError(message, { details: error });
}