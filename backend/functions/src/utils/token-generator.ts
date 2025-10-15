/**
 * Générateur de tokens sécurisés
 */

import * as crypto from 'crypto';

/**
 * Génère un token sécurisé aléatoirement
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Génère un code numérique court (pour SMS, etc.)
 */
export function generateNumericCode(length: number = 6): string {
  const digits = '0123456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  
  return code;
}

/**
 * Génère un token avec préfixe pour identification
 */
export function generatePrefixedToken(prefix: string, length: number = 24): string {
  const token = generateSecureToken(length);
  return `${prefix}_${token}`;
}

/**
 * Valide le format d'un token
 */
export function validateTokenFormat(token: string, expectedLength?: number): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Vérifier que c'est bien hexadécimal
  const hexRegex = /^[a-f0-9]+$/i;
  if (!hexRegex.test(token)) {
    return false;
  }
  
  // Vérifier la longueur si spécifiée
  if (expectedLength && token.length !== expectedLength * 2) {
    return false;
  }
  
  return true;
}

/**
 * Hash un token pour stockage sécurisé
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Génère un token d'invitation avec expiration
 */
export function generateInvitationToken(): {
  token: string;
  hashedToken: string;
  expiresAt: Date;
} {
  const token = generateSecureToken(32);
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
  
  return {
    token,
    hashedToken,
    expiresAt
  };
}