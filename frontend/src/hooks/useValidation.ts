import { useState, useCallback, useEffect } from 'react';
import { 
  validateEmail, 
  validatePassword, 
  validateVerificationToken,
  validateRegistrationForm,
  validateLoginForm,
  validateResendVerificationForm,
  createDebouncedValidator,
  type ValidationResult
} from '@/utils/validation';

interface UseValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

interface FieldValidation {
  isValid: boolean;
  error?: string;
  touched: boolean;
}

interface UseValidationReturn<T> {
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  validateField: (field: keyof T, value: string) => void;
  validateForm: (formData: T) => boolean;
  setFieldTouched: (field: keyof T, touched?: boolean) => void;
  clearErrors: () => void;
  clearFieldError: (field: keyof T) => void;
  getFieldValidation: (field: keyof T) => FieldValidation;
}

/**
 * Hook for form validation with real-time feedback
 */
export function useValidation<T extends Record<string, any>>(
  initialData: T,
  options: UseValidationOptions = {}
): UseValidationReturn<T> {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300
  } = options;

  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  // Create debounced validators for each field type
  const debouncedEmailValidator = useCallback(
    createDebouncedValidator(validateEmail, debounceMs),
    [debounceMs]
  );

  const debouncedPasswordValidator = useCallback(
    createDebouncedValidator(validatePassword, debounceMs),
    [debounceMs]
  );

  const debouncedTokenValidator = useCallback(
    createDebouncedValidator(validateVerificationToken, debounceMs),
    [debounceMs]
  );

  const validateField = useCallback((field: keyof T, value: string) => {
    const fieldName = String(field);
    
    const handleValidationResult = (result: { isValid: boolean; error?: string }) => {
      setErrors(prev => ({
        ...prev,
        [field]: result.error || ''
      }));
    };

    // Use appropriate validator based on field name
    if (fieldName === 'email') {
      if (validateOnChange) {
        debouncedEmailValidator(value, handleValidationResult);
      } else {
        const result = validateEmail(value);
        handleValidationResult(result);
      }
    } else if (fieldName === 'password') {
      if (validateOnChange) {
        debouncedPasswordValidator(value, handleValidationResult);
      } else {
        const result = validatePassword(value);
        handleValidationResult(result);
      }
    } else if (fieldName === 'token') {
      if (validateOnChange) {
        debouncedTokenValidator(value, handleValidationResult);
      } else {
        const result = validateVerificationToken(value);
        handleValidationResult(result);
      }
    } else if (fieldName === 'confirmPassword') {
      // Special handling for password confirmation
      const password = (initialData as any).password || '';
      const isValid = value === password;
      handleValidationResult({
        isValid,
        error: isValid ? undefined : 'Les mots de passe ne correspondent pas'
      });
    } else {
      // Generic validation for other fields
      const isValid = value.trim().length > 0;
      handleValidationResult({
        isValid,
        error: isValid ? undefined : 'Ce champ est requis'
      });
    }
  }, [validateOnChange, debouncedEmailValidator, debouncedPasswordValidator, debouncedTokenValidator, initialData]);

  const validateForm = useCallback((formData: T): boolean => {
    let validationResult: ValidationResult;

    // Use appropriate form validator based on form structure
    if ('firstName' in formData && 'lastName' in formData && 'organization' in formData) {
      // Registration form
      validationResult = validateRegistrationForm(formData as any);
    } else if ('email' in formData && 'password' in formData && Object.keys(formData).length === 2) {
      // Login form
      validationResult = validateLoginForm(formData as any);
    } else if ('email' in formData && Object.keys(formData).length === 1) {
      // Resend verification form
      validationResult = validateResendVerificationForm((formData as any).email);
    } else {
      // Generic validation - check all fields are not empty
      const newErrors: Record<keyof T, string> = {} as Record<keyof T, string>;
      let isValid = true;

      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (typeof value === 'string' && !value.trim()) {
          newErrors[key as keyof T] = 'Ce champ est requis';
          isValid = false;
        }
      });

      validationResult = { isValid, errors: newErrors };
    }

    setErrors(validationResult.errors as Record<keyof T, string>);
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key as keyof T] = true;
      return acc;
    }, {} as Record<keyof T, boolean>);
    setTouched(allTouched);

    return validationResult.isValid;
  }, []);

  const setFieldTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [field]: isTouched
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({} as Record<keyof T, string>);
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  }, []);

  const getFieldValidation = useCallback((field: keyof T): FieldValidation => {
    return {
      isValid: !errors[field],
      error: errors[field],
      touched: touched[field] || false
    };
  }, [errors, touched]);

  const isValid = Object.values(errors).every(error => !error);

  return {
    errors,
    touched,
    isValid,
    validateField,
    validateForm,
    setFieldTouched,
    clearErrors,
    clearFieldError,
    getFieldValidation
  };
}

/**
 * Hook specifically for email validation with real-time feedback
 */
export function useEmailValidation(options: UseValidationOptions = {}) {
  return useValidation({ email: '' }, options);
}

/**
 * Hook specifically for password validation with strength indicator
 */
export function usePasswordValidation(options: UseValidationOptions = {}) {
  const [strength, setStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  
  const validation = useValidation({ password: '' }, options);

  const validatePasswordWithStrength = useCallback((password: string) => {
    const result = validatePassword(password);
    setStrength(result.strength || 'weak');
    validation.validateField('password', password);
  }, [validation]);

  return {
    ...validation,
    strength,
    validatePassword: validatePasswordWithStrength
  };
}

/**
 * Hook for login form validation
 */
export function useLoginValidation(options: UseValidationOptions = {}) {
  return useValidation({ email: '', password: '' }, options);
}

/**
 * Hook for registration form validation
 */
export function useRegistrationValidation(options: UseValidationOptions = {}) {
  return useValidation({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  }, options);
}

export default useValidation;