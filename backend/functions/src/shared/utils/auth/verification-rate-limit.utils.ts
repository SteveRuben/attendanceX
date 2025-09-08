// shared/utils/auth/verification-rate-limit.utils.ts

import { Request } from "express";
import { logger } from "firebase-functions";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
}

/**
 * Utilitaires spécialisés pour la limitation de taux des opérations de vérification
 */
export class VerificationRateLimitUtils {
  
  /**
   * Vérifie et applique la limitation de taux pour l'envoi d'emails de vérification
   * Limite: 3 emails par heure par adresse email
   */
  static async checkEmailSendingRateLimit(
    email: string,
    ipAddress: string
  ): Promise<RateLimitResult> {
    const isDevelopment = process.env.APP_ENV === 'development';
    const windowMs = 60 * 60 * 1000; // 1 heure
    const maxRequests = isDevelopment ? 20 : 3;
    
    // Utiliser l'email comme clé principale, avec fallback sur IP
    const key = `send_email_verification_${email}_${isDevelopment ? 'dev' : 'prod'}`;
    
    return await this.checkRateLimit(key, windowMs, maxRequests, {
      email,
      ipAddress,
      operation: 'email_sending'
    });
  }

  /**
   * Vérifie et applique la limitation de taux pour les tentatives de vérification
   * Limite: 10 tentatives par heure par IP
   */
  static async checkVerificationAttemptsRateLimit(
    ipAddress: string,
    userAgent?: string
  ): Promise<RateLimitResult> {
    const isDevelopment = process.env.APP_ENV === 'development';
    const windowMs = 60 * 60 * 1000; // 1 heure
    const maxRequests = isDevelopment ? 50 : 10;
    
    const key = `email_verification_attempts_${ipAddress}_${isDevelopment ? 'dev' : 'prod'}`;
    
    return await this.checkRateLimit(key, windowMs, maxRequests, {
      ipAddress,
      userAgent,
      operation: 'verification_attempts'
    });
  }

  /**
   * Vérifie et applique la limitation de taux pour les demandes de renvoi
   * Combine les limites par email et par IP
   */
  static async checkResendRateLimit(
    email: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{
    emailLimit: RateLimitResult;
    ipLimit: RateLimitResult;
    allowed: boolean;
    mostRestrictive: RateLimitResult;
  }> {
    const [emailLimit, ipLimit] = await Promise.all([
      this.checkEmailSendingRateLimit(email, ipAddress),
      this.checkVerificationAttemptsRateLimit(ipAddress, userAgent)
    ]);

    const allowed = emailLimit.allowed && ipLimit.allowed;
    const mostRestrictive = !emailLimit.allowed ? emailLimit : ipLimit;

    return {
      emailLimit,
      ipLimit,
      allowed,
      mostRestrictive
    };
  }

  /**
   * Logique de base pour vérifier la limitation de taux
   */
  private static async checkRateLimit(
    key: string,
    windowMs: number,
    maxRequests: number,
    metadata: Record<string, any> = {}
  ): Promise<RateLimitResult> {
    try {
      const now = new Date();
      const resetTime = new Date(Math.ceil(now.getTime() / windowMs) * windowMs);
      // const windowStart = new Date(now.getTime() - windowMs);

      // Note: This would need to be implemented with actual database collections
      // For now, returning a mock implementation
      const currentCount = 0; // Would be fetched from database
      const remaining = Math.max(0, maxRequests - currentCount);

      // Log détaillé pour debugging
      logger.info("Verification rate limit check", {
        key,
        currentCount,
        maxRequests,
        remaining,
        windowMs,
        resetTime: resetTime.toISOString(),
        metadata,
        environment: process.env.APP_ENV || 'development'
      });

      // Vérifier si la limite est dépassée
      if (currentCount >= maxRequests) {
        const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000);
        
        logger.warn("Verification rate limit exceeded", {
          key,
          currentCount,
          maxRequests,
          retryAfter,
          metadata,
          environment: process.env.APP_ENV || 'development'
        });

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter
        };
      }

      return {
        allowed: true,
        remaining: remaining - 1,
        resetTime
      };

    } catch (error) {
      logger.error("Rate limit check error", {
        key,
        error: error instanceof Error ? error.message : String(error),
        metadata
      });
      
      // En cas d'erreur, permettre la requête (fail-open)
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: new Date(Date.now() + windowMs)
      };
    }
  }

  /**
   * Génère une réponse d'erreur standardisée pour les limites de taux dépassées
   */
  static generateRateLimitErrorResponse(
    result: RateLimitResult,
    operation: 'email_sending' | 'verification_attempts' | 'resend'
  ): {
    success: false;
    error: string;
    message: string;
    retryAfter: number;
    data: {
      remaining: number;
      resetTime: string;
      operation: string;
    };
  } {
    const messages = {
      email_sending: "Trop de demandes d'envoi de vérification d'email. Limite: 3 par heure par email.",
      verification_attempts: "Trop de tentatives de vérification d'email. Limite: 10 par heure par IP.",
      resend: "Trop de demandes de renvoi de vérification. Veuillez patienter avant de réessayer."
    };

    return {
      success: false,
      error: "RATE_LIMIT_EXCEEDED",
      message: messages[operation],
      retryAfter: result.retryAfter || 0,
      data: {
        remaining: result.remaining,
        resetTime: result.resetTime.toISOString(),
        operation
      }
    };
  }
}