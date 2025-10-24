/**
 * Utilitaire de logging pour le frontend
 * Fournit une interface cohérente pour le logging avec différents niveaux
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  context?: string;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    
    const logEntry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      context: 'Frontend'
    };

    // En développement, utiliser console avec couleurs
    if (this.isDevelopment) {
      const styles = {
        [LogLevel.DEBUG]: 'color: #6b7280',
        [LogLevel.INFO]: 'color: #3b82f6',
        [LogLevel.WARN]: 'color: #f59e0b',
        [LogLevel.ERROR]: 'color: #ef4444'
      };

      console.log(
        `%c[${timestamp}] ${levelName}: ${message}`,
        styles[level],
        data || ''
      );
    } else {
      // En production, utiliser console simple
      const logMethod = {
        [LogLevel.DEBUG]: console.debug,
        [LogLevel.INFO]: console.info,
        [LogLevel.WARN]: console.warn,
        [LogLevel.ERROR]: console.error
      }[level];

      logMethod(`[${timestamp}] ${levelName}: ${message}`, data || '');
    }

    // En production, on pourrait envoyer les logs à un service externe
    if (!this.isDevelopment && level >= LogLevel.ERROR) {
      this.sendToExternalService(logEntry);
    }
  }

  private sendToExternalService(logEntry: LogEntry): void {
    // TODO: Implémenter l'envoi vers un service de logging externe
    // Par exemple: Sentry, LogRocket, etc.
    try {
      // Exemple d'envoi vers une API de logging
      // fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logEntry)
      // });
    } catch (error) {
      // Ne pas faire échouer l'application si le logging externe échoue
      console.error('Failed to send log to external service:', error);
    }
  }

  debug(message: string, data?: any): void {
    this.formatMessage(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.formatMessage(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.formatMessage(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.formatMessage(LogLevel.ERROR, message, data);
  }

  // Méthodes utilitaires pour des contextes spécifiques
  auth(message: string, data?: any): void {
    this.info(`[AUTH] ${message}`, data);
  }

  tenant(message: string, data?: any): void {
    this.info(`[TENANT] ${message}`, data);
  }

  onboarding(message: string, data?: any): void {
    this.info(`[ONBOARDING] ${message}`, data);
  }

  api(message: string, data?: any): void {
    this.info(`[API] ${message}`, data);
  }

  // Méthode pour changer le niveau de log dynamiquement
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  // Méthode pour obtenir le niveau de log actuel
  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;