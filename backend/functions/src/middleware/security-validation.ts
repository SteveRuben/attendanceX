/**
 * Security Validation Middleware
 * Additional security checks and validations
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from 'firebase-functions';

export interface SecurityValidationOptions {
  maxHeaderSize?: number;
  allowedOrigins?: string[];
  blockedUserAgents?: RegExp[];
  maxRequestsPerMinute?: number;
}

const DEFAULT_OPTIONS: SecurityValidationOptions = {
  maxHeaderSize: 8192, // 8KB
  allowedOrigins: [],
  blockedUserAgents: [
    /bot/i,
    /crawler/i,
    /spider/i
  ],
  maxRequestsPerMinute: 100
};

/**
 * Validate request headers for security issues
 */
export const validateRequestSecurity = (options: SecurityValidationOptions = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check header size
      const headerSize = JSON.stringify(req.headers).length;
      if (headerSize > config.maxHeaderSize!) {
        logger.warn('🚨 Large headers detected', {
          headerSize,
          maxSize: config.maxHeaderSize,
          ip: req.ip,
          url: req.url
        });
        
        res.status(413).json({
          success: false,
          error: {
            code: 'HEADERS_TOO_LARGE',
            message: 'Request headers too large'
          }
        });
        return;
      }

      // Check for suspicious user agents
      const userAgent = req.get('User-Agent') || '';
      const isSuspicious = config.blockedUserAgents!.some(pattern => 
        pattern.test(userAgent)
      );
      
      if (isSuspicious) {
        logger.warn('🚨 Suspicious user agent detected', {
          userAgent,
          ip: req.ip,
          url: req.url
        });
        
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_USER_AGENT',
            message: 'Access denied'
          }
        });
        return;
      }

      // Validate Content-Type for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.get('Content-Type');
        if (!contentType || (!contentType.includes('application/json') && 
                           !contentType.includes('application/x-www-form-urlencoded') &&
                           !contentType.includes('multipart/form-data'))) {
          logger.warn('🚨 Invalid content type', {
            contentType,
            method: req.method,
            ip: req.ip,
            url: req.url
          });
          
          res.status(415).json({
            success: false,
            error: {
              code: 'UNSUPPORTED_MEDIA_TYPE',
              message: 'Unsupported content type'
            }
          });
          return;
        }
      }

      next();
    } catch (error) {
      logger.error('Security validation error', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SECURITY_VALIDATION_ERROR',
          message: 'Security validation failed'
        }
      });
    }
  };
};

/**
 * Add security response headers
 */
export const addSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};