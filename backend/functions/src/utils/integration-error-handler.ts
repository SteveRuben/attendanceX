import { logger } from 'firebase-functions';
import { IntegrationProvider } from '@attendance-x/shared';

export interface IntegrationError {
  code: string;
  message: string;
  provider: IntegrationProvider;
  userId: string;
  integrationId: string;
  timestamp: Date;
  retryable: boolean;
  context?: Record<string, any>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class IntegrationErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2
  };

  private static readonly ERROR_CODES = {
    // OAuth errors
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    REFRESH_FAILED: 'REFRESH_FAILED',
    AUTHORIZATION_REVOKED: 'AUTHORIZATION_REVOKED',
    
    // API errors
    RATE_LIMITED: 'RATE_LIMITED',
    API_UNAVAILABLE: 'API_UNAVAILABLE',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    
    // Sync errors
    SYNC_CONFLICT: 'SYNC_CONFLICT',
    DATA_VALIDATION_ERROR: 'DATA_VALIDATION_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    
    // System errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
  };

  /**
   * Détermine si une erreur est récupérable avec retry
   */
  static isRetryable(error: IntegrationError): boolean {
    const retryableCodes = [
      this.ERROR_CODES.RATE_LIMITED,
      this.ERROR_CODES.API_UNAVAILABLE,
      this.ERROR_CODES.NETWORK_ERROR,
      this.ERROR_CODES.TOKEN_EXPIRED
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * Calcule le délai pour le prochain retry avec backoff exponentiel
   */
  static calculateRetryDelay(
    attempt: number, 
    config: RetryConfig = this.DEFAULT_RETRY_CONFIG
  ): number {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  /**
   * Exécute une opération avec retry automatique
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: {
      provider: IntegrationProvider;
      userId: string;
      integrationId: string;
      operationName: string;
    },
    config: RetryConfig = this.DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          logger.info('Operation succeeded after retry', {
            ...context,
            attempt,
            totalAttempts: attempt
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        const integrationError = this.parseError(error as Error, context);
        
        logger.warn('Operation failed', {
          ...context,
          attempt,
          error: integrationError,
          willRetry: attempt <= config.maxRetries && this.isRetryable(integrationError)
        });

        // Si c'est le dernier essai ou l'erreur n'est pas récupérable
        if (attempt > config.maxRetries || !this.isRetryable(integrationError)) {
          await this.handleFinalError(integrationError);
          throw error;
        }

        // Attendre avant le prochain essai
        const delay = this.calculateRetryDelay(attempt, config);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Parse une erreur en IntegrationError structurée
   */
  static parseError(
    error: Error, 
    context: {
      provider: IntegrationProvider;
      userId: string;
      integrationId: string;
    }
  ): IntegrationError {
    let code = this.ERROR_CODES.INTERNAL_ERROR;
    let retryable = false;

    // Analyser le type d'erreur basé sur le message ou les propriétés
    if (error.message.includes('token') && error.message.includes('expired')) {
      code = this.ERROR_CODES.TOKEN_EXPIRED;
      retryable = true;
    } else if (error.message.includes('rate limit')) {
      code = this.ERROR_CODES.RATE_LIMITED;
      retryable = true;
    } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      code = this.ERROR_CODES.NETWORK_ERROR;
      retryable = true;
    } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
      code = this.ERROR_CODES.PERMISSION_DENIED;
      retryable = false;
    } else if (error.message.includes('quota')) {
      code = this.ERROR_CODES.QUOTA_EXCEEDED;
      retryable = false;
    }

    return {
      code,
      message: error.message,
      provider: context.provider,
      userId: context.userId,
      integrationId: context.integrationId,
      timestamp: new Date(),
      retryable,
      context: {
        stack: error.stack,
        name: error.name
      }
    };
  }

  /**
   * Gère les erreurs finales (après tous les retries)
   */
  private static async handleFinalError(error: IntegrationError): Promise<void> {
    logger.error('Integration operation failed permanently', error);

    // Enregistrer l'erreur pour le monitoring
    await this.recordError(error);

    // Notifier l'utilisateur si nécessaire
    await this.notifyUserIfNeeded(error);

    // Prendre des actions correctives automatiques
    await this.takeCorrectiveActions(error);
  }

  /**
   * Enregistre l'erreur pour le monitoring et l'analyse
   */
  private static async recordError(error: IntegrationError): Promise<void> {
    try {
      // Ici, on pourrait enregistrer dans une base de données d'erreurs
      // ou envoyer à un service de monitoring comme Sentry
      logger.error('Recording integration error', {
        errorCode: error.code,
        provider: error.provider,
        userId: error.userId,
        timestamp: error.timestamp
      });
    } catch (recordingError) {
      logger.error('Failed to record integration error', recordingError);
    }
  }

  /**
   * Notifie l'utilisateur si l'erreur nécessite une action de sa part
   */
  private static async notifyUserIfNeeded(error: IntegrationError): Promise<void> {
    const userActionRequired = [
      this.ERROR_CODES.TOKEN_INVALID,
      this.ERROR_CODES.AUTHORIZATION_REVOKED,
      this.ERROR_CODES.PERMISSION_DENIED
    ];

    if (userActionRequired.includes(error.code)) {
      try {
        // Ici, on enverrait une notification à l'utilisateur
        logger.info('User notification required for integration error', {
          userId: error.userId,
          errorCode: error.code,
          provider: error.provider
        });
      } catch (notificationError) {
        logger.error('Failed to notify user of integration error', notificationError);
      }
    }
  }

  /**
   * Prend des actions correctives automatiques
   */
  private static async takeCorrectiveActions(error: IntegrationError): Promise<void> {
    try {
      switch (error.code) {
        case this.ERROR_CODES.TOKEN_EXPIRED:
          // Tenter de rafraîchir le token
          logger.info('Attempting automatic token refresh', {
            integrationId: error.integrationId
          });
          break;

        case this.ERROR_CODES.AUTHORIZATION_REVOKED:
          // Marquer l'intégration comme déconnectée
          logger.info('Marking integration as disconnected', {
            integrationId: error.integrationId
          });
          break;

        case this.ERROR_CODES.QUOTA_EXCEEDED:
          // Suspendre temporairement la synchronisation
          logger.info('Temporarily suspending sync due to quota', {
            integrationId: error.integrationId
          });
          break;
      }
    } catch (actionError) {
      logger.error('Failed to take corrective action', actionError);
    }
  }

  /**
   * Génère un message d'erreur convivial pour l'utilisateur
   */
  static getUserFriendlyMessage(error: IntegrationError): string {
    const messages = {
      [this.ERROR_CODES.TOKEN_EXPIRED]: 
        'Votre connexion a expiré. Veuillez vous reconnecter à votre compte.',
      [this.ERROR_CODES.TOKEN_INVALID]: 
        'Votre autorisation n\'est plus valide. Veuillez vous reconnecter.',
      [this.ERROR_CODES.AUTHORIZATION_REVOKED]: 
        'L\'accès à votre compte a été révoqué. Veuillez autoriser à nouveau l\'application.',
      [this.ERROR_CODES.RATE_LIMITED]: 
        'Trop de requêtes ont été effectuées. Veuillez patienter quelques minutes.',
      [this.ERROR_CODES.API_UNAVAILABLE]: 
        'Le service est temporairement indisponible. Nous réessayerons automatiquement.',
      [this.ERROR_CODES.QUOTA_EXCEEDED]: 
        'La limite d\'utilisation a été atteinte. La synchronisation reprendra demain.',
      [this.ERROR_CODES.PERMISSION_DENIED]: 
        'Permissions insuffisantes. Veuillez vérifier les autorisations accordées.',
      [this.ERROR_CODES.NETWORK_ERROR]: 
        'Problème de connexion réseau. Vérifiez votre connexion internet.',
      [this.ERROR_CODES.SYNC_CONFLICT]: 
        'Conflit de synchronisation détecté. Certaines données n\'ont pas pu être synchronisées.',
      [this.ERROR_CODES.DATA_VALIDATION_ERROR]: 
        'Erreur de validation des données. Certaines informations sont incorrectes.',
      [this.ERROR_CODES.INTERNAL_ERROR]: 
        'Une erreur interne s\'est produite. Notre équipe a été notifiée.',
      [this.ERROR_CODES.CONFIGURATION_ERROR]: 
        'Erreur de configuration. Veuillez contacter le support technique.'
    };

    return messages[error.code] || 'Une erreur inattendue s\'est produite.';
  }

  /**
   * Génère des suggestions d'actions pour l'utilisateur
   */
  static getUserActionSuggestions(error: IntegrationError): string[] {
    const suggestions: Record<string, string[]> = {
      [this.ERROR_CODES.TOKEN_EXPIRED]: [
        'Cliquez sur "Reconnecter" dans les paramètres d\'intégration',
        'Vérifiez que votre compte est toujours actif'
      ],
      [this.ERROR_CODES.PERMISSION_DENIED]: [
        'Vérifiez les permissions accordées à l\'application',
        'Reconnectez-vous en accordant toutes les permissions nécessaires'
      ],
      [this.ERROR_CODES.NETWORK_ERROR]: [
        'Vérifiez votre connexion internet',
        'Réessayez dans quelques minutes',
        'Contactez votre administrateur réseau si le problème persiste'
      ],
      [this.ERROR_CODES.QUOTA_EXCEEDED]: [
        'Attendez la réinitialisation du quota (généralement 24h)',
        'Contactez votre administrateur pour augmenter les limites'
      ]
    };

    return suggestions[error.code] || [
      'Réessayez dans quelques minutes',
      'Contactez le support si le problème persiste'
    ];
  }
}