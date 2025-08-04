// Validation utilities for verification flows

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface EmailValidationOptions {
  required?: boolean;
  allowEmpty?: boolean;
}

export interface PasswordValidationOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

/**
 * Validates email address format and requirements
 */
export const validateEmail = (
  email: string, 
  options: EmailValidationOptions = {}
): { isValid: boolean; error?: string } => {
  const { required = true, allowEmpty = false } = options;
  
  // Check if email is empty
  if (!email || !email.trim()) {
    if (required && !allowEmpty) {
      return { isValid: false, error: 'L\'adresse email est requise' };
    }
    if (allowEmpty) {
      return { isValid: true };
    }
  }

  const trimmedEmail = email.trim();

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Veuillez entrer une adresse email valide' };
  }

  // Check email length
  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'L\'adresse email est trop longue' };
  }

  // Check for common invalid patterns
  if (trimmedEmail.includes('..') || trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
    return { isValid: false, error: 'Format d\'email invalide' };
  }

  return { isValid: true };
};

/**
 * Validates password strength and requirements
 */
export const validatePassword = (
  password: string,
  options: PasswordValidationOptions = {}
): { isValid: boolean; error?: string; strength?: 'weak' | 'medium' | 'strong' } => {
  const {
    minLength = 6,
    requireUppercase = false,
    requireLowercase = false,
    requireNumbers = false,
    requireSpecialChars = false
  } = options;

  if (!password) {
    return { isValid: false, error: 'Le mot de passe est requis' };
  }

  if (password.length < minLength) {
    return { 
      isValid: false, 
      error: `Le mot de passe doit contenir au moins ${minLength} caractères` 
    };
  }

  const errors: string[] = [];

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('une majuscule');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('une minuscule');
  }

  if (requireNumbers && !/\d/.test(password)) {
    errors.push('un chiffre');
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('un caractère spécial');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: `Le mot de passe doit contenir ${errors.join(', ')}`
    };
  }

  // Calculate password strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  if (score >= 4) strength = 'strong';
  else if (score >= 2) strength = 'medium';

  return { isValid: true, strength };
};

/**
 * Validates verification token format
 */
export const validateVerificationToken = (token: string): { isValid: boolean; error?: string } => {
  if (!token || !token.trim()) {
    return { isValid: false, error: 'Token de vérification manquant' };
  }

  const trimmedToken = token.trim();

  // Check token length (assuming 64 character hex string)
  if (trimmedToken.length < 32) {
    return { isValid: false, error: 'Token de vérification invalide' };
  }

  // Check if token contains only valid characters (hex)
  if (!/^[a-fA-F0-9]+$/.test(trimmedToken)) {
    return { isValid: false, error: 'Format de token invalide' };
  }

  return { isValid: true };
};

/**
 * Validates form data for registration
 */
export const validateRegistrationForm = (formData: {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  // Validate first name
  if (!formData.firstName?.trim()) {
    errors.firstName = 'Le prénom est requis';
  } else if (formData.firstName.trim().length < 2) {
    errors.firstName = 'Le prénom doit contenir au moins 2 caractères';
  }

  // Validate last name
  if (!formData.lastName?.trim()) {
    errors.lastName = 'Le nom est requis';
  } else if (formData.lastName.trim().length < 2) {
    errors.lastName = 'Le nom doit contenir au moins 2 caractères';
  }

  // Validate email
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  }

  // Validate organization
  if (!formData.organization?.trim()) {
    errors.organization = 'L\'organisation est requise';
  }

  // Validate password
  const passwordValidation = validatePassword(formData.password, {
    minLength: 6,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false
  });
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error!;
  }

  // Validate password confirmation
  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Veuillez confirmer votre mot de passe';
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Les mots de passe ne correspondent pas';
  }

  // Validate terms acceptance
  if (!formData.acceptTerms) {
    errors.acceptTerms = 'Vous devez accepter les conditions d\'utilisation';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates login form data
 */
export const validateLoginForm = (formData: {
  email: string;
  password: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  // Validate email
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  }

  // Validate password
  if (!formData.password) {
    errors.password = 'Le mot de passe est requis';
  } else if (formData.password.length < 6) {
    errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates resend verification form
 */
export const validateResendVerificationForm = (email: string): ValidationResult => {
  const errors: Record<string, string> = {};

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Real-time validation for form fields
 */
export const validateField = (
  fieldName: string,
  value: string,
  options?: any
): { isValid: boolean; error?: string } => {
  switch (fieldName) {
    case 'email':
      return validateEmail(value, options);
    case 'password':
      return validatePassword(value, options);
    case 'token':
      return validateVerificationToken(value);
    default:
      return { isValid: true };
  }
};

/**
 * Debounced validation for real-time feedback
 */
export const createDebouncedValidator = (
  validator: (value: string) => { isValid: boolean; error?: string },
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout;
  
  return (value: string, callback: (result: { isValid: boolean; error?: string }) => void) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validator(value);
      callback(result);
    }, delay);
  };
};