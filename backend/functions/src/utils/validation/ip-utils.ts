// shared/utils/validation/ip-utils.ts - Utilitaires pour la gestion des adresses IP

import { Request } from 'express';

/**
 * Configuration pour l'extraction d'adresse IP
 */
interface IpExtractionConfig {
  trustProxy?: boolean;
  defaultIp?: string;
  headers?: string[];
}

/**
 * Extrait l'adresse IP réelle d'une requête HTTP
 * Gère les proxies, load balancers et CDN
 */
export function extractClientIp<T extends Request = Request>(req: T, config: IpExtractionConfig = {}): string {
  const {
    trustProxy = true,
    defaultIp = '127.0.0.1',
    headers = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip', // Cloudflare
      'x-forwarded',
      'forwarded-for',
      'forwarded'
    ]
  } = config;

  // Si on fait confiance aux proxies, vérifier les headers
  if (trustProxy) {
    for (const header of headers) {
      const headerValue = req.get(header);
      if (headerValue) {
        // x-forwarded-for peut contenir plusieurs IPs séparées par des virgules
        const ips = headerValue.split(',').map(ip => ip.trim());
        const firstIp = ips[0];
        
        if (isValidIp(firstIp)) {
          return firstIp;
        }
      }
    }
  }

  // Fallback sur req.ip (Express)
  if (req.ip && isValidIp(req.ip)) {
    return req.ip;
  }

  // Fallback sur req.connection.remoteAddress (deprecated mais parfois nécessaire)
  if (req.socket?.remoteAddress && isValidIp(req.socket.remoteAddress)) {
    return req.socket.remoteAddress;
  }

  // Dernière tentative avec req.connection (legacy)
  const connection = req.connection as any;
  if (connection?.remoteAddress && isValidIp(connection.remoteAddress)) {
    return connection.remoteAddress;
  }

  return defaultIp;
}

/**
 * Valide si une chaîne est une adresse IP valide (IPv4 ou IPv6)
 */
function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // Nettoyer l'IP (supprimer les espaces et préfixes)
  const cleanIp = ip.trim().replace(/^::ffff:/, '');

  // Validation IPv4
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(cleanIp)) {
    return true;
  }

  // Validation IPv6 (simplifiée)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  if (ipv6Regex.test(cleanIp)) {
    return true;
  }

  return false;
}

/**
 * Obtient des informations géographiques sur une IP (stub pour intégration future)
 */
export async function getIpGeolocation(ip: string): Promise<{
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
} | null> {
  // Stub pour intégration future avec un service de géolocalisation
  // comme MaxMind, IPStack, ou ipapi.co
  
  if (!isValidIp(ip) || isPrivateIp(ip)) {
    return null;
  }

  // TODO: Intégrer avec un service de géolocalisation
  return null;
}

/**
 * Vérifie si une IP est privée/locale
 */
function isPrivateIp(ip: string): boolean {
  const cleanIp = ip.trim().replace(/^::ffff:/, '');
  
  // IPv4 privées
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./, // Link-local
    /^0\.0\.0\.0$/
  ];

  return privateRanges.some(range => range.test(cleanIp)) || 
         cleanIp === '::1' || 
         cleanIp === '::' ||
         cleanIp === 'localhost';
}

/**
 * Anonymise une adresse IP pour la conformité RGPD
 */
export function anonymizeIp(ip: string): string {
  if (!isValidIp(ip)) {
    return 'anonymous';
  }

  const cleanIp = ip.trim().replace(/^::ffff:/, '');

  // IPv4: masquer le dernier octet
  if (cleanIp.includes('.')) {
    const parts = cleanIp.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }

  // IPv6: masquer les 4 derniers groupes
  if (cleanIp.includes(':')) {
    const parts = cleanIp.split(':');
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(':')}::`;
    }
  }

  return 'anonymous';
}

/**
 * Middleware Express pour extraire automatiquement l'IP
 */
export function ipExtractionMiddleware(config: IpExtractionConfig = {}) {
  return (req: Request, res: any, next: any) => {
    // Ajouter l'IP extraite à l'objet request
    (req as any).clientIp = extractClientIp(req, config);
    next();
  };
}