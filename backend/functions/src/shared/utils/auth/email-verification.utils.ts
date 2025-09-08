// shared/utils/auth/email-verification.utils.ts

import { logger } from "firebase-functions";

/**
 * Utilitaires pour la gestion des URLs de vérification d'email
 */
export class EmailVerificationUtils {
  
  /**
   * Valide qu'une URL de base est correctement formatée
   */
  static validateBaseUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Nettoie et normalise une URL de base
   */
  static normalizeBaseUrl(url: string): string {
    if (!url) {
      throw new Error('Base URL is required');
    }

    // Supprimer les espaces
    url = url.trim();

    // Ajouter https:// si aucun protocole n'est spécifié
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    // Supprimer le slash final
    url = url.replace(/\/$/, '');

    // Valider l'URL
    if (!this.validateBaseUrl(url)) {
      throw new Error(`Invalid base URL: ${url}`);
    }

    return url;
  }

  /**
   * Normalise un chemin de route
   */
  static normalizeRoutePath(path: string): string {
    if (!path) {
      return '/verify-email';
    }

    // Supprimer les espaces
    path = path.trim();

    // S'assurer que le chemin commence par /
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }

    // Supprimer le slash final sauf si c'est juste "/"
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    return path;
  }

  /**
   * Construit une URL de vérification complète
   */
  static buildVerificationUrl(
    baseUrl: string,
    routePath: string,
    token: string,
    additionalParams?: Record<string, string>
  ): string {
    try {
      const normalizedBaseUrl = this.normalizeBaseUrl(baseUrl);
      const normalizedPath = this.normalizeRoutePath(routePath);
      
      // Construire l'URL de base
      const url = new URL(normalizedPath, normalizedBaseUrl);
      
      // Ajouter le token
      url.searchParams.set('token', token);
      
      // Ajouter les paramètres additionnels
      if (additionalParams) {
        Object.entries(additionalParams).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
      }

      const finalUrl = url.toString();
      
      logger.debug('Built verification URL', {
        baseUrl: normalizedBaseUrl,
        routePath: normalizedPath,
        hasToken: !!token,
        additionalParams: additionalParams ? Object.keys(additionalParams) : []
      });

      return finalUrl;

    } catch (error) {
      logger.error('Failed to build verification URL', {
        baseUrl,
        routePath,
        hasToken: !!token,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to build verification URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extrait le token d'une URL de vérification
   */
  static extractTokenFromUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.searchParams.get('token');
    } catch {
      return null;
    }
  }

  /**
   * Valide qu'un token a le bon format
   */
  static validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Le token doit être une chaîne hexadécimale de 64 caractères (32 bytes en hex)
    const tokenRegex = /^[a-f0-9]{64}$/i;
    return tokenRegex.test(token);
  }

  /**
   * Génère les variables par défaut pour le template d'email
   */
  static generateDefaultTemplateVariables(
    userName: string,
    verificationUrl: string,
    expirationHours: number = 24
  ): Record<string, string> {
    return {
      userName: userName || 'Utilisateur',
      verificationUrl,
      expirationTime: this.formatExpirationTime(expirationHours),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@attendance-x.com',
      appName: process.env.APP_NAME || 'Attendance-X'
    };
  }

  /**
   * Formate le temps d'expiration en français
   */
  static formatExpirationTime(hours: number): string {
    if (hours <= 0) {
      return 'immédiatement';
    }

    if (hours === 1) {
      return '1 heure';
    } else if (hours < 24) {
      return `${hours} heures`;
    } else if (hours === 24) {
      return '24 heures (1 jour)';
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      
      if (remainingHours === 0) {
        return days === 1 ? '1 jour' : `${days} jours`;
      } else {
        return `${days} jour${days > 1 ? 's' : ''} et ${remainingHours} heure${remainingHours > 1 ? 's' : ''}`;
      }
    }
  }

  /**
   * Valide les variables requises pour le template
   */
  static validateTemplateVariables(variables: Record<string, any>): {
    isValid: boolean;
    missingVariables: string[];
    invalidVariables: string[];
  } {
    const requiredVariables = ['userName', 'verificationUrl', 'expirationTime', 'supportEmail', 'appName'];
    const missingVariables: string[] = [];
    const invalidVariables: string[] = [];

    requiredVariables.forEach(variable => {
      const value = variables[variable];
      
      if (value === undefined || value === null) {
        missingVariables.push(variable);
      } else if (typeof value !== 'string' || value.trim() === '') {
        invalidVariables.push(variable);
      }
    });

    // Validation spécifique pour l'URL de vérification
    if (variables.verificationUrl && !this.validateBaseUrl(variables.verificationUrl)) {
      invalidVariables.push('verificationUrl');
    }

    return {
      isValid: missingVariables.length === 0 && invalidVariables.length === 0,
      missingVariables,
      invalidVariables
    };
  }

  /**
   * Génère un résumé des paramètres de configuration pour les logs
   */
  static generateConfigSummary(): Record<string, any> {
    return {
      frontendUrl: process.env.FRONTEND_URL || 'not configured',
      supportEmail: process.env.SUPPORT_EMAIL || 'not configured',
      appName: process.env.APP_NAME || 'not configured',
      defaultExpirationHours: 24,
      defaultRoutePath: '/verify-email'
    };
  }
}

/**
 * Constantes pour la vérification d'email
 */
export const EMAIL_VERIFICATION_CONSTANTS = {
  DEFAULT_EXPIRATION_HOURS: 24,
  DEFAULT_ROUTE_PATH: '/verify-email',
  DEFAULT_APP_NAME: 'Attendance-X',
  DEFAULT_SUPPORT_EMAIL: 'support@attendance-x.com',
  TOKEN_LENGTH: 64, // 32 bytes en hexadécimal
  MAX_URL_LENGTH: 2048,
  TEMPLATE_ID: 'email_verification',
  NOTIFICATION_TEMPLATE_ID: 'email_verification'
} as const;