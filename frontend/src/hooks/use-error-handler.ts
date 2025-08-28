// frontend/src/hooks/use-error-handler.ts
import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

interface ErrorState {
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
}

interface ErrorHandlerOptions {
  showToast?: boolean;
  toastMessage?: string;
  logError?: boolean;
  fallbackMessage?: string;
}

export const useErrorHandler = () => {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    isLoading: false
  });

  const handleError = useCallback((
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      toastMessage,
      logError = true,
      fallbackMessage = 'Une erreur inattendue s\'est produite'
    } = options;

    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    if (logError) {
      console.error('Error handled:', errorObj);
    }

    setErrorState({
      error: errorObj,
      isError: true,
      isLoading: false
    });

    if (showToast) {
      const message = toastMessage || errorObj.message || fallbackMessage;
      toast.error(message);
    }

    return errorObj;
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      isLoading: false
    });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setErrorState(prev => ({
      ...prev,
      isLoading: loading
    }));
  }, []);

  const executeWithErrorHandling = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      setLoading(true);
      clearError();
      const result = await asyncFn();
      setLoading(false);
      return result;
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError, clearError, setLoading]);

  return {
    ...errorState,
    handleError,
    clearError,
    setLoading,
    executeWithErrorHandling
  };
};

export default useErrorHandler;