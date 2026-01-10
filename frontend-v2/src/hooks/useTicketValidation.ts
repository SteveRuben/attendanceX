import { useState, useCallback } from 'react';
import { ticketService } from '../services/ticketService';
import {
  TicketValidationRequest,
  TicketValidationResult,
  EventTicket
} from '../types/ticket.types';

export interface UseTicketValidationReturn {
  validationResult: TicketValidationResult | null;
  validating: boolean;
  error: string | null;
  validateTicket: (request: TicketValidationRequest) => Promise<TicketValidationResult | null>;
  checkInTicket: (ticketId: string) => Promise<EventTicket | null>;
  clearResult: () => void;
  clearError: () => void;
}

export const useTicketValidation = (): UseTicketValidationReturn => {
  const [validationResult, setValidationResult] = useState<TicketValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateTicket = useCallback(async (
    request: TicketValidationRequest
  ): Promise<TicketValidationResult | null> => {
    setValidating(true);
    setError(null);

    try {
      const result = await ticketService.validateTicket(request);
      setValidationResult(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la validation du billet';
      setError(errorMessage);
      setValidationResult(null);
      return null;
    } finally {
      setValidating(false);
    }
  }, []);

  const checkInTicket = useCallback(async (ticketId: string): Promise<EventTicket | null> => {
    setValidating(true);
    setError(null);

    try {
      const ticket = await ticketService.checkInTicket(ticketId);
      
      // Update validation result if it exists
      if (validationResult && validationResult.ticket?.id === ticketId) {
        setValidationResult({
          ...validationResult,
          ticket: ticket
        });
      }

      return ticket;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du check-in du billet';
      setError(errorMessage);
      return null;
    } finally {
      setValidating(false);
    }
  }, [validationResult]);

  const clearResult = useCallback(() => {
    setValidationResult(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    validationResult,
    validating,
    error,
    validateTicket,
    checkInTicket,
    clearResult,
    clearError
  };
};