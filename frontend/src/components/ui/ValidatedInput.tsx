import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ValidationMessage from '@/components/ui/ValidationMessage';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateField } from '@/utils/validation';

interface ValidatedInputProps {
  id: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  label: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  showPasswordToggle?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validationOptions?: any;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helpText?: string;
}

const ValidatedInput: React.FC<ValidatedInputProps> = ({
  id,
  name,
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched = false,
  disabled = false,
  required = false,
  autoComplete,
  className,
  inputClassName,
  labelClassName,
  showPasswordToggle = false,
  validateOnChange = false,
  validateOnBlur = true,
  validationOptions,
  leftIcon,
  rightIcon,
  helpText
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [internalError, setInternalError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);

  const actualType = type === 'password' && showPassword ? 'text' : type;
  const hasError = error || internalError;
  const shouldShowError = touched && hasError;

  const handleValidation = useCallback((fieldValue: string) => {
    if (!validateOnChange && !validateOnBlur) return;

    setIsValidating(true);
    const result = validateField(name, fieldValue, validationOptions);
    setInternalError(result.error || '');
    setIsValidating(false);
  }, [name, validateOnChange, validateOnBlur, validationOptions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
    
    if (validateOnChange) {
      handleValidation(e.target.value);
    } else if (internalError) {
      // Clear error when user starts typing
      setInternalError('');
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (onBlur) {
      onBlur(e);
    }
    
    if (validateOnBlur) {
      handleValidation(e.target.value);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <Label 
        htmlFor={id} 
        className={cn(
          'text-sm font-medium text-gray-700',
          required && 'after:content-["*"] after:ml-0.5 after:text-red-500',
          labelClassName
        )}
      >
        {label}
      </Label>

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            {leftIcon}
          </div>
        )}

        {/* Input Field */}
        <Input
          id={id}
          name={name}
          type={actualType}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          className={cn(
            'w-full',
            leftIcon && 'pl-10',
            (rightIcon || (type === 'password' && showPasswordToggle)) && 'pr-10',
            shouldShowError && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            isValidating && 'opacity-75',
            inputClassName
          )}
        />

        {/* Right Icon or Password Toggle */}
        {(rightIcon || (type === 'password' && showPasswordToggle)) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
            {type === 'password' && showPasswordToggle ? (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                disabled={disabled}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            ) : (
              rightIcon
            )}
          </div>
        )}
      </div>

      {/* Help Text */}
      {helpText && !shouldShowError && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}

      {/* Error Message */}
      {shouldShowError && (
        <ValidationMessage 
          type="error" 
          message={error || internalError} 
        />
      )}
    </div>
  );
};

export default ValidatedInput;