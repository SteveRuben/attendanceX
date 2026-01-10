import { Response } from 'express';
import { 
  ValidationError, 
  ForbiddenError, 
  UnauthorizedError,
  handleServiceError
} from './common/errors';

/**
 * Standard success response format
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    fieldErrorDetails?: Record<string, string>;
  };
  requestId?: string;
}

/**
 * Send a success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  pagination?: SuccessResponse['pagination']
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(pagination && { pagination })
  };

  res.status(statusCode).json(response);
}

/**
 * Send a created response (201)
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message?: string
): void {
  sendSuccess(res, data, message, 201);
}

/**
 * Send a no content response (204)
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

/**
 * Validate required fields and throw ValidationError if missing
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields: string[] = [];
  const fieldErrors: Record<string, string> = {};

  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missingFields.push(field);
      fieldErrors[field] = `${field} is required`;
    }
  }

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      { fieldErrorDetails: fieldErrors }
    );
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string, fieldName: string = 'email'): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(
      'Invalid email format',
      { fieldErrorDetails: { [fieldName]: 'Invalid email format' } }
    );
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(query: any): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Handle common service errors and convert them to appropriate HTTP errors
 */
export function handleCommonErrors(error: any, context?: string): never {
  return handleServiceError(error, context);
}

/**
 * Validate tenant access
 */
export function validateTenantAccess(
  userTenantId: string | undefined,
  requiredTenantId: string,
  action: string = 'access this resource'
): void {
  if (!userTenantId) {
    throw new UnauthorizedError('No tenant context available');
  }

  if (userTenantId !== requiredTenantId) {
    throw new ForbiddenError(`You don't have permission to ${action}`);
  }
}

/**
 * Validate resource ownership
 */
export function validateResourceOwnership(
  resourceOwnerId: string,
  currentUserId: string,
  resourceType: string = 'resource'
): void {
  if (resourceOwnerId !== currentUserId) {
    throw new ForbiddenError(`You don't have permission to access this ${resourceType}`);
  }
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): SuccessResponse['pagination'] {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Sanitize user input by removing potentially dangerous fields
 */
export function sanitizeInput<T extends Record<string, any>>(
  input: T,
  allowedFields: string[]
): Partial<T> {
  const sanitized: Record<string, any> = {};

  for (const field of allowedFields) {
    if (input[field] !== undefined) {
      sanitized[field] = input[field];
    }
  }

  return sanitized as Partial<T>;
}

/**
 * Validate and sanitize sort parameters
 */
export function validateSortParams(
  sortBy?: string,
  sortOrder?: string,
  allowedSortFields: string[] = ['createdAt', 'updatedAt', 'name']
): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  const validSortBy = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  return {
    sortBy: validSortBy,
    sortOrder: validSortOrder
  };
}