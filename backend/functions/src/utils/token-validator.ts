import { ERROR_CODES } from "@attendance-x/shared";
import { logger } from "firebase-functions";

/**
 * Interface pour le résultat de validation de token
 */
export interface TokenValidationResult {
  isValid: boolean;
  cleanedToken?: string;
  error?: string;
  errorCode?: string;
  details?: {
    originalLength?: number;
    cleanedLength?: number;
    hasInvisibleChars?: boolean;
    structure?: {
      hasDots: boolean;
      partCount: number;
      isBase64Like: boolean;
    };
  };
}

/**
 * Interface pour le contexte de logging
 */
export interface TokenValidationContext {
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  userId?: string;
}

/**
 * Classe utilitaire pour la validation et le nettoyage des tokens JWT
 */
export class TokenValidator {
  
  /**
   * Nettoie un token en supprimant les caractères invisibles
   * @param token - Le token à nettoyer
   * @returns Le token nettoyé
   */
  public static cleanToken(token: string): string {
    if (!token || typeof token !== 'string') {
      return '';
    }

    // Supprimer les caractères invisibles courants
    return token
      .trim() // Espaces en début/fin
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Caractères de contrôle
      .replace(/[ \t\n\r\f\v]/g, ''); // Espaces spécifiques (mais pas tous les \s)
  }

  /**
   * Valide la structure basique d'un token JWT
   * @param token - Le token à valider
   * @returns true si la structure est valide
   */
  public static validateTokenStructure(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Un JWT doit avoir exactement 3 parties séparées par des points
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Chaque partie doit être non vide et ressembler à du Base64
    for (const part of parts) {
      if (!part || part.length === 0) {
        return false;
      }
      
      // Vérification basique Base64 (caractères autorisés)
      if (!/^[A-Za-z0-9_-]+$/.test(part)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Effectue une validation complète du token avec nettoyage
   * @param token - Le token à valider
   * @param context - Contexte pour le logging
   * @returns Résultat de la validation
   */
  public static validateAndCleanToken(
    token: string, 
    context: TokenValidationContext = {}
  ): TokenValidationResult {
    const result: TokenValidationResult = {
      isValid: false,
      details: {}
    };

    // Vérification initiale
    if (!token || typeof token !== 'string') {
      result.error = 'Token manquant ou invalide';
      result.errorCode = ERROR_CODES.INVALID_TOKEN;
      
      this.logTokenValidationFailure({
        error: 'Token missing or not string',
        tokenType: typeof token,
        tokenLength: token ? token.length : 0,
        ...context
      });
      
      return result;
    }

    const originalLength = token.length;
    
    // Nettoyer le token
    const cleanedToken = this.cleanToken(token);
    const cleanedLength = cleanedToken.length;
    
    result.cleanedToken = cleanedToken;
    result.details = {
      originalLength,
      cleanedLength,
      hasInvisibleChars: originalLength !== cleanedLength
    };

    // Vérifier si le nettoyage a supprimé des caractères
    if (originalLength !== cleanedLength) {
      this.logTokenValidationFailure({
        message: 'Token contained invisible characters',
        originalLength,
        cleanedLength,
        removedChars: originalLength - cleanedLength,
        tokenPrefix: token.substring(0, 20) + '...',
        ...context
      });
    }

    // Valider la structure après nettoyage
    if (!this.validateTokenStructure(cleanedToken)) {
      const parts = cleanedToken.split('.');
      
      result.error = 'Structure de token invalide';
      result.errorCode = ERROR_CODES.INVALID_TOKEN;
      result.details.structure = {
        hasDots: cleanedToken.includes('.'),
        partCount: parts.length,
        isBase64Like: parts.every(part => /^[A-Za-z0-9_-]*$/.test(part))
      };

      this.logTokenValidationFailure({
        error: 'Invalid token structure',
        tokenLength: cleanedLength,
        partCount: parts.length,
        tokenPrefix: cleanedToken.substring(0, 20) + '...',
        structure: result.details.structure,
        ...context
      });

      return result;
    }

    // Validation réussie
    result.isValid = true;
    
    // Log de succès seulement si des caractères ont été nettoyés
    if (result.details.hasInvisibleChars) {
      if (typeof logger !== 'undefined' && logger.info) {
        logger.info('Token validation successful after cleaning', {
          originalLength,
          cleanedLength,
          removedChars: originalLength - cleanedLength,
          userId: context.userId,
          ip: context.ip,
          endpoint: context.endpoint
        });
      }
    }

    return result;
  }

  /**
   * Valide un token sans le nettoyer (pour les cas où on veut juste vérifier)
   * @param token - Le token à valider
   * @param context - Contexte pour le logging
   * @returns true si le token est valide
   */
  public static isValidToken(token: string, context: TokenValidationContext = {}): boolean {
    const result = this.validateAndCleanToken(token, context);
    return result.isValid;
  }

  /**
   * Obtient des informations détaillées sur un token pour le debugging
   * @param token - Le token à analyser
   * @returns Informations détaillées sur le token
   */
  public static getTokenInfo(token: string): {
    length: number;
    hasInvisibleChars: boolean;
    structure: {
      partCount: number;
      parts: string[];
      isValidStructure: boolean;
    };
    cleaned: {
      token: string;
      length: number;
    };
  } {
    const cleaned = this.cleanToken(token);
    const parts = cleaned.split('.');
    
    return {
      length: token.length,
      hasInvisibleChars: token.length !== cleaned.length,
      structure: {
        partCount: parts.length,
        parts: parts.map(part => part.substring(0, 10) + '...'), // Tronquer pour sécurité
        isValidStructure: this.validateTokenStructure(cleaned)
      },
      cleaned: {
        token: cleaned.substring(0, 50) + '...', // Tronquer pour sécurité
        length: cleaned.length
      }
    };
  }

  /**
   * Log les échecs de validation de token avec contexte détaillé
   * @param details - Détails de l'échec
   */
  private static logTokenValidationFailure(details: any): void {
    // S'assurer qu'aucune donnée sensible n'est loggée
    const safeDetails = {
      ...details,
      // Tronquer les tokens pour la sécurité
      tokenPrefix: details.tokenPrefix || (details.token ? details.token.substring(0, 20) + '...' : undefined),
      token: undefined, // Ne jamais logger le token complet
      cleanedToken: undefined // Ne jamais logger le token nettoyé complet
    };

    // Vérifier si logger est disponible (pour les tests)
    if (typeof logger !== 'undefined' && logger.warn) {
      logger.warn('Token validation failed', safeDetails);
    } else {
      // Fallback pour les tests ou environnements sans logger
      console.warn('Token validation failed', safeDetails);
    }
  }
}