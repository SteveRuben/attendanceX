import { ValidationError } from './errors'

export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Validate and extract pagination parameters from query
 */
export function validatePaginationParams(query: any): PaginationParams {
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 20
  const sortBy = query.sortBy as string || 'createdAt'
  const sortOrder = (query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc'

  // Validate page
  if (page < 1) {
    throw new ValidationError('Page must be greater than 0')
  }

  // Validate limit
  if (limit < 1) {
    throw new ValidationError('Limit must be greater than 0')
  }

  if (limit > 100) {
    throw new ValidationError('Limit cannot exceed 100')
  }

  // Validate sortBy (basic validation - could be expanded)
  if (sortBy && !/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(sortBy)) {
    throw new ValidationError('Invalid sortBy parameter')
  }

  return {
    page,
    limit,
    sortBy,
    sortOrder
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate required string field
 */
export function validateRequiredString(value: any, fieldName: string, minLength?: number, maxLength?: number): string {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${fieldName} is required`)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw new ValidationError(`${fieldName} cannot be empty`)
  }

  if (minLength && trimmed.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`)
  }

  if (maxLength && trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} must be less than ${maxLength} characters`)
  }

  return trimmed
}

/**
 * Validate optional string field
 */
export function validateOptionalString(value: any, fieldName: string, maxLength?: number): string | undefined {
  if (!value) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  if (maxLength && trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} must be less than ${maxLength} characters`)
  }

  return trimmed
}

/**
 * Validate date field
 */
export function validateDate(value: any, fieldName: string, required: boolean = true): Date | undefined {
  if (!value) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`)
    }
    return undefined
  }

  let date: Date
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value)
  } else {
    throw new ValidationError(`${fieldName} must be a valid date`)
  }

  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`)
  }

  return date
}

/**
 * Validate future date
 */
export function validateFutureDate(value: any, fieldName: string): Date {
  const date = validateDate(value, fieldName, true)!
  
  if (date.getTime() <= Date.now()) {
    throw new ValidationError(`${fieldName} must be in the future`)
  }

  return date
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: any, endDate: any, startFieldName: string = 'startDate', endFieldName: string = 'endDate'): { startDate: Date; endDate: Date } {
  const start = validateDate(startDate, startFieldName, true)!
  const end = validateDate(endDate, endFieldName, true)!

  if (start.getTime() >= end.getTime()) {
    throw new ValidationError(`${endFieldName} must be after ${startFieldName}`)
  }

  return { startDate: start, endDate: end }
}

/**
 * Validate enum value
 */
export function validateEnum<T>(value: any, enumObject: Record<string, T>, fieldName: string): T {
  const enumValues = Object.values(enumObject)
  
  if (!enumValues.includes(value)) {
    throw new ValidationError(`${fieldName} must be one of: ${enumValues.join(', ')}`)
  }

  return value
}

/**
 * Validate array field
 */
export function validateArray(value: any, fieldName: string, required: boolean = true, minLength?: number, maxLength?: number): any[] | undefined {
  if (!value) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`)
    }
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`)
  }

  if (minLength && value.length < minLength) {
    throw new ValidationError(`${fieldName} must have at least ${minLength} items`)
  }

  if (maxLength && value.length > maxLength) {
    throw new ValidationError(`${fieldName} must have at most ${maxLength} items`)
  }

  return value
}

/**
 * Validate number field
 */
export function validateNumber(value: any, fieldName: string, required: boolean = true, min?: number, max?: number): number | undefined {
  if (value === null || value === undefined) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`)
    }
    return undefined
  }

  const num = typeof value === 'string' ? parseFloat(value) : value

  if (typeof num !== 'number' || isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`)
  }

  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`)
  }

  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`)
  }

  return num
}

/**
 * Validate integer field
 */
export function validateInteger(value: any, fieldName: string, required: boolean = true, min?: number, max?: number): number | undefined {
  const num = validateNumber(value, fieldName, required, min, max)
  
  if (num !== undefined && !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be an integer`)
  }

  return num
}

/**
 * Validate boolean field
 */
export function validateBoolean(value: any, fieldName: string, required: boolean = true): boolean | undefined {
  if (value === null || value === undefined) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`)
    }
    return undefined
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === '1') {
      return true
    }
    if (lower === 'false' || lower === '0') {
      return false
    }
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  throw new ValidationError(`${fieldName} must be a boolean value`)
}

/**
 * Validate URL format
 */
export function validateUrl(value: any, fieldName: string, required: boolean = true): string | undefined {
  if (!value) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`)
    }
    return undefined
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`)
  }

  try {
    new URL(value)
    return value
  } catch {
    throw new ValidationError(`${fieldName} must be a valid URL`)
  }
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(value: any, fieldName: string, required: boolean = true): string | undefined {
  if (!value) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`)
    }
    return undefined
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`)
  }

  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
  if (!phoneRegex.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid phone number`)
  }

  return value
}

/**
 * Sanitize HTML content (basic)
 */
export function sanitizeHtml(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate and sanitize user input
 */
export function validateAndSanitizeInput(value: any, fieldName: string, options: {
  required?: boolean
  minLength?: number
  maxLength?: number
  allowHtml?: boolean
} = {}): string | undefined {
  const {
    required = true,
    minLength,
    maxLength,
    allowHtml = false
  } = options

  let validated = validateOptionalString(value, fieldName, maxLength)
  
  if (!validated) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`)
    }
    return undefined
  }

  if (minLength && validated.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`)
  }

  if (!allowHtml) {
    validated = sanitizeHtml(validated)
  }

  return validated
}