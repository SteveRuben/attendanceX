import * as crypto from 'crypto';

/**
 * Générer un ID sécurisé aléatoire
 */
export function generateSecureId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Générer un code QR sécurisé
 */
export function generateQRCode(data: string): string {
  // Créer un hash SHA-256 des données
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  
  // Prendre les premiers 32 caractères et les formater
  const qrCode = hash.substring(0, 32).toUpperCase();
  
  // Formater en groupes de 4 caractères pour la lisibilité
  return qrCode.match(/.{1,4}/g)?.join('-') || qrCode;
}

/**
 * Générer un code de sécurité numérique
 */
export function generateSecurityCode(length: number = 6): string {
  const digits = '0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += digits[randomBytes[i] % digits.length];
  }
  
  return result;
}

/**
 * Générer un token sécurisé pour les URLs
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hasher une chaîne avec SHA-256
 */
export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Vérifier l'intégrité d'un code QR
 */
export function verifyQRCode(originalData: string, qrCode: string): boolean {
  const expectedQRCode = generateQRCode(originalData);
  return qrCode === expectedQRCode;
}

/**
 * Générer un code-barres simple (Code 128)
 */
export function generateBarcode(data: string): string {
  // Simplification : utiliser un hash pour générer un code-barres
  const hash = crypto.createHash('md5').update(data).digest('hex');
  return hash.substring(0, 12).toUpperCase();
}

/**
 * Générer un numéro de billet unique
 */
export function generateTicketNumber(prefix: string = 'TKT'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateSecureId(6);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Valider un format d'email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Générer un salt pour le hachage
 */
export function generateSalt(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hasher un mot de passe avec un salt
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

/**
 * Vérifier un mot de passe
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const hashToVerify = hashPassword(password, salt);
  return hash === hashToVerify;
}