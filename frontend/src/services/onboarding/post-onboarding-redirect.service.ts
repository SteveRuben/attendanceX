/**
 * Service de redirection post-onboarding
 * Gère la transition de l'onboarding vers le dashboard
 */

import { logger } from '../../utils/logger';

// Types pour le service de redirection
export interface TenantCreationResponse {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: 'active' | 'pending' | 'suspended';
    createdAt: Date;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface RedirectResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
  retryable?: boolean;
  suggestedAction?: string;
}

export enum OnboardingErrorType {
  TENANT_CREATION_FAILED = 'TENANT_CREATION_FAILED',
  TOKEN_SYNC_FAILED = 'TOKEN_SYNC_FAILED',
  DASHBOARD_ACCESS_DENIED = 'DASHBOARD_ACCESS_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND'
}

export interface OnboardingError {
  type: OnboardingErrorType;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
  suggestedAction?: string;
}

const API_BASE_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:5001/api/v1';

class PostOnboardingRedirectService {
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;

  /**
   * Gère la redirection complète après création de tenant
   */
  async handlePostOnboardingRedirect(
    tenantId: string,
    tokens?: { accessToken: string; refreshToken: string }
  ): Promise<RedirectResult> {
    try {
      logger.onboarding('🚀 Starting post-onboarding redirect process', { tenantId });

      // Étape 1: Valider que le tenant existe et est accessible
      const tenantValid = await this.validateTenantAccess(tenantId);
      if (!tenantValid) {
        return {
          success: false,
          error: 'Tenant validation failed',
          retryable: true,
          suggestedAction: 'Please try refreshing the page or contact support if the problem persists'
        };
      }

      // Étape 2: Synchroniser le contexte tenant si des tokens sont fournis
      if (tokens) {
        try {
          await this.syncTenantContext(tenantId, tokens);
          logger.onboarding('✅ Tenant context synchronized successfully', { tenantId });
        } catch (syncError) {
          logger.error('❌ Failed to sync tenant context', { tenantId, error: syncError });
          return {
            success: false,
            error: 'Failed to synchronize tenant context',
            retryable: true,
            suggestedAction: 'Please try logging out and logging back in'
          };
        }
      }

      // Étape 3: Construire l'URL de redirection
      const redirectUrl = this.buildDashboardUrl(tenantId);

      logger.onboarding('✅ Post-onboarding redirect completed successfully', { 
        tenantId, 
        redirectUrl 
      });

      return {
        success: true,
        redirectUrl
      };

    } catch (error) {
      logger.error('❌ Post-onboarding redirect failed', { tenantId, error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        retryable: this.isRetryableError(error),
        suggestedAction: this.getSuggestedAction(error)
      };
    }
  }

  /**
   * Valide que le tenant existe et est accessible
   */
  async validateTenantAccess(tenantId: string): Promise<boolean> {
    try {
      logger.onboarding('🔍 Validating tenant access', { tenantId });

      // Faire un appel API pour vérifier l'existence du tenant
      const response = await fetch(API_BASE_URL+`/tenants/${tenantId}/validate`, {
        method: 'GET',
        headers: {
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Tenant not found');
        }
        if (response.status === 403) {
          throw new Error('Access denied to tenant');
        }
        throw new Error(`Validation failed with status ${response.status}`);
      }

      const data = await response.json();
      const isValid = data.success && data.data?.isValid;

      logger.onboarding(isValid ? '✅ Tenant access validated' : '❌ Tenant access invalid', { 
        tenantId, 
        isValid 
      });

      return isValid;

    } catch (error) {
      logger.error('❌ Tenant validation error', { tenantId, error });
      return false;
    }
  }

  /**
   * Synchronise le contexte tenant avec les nouveaux tokens
   */
  async syncTenantContext(
    tenantId: string,
    tokens: { accessToken: string; refreshToken: string }
  ): Promise<void> {
    try {
      logger.onboarding('🔄 Synchronizing tenant context', { tenantId });

      // Mettre à jour les tokens dans le localStorage
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      // Déclencher un événement pour notifier les contextes React
      window.dispatchEvent(new CustomEvent('tenantContextUpdated', {
        detail: {
          tenantId,
          tokens,
          timestamp: new Date().toISOString()
        }
      }));

      // Attendre un court délai pour permettre la synchronisation
      await this.delay(500);

      logger.onboarding('✅ Tenant context synchronized', { tenantId });

    } catch (error) {
      logger.error('❌ Failed to sync tenant context', { tenantId, error });
      throw error;
    }
  }

  /**
   * Construit l'URL du dashboard pour le tenant
   */
  private buildDashboardUrl(tenantId: string): string {
    // Pour l'instant, utiliser l'URL simple du dashboard
    // Plus tard, on pourra ajouter des paramètres spécifiques au tenant
    return `/dashboard?tenant=${tenantId}&firstAccess=true`;
  }

  /**
   * Détermine si une erreur est récupérable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Erreurs réseau temporaires
      if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
        return true;
      }
      
      // Erreurs de serveur temporaires
      if (message.includes('500') || message.includes('502') || message.includes('503')) {
        return true;
      }
      
      // Erreurs de synchronisation
      if (message.includes('sync') || message.includes('context')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Fournit une action suggérée basée sur le type d'erreur
   */
  private getSuggestedAction(error: any): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('network') || message.includes('timeout')) {
        return 'Please check your internet connection and try again';
      }
      
      if (message.includes('not found')) {
        return 'The organization may not have been created properly. Please try creating it again';
      }
      
      if (message.includes('access denied') || message.includes('403')) {
        return 'You may not have permission to access this organization. Please contact support';
      }
      
      if (message.includes('sync') || message.includes('context')) {
        return 'Please try logging out and logging back in to refresh your session';
      }
    }
    
    return 'Please try again or contact support if the problem persists';
  }

  /**
   * Utilitaire pour ajouter un délai
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry avec backoff exponentiel
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.MAX_RETRY_ATTEMPTS,
    baseDelay: number = this.RETRY_DELAY_MS
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts || !this.isRetryableError(error)) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.onboarding(`⏳ Retry attempt ${attempt}/${maxAttempts} in ${delay}ms`, { error });
        await this.delay(delay);
      }
    }

    throw lastError!;
  }
}

// Export singleton instance
export const postOnboardingRedirectService = new PostOnboardingRedirectService();