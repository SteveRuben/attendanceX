/**
 * Service de gestion d'erreurs pour l'application de présence
 */

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp: number;
  userAgent: string;
  url: string;
}

interface ErrorReport {
  id: string;
  error: Error;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
  retryCount: number;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: Error) => boolean;
}

class ErrorHandlerService {
  private errorReports: Map<string, ErrorReport> = new Map();
  private errorListeners: Array<(report: ErrorReport) => void> = [];
  private retryQueue: Map<string, () => Promise<any>> = new Map();
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error) => this.isRetryableError(error)
  };

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  /**
   * Configuration des gestionnaires d'erreurs globaux
   */
  private setupGlobalErrorHandlers() {
    // Erreurs JavaScript non gérées
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        component: 'global',
        action: 'unhandled_error',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    });

    // Promesses rejetées non gérées
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        component: 'global',
        action: 'unhandled_rejection',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    });

    // Erreurs API personnalisées
    window.addEventListener('api-error', (event: any) => {
      this.handleApiError(event.detail.error, event.detail.context);
    });
  }

  /**
   * Gérer une erreur
   */
  handleError(
    error: Error,
    context: Partial<ErrorContext> = {},
    severity: ErrorReport['severity'] = 'medium'
  ): string {
    const errorId = this.generateErrorId();
    const fullContext: ErrorContext = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    };

    const report: ErrorReport = {
      id: errorId,
      error,
      context: fullContext,
      severity,
      handled: false,
      retryCount: 0
    };

    this.errorReports.set(errorId, report);
    this.notifyErrorListeners(report);
    this.logError(report);

    // Envoyer l'erreur au service de monitoring si configuré
    this.sendToMonitoring(report);

    return errorId;
  }

  /**
   * Gérer une erreur API spécifique
   */
  private handleApiError(error: any, context?: any) {
    const severity = this.determineApiErrorSeverity(error);
    
    this.handleError(error, {
      component: 'api',
      action: context?.endpoint || 'unknown',
      ...context
    }, severity);
  }

  /**
   * Déterminer la sévérité d'une erreur API
   */
  private determineApiErrorSeverity(error: any): ErrorReport['severity'] {
    if (error.status >= 500) return 'high';
    if (error.status === 401 || error.status === 403) return 'medium';
    if (error.status >= 400) return 'low';
    return 'medium';
  }

  /**
   * Exécuter une fonction avec retry automatique
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context: Partial<ErrorContext> = {}
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: Error;
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Vérifier si l'erreur est retryable
        if (!retryConfig.retryCondition || !retryConfig.retryCondition(lastError)) {
          break;
        }

        // Si c'est la dernière tentative, ne pas attendre
        if (attempt === retryConfig.maxAttempts) {
          break;
        }

        // Calculer le délai d'attente
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt - 1),
          retryConfig.maxDelay
        );

        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
        await this.delay(delay);
      }
    }

    // Enregistrer l'erreur finale
    this.handleError(lastError!, {
      ...context,
      action: `${context.action}_retry_failed`
    }, 'high');

    throw lastError!;
  }

  /**
   * Vérifier si une erreur est retryable
   */
  private isRetryableError(error: Error): boolean {
    // Erreurs réseau
    if (error.name === 'TypeError' || error.name === 'NetworkError') {
      return true;
    }

    // Erreurs API temporaires
    if ('status' in error) {
      const status = (error as any).status;
      return status >= 500 || status === 429 || status === 408;
    }

    // Erreurs de timeout
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      return true;
    }

    return false;
  }

  /**
   * Ajouter une fonction à la queue de retry
   */
  addToRetryQueue(
    id: string,
    fn: () => Promise<any>,
    config?: Partial<RetryConfig>
  ): void {
    this.retryQueue.set(id, () => this.withRetry(fn, config));
  }

  /**
   * Exécuter la queue de retry
   */
  async processRetryQueue(): Promise<void> {
    const promises = Array.from(this.retryQueue.entries()).map(async ([id, fn]) => {
      try {
        await fn();
        this.retryQueue.delete(id);
      } catch (error) {
        console.error(`Retry queue item ${id} failed:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Marquer une erreur comme gérée
   */
  markAsHandled(errorId: string): void {
    const report = this.errorReports.get(errorId);
    if (report) {
      report.handled = true;
      this.errorReports.set(errorId, report);
    }
  }

  /**
   * Obtenir un rapport d'erreur
   */
  getErrorReport(errorId: string): ErrorReport | undefined {
    return this.errorReports.get(errorId);
  }

  /**
   * Obtenir tous les rapports d'erreur
   */
  getAllErrorReports(): ErrorReport[] {
    return Array.from(this.errorReports.values());
  }

  /**
   * Obtenir les erreurs non gérées
   */
  getUnhandledErrors(): ErrorReport[] {
    return this.getAllErrorReports().filter(report => !report.handled);
  }

  /**
   * Obtenir les erreurs par sévérité
   */
  getErrorsBySeverity(severity: ErrorReport['severity']): ErrorReport[] {
    return this.getAllErrorReports().filter(report => report.severity === severity);
  }

  /**
   * Ajouter un écouteur d'erreurs
   */
  addErrorListener(listener: (report: ErrorReport) => void): () => void {
    this.errorListeners.push(listener);
    
    // Retourner une fonction de nettoyage
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifier les écouteurs d'erreurs
   */
  private notifyErrorListeners(report: ErrorReport): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(report);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  /**
   * Logger une erreur
   */
  private logError(report: ErrorReport): void {
    const logLevel = this.getLogLevel(report.severity);
    const message = `[${report.severity.toUpperCase()}] ${report.error.message}`;
    
    console[logLevel](message, {
      errorId: report.id,
      context: report.context,
      stack: report.error.stack
    });
  }

  /**
   * Obtenir le niveau de log selon la sévérité
   */
  private getLogLevel(severity: ErrorReport['severity']): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'low': return 'log';
      case 'medium': return 'warn';
      case 'high':
      case 'critical': return 'error';
      default: return 'warn';
    }
  }

  /**
   * Envoyer l'erreur au service de monitoring
   */
  private async sendToMonitoring(report: ErrorReport): Promise<void> {
    // Ne pas envoyer les erreurs de faible sévérité en production
    if (report.severity === 'low' && process.env.NODE_ENV === 'production') {
      return;
    }

    try {
      // Simuler l'envoi vers un service de monitoring
      // await fetch('/api/monitoring/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     id: report.id,
      //     message: report.error.message,
      //     stack: report.error.stack,
      //     context: report.context,
      //     severity: report.severity,
      //     timestamp: report.context.timestamp
      //   })
      // });
    } catch (error) {
      console.warn('Failed to send error to monitoring service:', error);
    }
  }

  /**
   * Nettoyer les anciens rapports d'erreur
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    
    for (const [id, report] of this.errorReports.entries()) {
      if (report.context.timestamp < cutoff) {
        this.errorReports.delete(id);
      }
    }
  }

  /**
   * Obtenir les statistiques d'erreurs
   */
  getErrorStats(): {
    total: number;
    bySevertiy: Record<string, number>;
    handled: number;
    unhandled: number;
    retryQueueSize: number;
  } {
    const reports = this.getAllErrorReports();
    const bySevertiy = reports.reduce((acc, report) => {
      acc[report.severity] = (acc[report.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: reports.length,
      bySevertiy,
      handled: reports.filter(r => r.handled).length,
      unhandled: reports.filter(r => !r.handled).length,
      retryQueueSize: this.retryQueue.size
    };
  }

  // === MÉTHODES UTILITAIRES ===

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instance singleton
export const errorHandlerService = new ErrorHandlerService();

// Hook React pour la gestion d'erreurs
export const useErrorHandler = () => {
  const [errors, setErrors] = React.useState<ErrorReport[]>([]);

  React.useEffect(() => {
    const removeListener = errorHandlerService.addErrorListener((report) => {
      setErrors(prev => [...prev, report]);
    });

    // Charger les erreurs existantes
    setErrors(errorHandlerService.getUnhandledErrors());

    return removeListener;
  }, []);

  return {
    errors,
    handleError: errorHandlerService.handleError.bind(errorHandlerService),
    withRetry: errorHandlerService.withRetry.bind(errorHandlerService),
    markAsHandled: errorHandlerService.markAsHandled.bind(errorHandlerService),
    getErrorStats: errorHandlerService.getErrorStats.bind(errorHandlerService),
    clearErrors: () => setErrors([])
  };
};