/**
 * Service de sécurité pour la gestion de présence
 */

import { Request } from 'express';
import { firestore } from 'firebase-admin';
import * as crypto from 'crypto';

interface SecurityEvent {
  id: string;
  type: 'suspicious_activity' | 'failed_authentication' | 'data_breach' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  details: any;
  resolved: boolean;
}

interface AccessAttempt {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  resource: string;
  action: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    country?: string;
    city?: string;
  };
}

interface SecurityRule {
  id: string;
  name: string;
  type: 'rate_limit' | 'geo_restriction' | 'time_restriction' | 'device_restriction';
  enabled: boolean;
  parameters: any;
  actions: ('block' | 'alert' | 'log')[];
}

export class PresenceSecurityService {
  private db: firestore.Firestore;
  private securityEventsCollection = 'security_events';
  private accessAttemptsCollection = 'access_attempts';
  private securityRulesCollection = 'security_rules';
  private blockedIpsCollection = 'blocked_ips';

  constructor() {
    this.db = firestore();
  }

  // === AUTHENTIFICATION ET AUTORISATION ===

  /**
   * Valider l'accès à une ressource
   */
  async validateAccess(
    userId: string,
    resource: string,
    action: string,
    req: Request
  ): Promise<{ allowed: boolean; reason?: string }> {
    const ipAddress = this.getClientIP(req);
    const userAgent = req.get('User-Agent') || '';

    // Enregistrer la tentative d'accès
    await this.logAccessAttempt({
      userId,
      ipAddress,
      userAgent,
      resource,
      action,
      success: false // Sera mis à jour si l'accès est autorisé
    });

    // Vérifier si l'IP est bloquée
    if (await this.isIPBlocked(ipAddress)) {
      await this.logSecurityEvent({
        type: 'unauthorized_access',
        severity: 'high',
        ipAddress,
        userAgent,
        userId,
        details: {
          reason: 'blocked_ip',
          resource,
          action
        }
      });
      return { allowed: false, reason: 'IP address blocked' };
    }

    // Vérifier les règles de sécurité
    const securityCheck = await this.checkSecurityRules(userId, ipAddress, userAgent, resource, action);
    if (!securityCheck.allowed) {
      return securityCheck;
    }

    // Vérifier les permissions utilisateur
    const hasPermission = await this.checkUserPermissions(userId, resource, action);
    if (!hasPermission) {
      await this.logSecurityEvent({
        type: 'unauthorized_access',
        severity: 'medium',
        ipAddress,
        userAgent,
        userId,
        details: {
          reason: 'insufficient_permissions',
          resource,
          action
        }
      });
      return { allowed: false, reason: 'Insufficient permissions' };
    }

    // Détecter les activités suspectes
    await this.detectSuspiciousActivity(userId, ipAddress, userAgent, resource, action);

    // Mettre à jour la tentative d'accès comme réussie
    await this.updateLastAccessAttempt(userId, ipAddress, true);

    return { allowed: true };
  }

  /**
   * Vérifier les règles de sécurité
   */
  private async checkSecurityRules(
    userId: string,
    ipAddress: string,
    userAgent: string,
    resource: string,
    action: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const rulesSnapshot = await this.db
      .collection(this.securityRulesCollection)
      .where('enabled', '==', true)
      .get();

    for (const ruleDoc of rulesSnapshot.docs) {
      const rule = ruleDoc.data() as SecurityRule;
      const violation = await this.checkRule(rule, userId, ipAddress, userAgent, resource, action);
      
      if (violation) {
        // Exécuter les actions définies dans la règle
        await this.executeRuleActions(rule, violation);
        
        if (rule.actions.includes('block')) {
          return { allowed: false, reason: `Security rule violation: ${rule.name}` };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Vérifier une règle de sécurité spécifique
   */
  private async checkRule(
    rule: SecurityRule,
    userId: string,
    ipAddress: string,
    userAgent: string,
    resource: string,
    action: string
  ): Promise<any> {
    switch (rule.type) {
      case 'rate_limit':
        return await this.checkRateLimit(rule, userId, ipAddress);
      
      case 'geo_restriction':
        return await this.checkGeoRestriction(rule, ipAddress);
      
      case 'time_restriction':
        return await this.checkTimeRestriction(rule, userId);
      
      case 'device_restriction':
        return await this.checkDeviceRestriction(rule, userId, userAgent);
      
      default:
        return null;
    }
  }

  /**
   * Vérifier les limites de taux
   */
  private async checkRateLimit(rule: SecurityRule, userId: string, ipAddress: string): Promise<any> {
    const { windowMs, maxRequests, keyType } = rule.parameters;
    const key = keyType === 'user' ? userId : ipAddress;
    
    const windowStart = new Date(Date.now() - windowMs);
    
    const attemptsSnapshot = await this.db
      .collection(this.accessAttemptsCollection)
      .where(keyType === 'user' ? 'userId' : 'ipAddress', '==', key)
      .where('timestamp', '>=', windowStart)
      .get();

    if (attemptsSnapshot.size >= maxRequests) {
      return {
        type: 'rate_limit_exceeded',
        key,
        attempts: attemptsSnapshot.size,
        limit: maxRequests,
        windowMs
      };
    }

    return null;
  }

  /**
   * Vérifier les restrictions géographiques
   */
  private async checkGeoRestriction(rule: SecurityRule, ipAddress: string): Promise<any> {
    const { allowedCountries, blockedCountries } = rule.parameters;
    
    // Obtenir la géolocalisation de l'IP (simulation)
    const geoLocation = await this.getIPGeolocation(ipAddress);
    
    if (blockedCountries && blockedCountries.includes(geoLocation.country)) {
      return {
        type: 'geo_restriction_blocked',
        country: geoLocation.country,
        ipAddress
      };
    }
    
    if (allowedCountries && !allowedCountries.includes(geoLocation.country)) {
      return {
        type: 'geo_restriction_not_allowed',
        country: geoLocation.country,
        ipAddress
      };
    }

    return null;
  }

  /**
   * Vérifier les restrictions horaires
   */
  private async checkTimeRestriction(rule: SecurityRule, userId: string): Promise<any> {
    const { allowedHours } = rule.parameters;
    const now = new Date();
    const currentHour = now.getHours();

    if (!allowedHours.includes(currentHour)) {
      return {
        type: 'time_restriction_violation',
        currentHour,
        allowedHours,
        userId
      };
    }

    return null;
  }

  /**
   * Vérifier les restrictions d'appareil
   */
  private async checkDeviceRestriction(rule: SecurityRule, userId: string, userAgent: string): Promise<any> {
    const { blockedDevices } = rule.parameters;
    
    const deviceInfo = this.parseUserAgent(userAgent);
    
    if (blockedDevices && blockedDevices.some((device: string) => userAgent.includes(device))) {
      return {
        type: 'device_restriction_blocked',
        userAgent,
        deviceInfo,
        userId
      };
    }

    return null;
  }

  // === DÉTECTION D'ACTIVITÉS SUSPECTES ===

  /**
   * Détecter les activités suspectes
   */
  private async detectSuspiciousActivity(
    userId: string,
    ipAddress: string,
    userAgent: string,
    resource: string,
    action: string
  ): Promise<void> {
    // Détecter les connexions depuis plusieurs IP
    await this.detectMultipleIPAccess(userId, ipAddress);
    
    // Détecter les tentatives de force brute
    await this.detectBruteForceAttempts(userId, ipAddress);
    
    // Détecter les accès à des heures inhabituelles
    await this.detectUnusualTimeAccess(userId);
    
    // Détecter les changements d'appareil suspects
    await this.detectSuspiciousDeviceChange(userId, userAgent);
  }

  /**
   * Détecter les accès depuis plusieurs IP
   */
  private async detectMultipleIPAccess(userId: string, currentIP: string): Promise<void> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentAccessesSnapshot = await this.db
      .collection(this.accessAttemptsCollection)
      .where('userId', '==', userId)
      .where('timestamp', '>=', last24Hours)
      .where('success', '==', true)
      .get();

    const uniqueIPs = new Set(recentAccessesSnapshot.docs.map(doc => doc.data().ipAddress));
    
    if (uniqueIPs.size > 3) { // Plus de 3 IP différentes en 24h
      await this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        ipAddress: currentIP,
        userAgent: '',
        userId,
        details: {
          reason: 'multiple_ip_access',
          uniqueIPs: Array.from(uniqueIPs),
          count: uniqueIPs.size
        }
      });
    }
  }

  /**
   * Détecter les tentatives de force brute
   */
  private async detectBruteForceAttempts(userId: string, ipAddress: string): Promise<void> {
    const last15Minutes = new Date(Date.now() - 15 * 60 * 1000);
    
    const failedAttemptsSnapshot = await this.db
      .collection(this.accessAttemptsCollection)
      .where('ipAddress', '==', ipAddress)
      .where('timestamp', '>=', last15Minutes)
      .where('success', '==', false)
      .get();

    if (failedAttemptsSnapshot.size >= 5) { // 5 échecs en 15 minutes
      await this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        ipAddress,
        userAgent: '',
        userId,
        details: {
          reason: 'brute_force_attempt',
          failedAttempts: failedAttemptsSnapshot.size,
          timeWindow: '15 minutes'
        }
      });

      // Bloquer temporairement l'IP
      await this.blockIP(ipAddress, 60); // 1 heure
    }
  }

  // === CHIFFREMENT ET HACHAGE ===

  /**
   * Chiffrer des données sensibles
   */
  encryptSensitiveData(data: string, key?: string): string {
    const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Déchiffrer des données sensibles
   */
  decryptSensitiveData(encryptedData: string, key?: string): string {
    const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key';
    const textParts = encryptedData.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Hacher un mot de passe
   */
  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Vérifier un mot de passe
   */
  verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  // === GESTION DES ÉVÉNEMENTS DE SÉCURITÉ ===

  /**
   * Enregistrer un événement de sécurité
   */
  private async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      resolved: false,
      ...event
    };

    await this.db.collection(this.securityEventsCollection).doc(securityEvent.id).set(securityEvent);

    // Alerter si l'événement est critique
    if (event.severity === 'critical' || event.severity === 'high') {
      await this.sendSecurityAlert(securityEvent);
    }
  }

  /**
   * Envoyer une alerte de sécurité
   */
  private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    // Implémentation de l'envoi d'alertes (email, SMS, webhook, etc.)
    console.log(`SECURITY ALERT: ${event.type} - ${event.severity}`, event.details);
    
    // Ici, vous pourriez intégrer avec des services comme:
    // - SendGrid pour les emails
    // - Twilio pour les SMS
    // - Slack/Teams pour les notifications
    // - PagerDuty pour les alertes critiques
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Obtenir l'IP du client
   */
  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           '0.0.0.0';
  }

  /**
   * Analyser le User-Agent
   */
  private parseUserAgent(userAgent: string): any {
    // Implémentation simplifiée - dans un vrai projet, utilisez une bibliothèque comme 'ua-parser-js'
    return {
      browser: userAgent.includes('Chrome') ? 'Chrome' : 
               userAgent.includes('Firefox') ? 'Firefox' : 
               userAgent.includes('Safari') ? 'Safari' : 'Unknown',
      os: userAgent.includes('Windows') ? 'Windows' :
          userAgent.includes('Mac') ? 'macOS' :
          userAgent.includes('Linux') ? 'Linux' : 'Unknown',
      device: userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
    };
  }

  /**
   * Obtenir la géolocalisation d'une IP
   */
  private async getIPGeolocation(ipAddress: string): Promise<any> {
    // Implémentation simulée - dans un vrai projet, utilisez un service comme MaxMind ou IPStack
    return {
      country: 'FR',
      city: 'Paris',
      latitude: 48.8566,
      longitude: 2.3522
    };
  }

  /**
   * Vérifier les permissions utilisateur
   */
  private async checkUserPermissions(userId: string, resource: string, action: string): Promise<boolean> {
    // Implémentation simplifiée - dans un vrai projet, intégrez avec votre système de permissions
    const userDoc = await this.db.collection('users').doc(userId).get();
    if (!userDoc.exists) return false;

    const userData = userDoc.data();
    const userRole = userData?.role || 'employee';

    // Logique de permissions basée sur les rôles
    const permissions = {
      admin: ['*'],
      manager: ['presence:read', 'presence:write', 'team:read', 'reports:read'],
      employee: ['presence:read', 'presence:write:own']
    };

    const userPermissions = permissions[userRole as keyof typeof permissions] || [];
    
    return userPermissions.includes('*') || 
           userPermissions.includes(`${resource}:${action}`) ||
           userPermissions.includes(`${resource}:${action}:own`);
  }

  /**
   * Enregistrer une tentative d'accès
   */
  private async logAccessAttempt(attempt: Omit<AccessAttempt, 'id' | 'timestamp'>): Promise<void> {
    const accessAttempt: AccessAttempt = {
      id: this.generateId(),
      timestamp: new Date(),
      ...attempt
    };

    await this.db.collection(this.accessAttemptsCollection).doc(accessAttempt.id).set(accessAttempt);
  }

  /**
   * Mettre à jour la dernière tentative d'accès
   */
  private async updateLastAccessAttempt(userId: string, ipAddress: string, success: boolean): Promise<void> {
    const recentAttemptSnapshot = await this.db
      .collection(this.accessAttemptsCollection)
      .where('userId', '==', userId)
      .where('ipAddress', '==', ipAddress)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (!recentAttemptSnapshot.empty) {
      const attemptDoc = recentAttemptSnapshot.docs[0];
      await attemptDoc.ref.update({ success });
    }
  }

  /**
   * Vérifier si une IP est bloquée
   */
  private async isIPBlocked(ipAddress: string): Promise<boolean> {
    const blockedIPDoc = await this.db.collection(this.blockedIpsCollection).doc(ipAddress).get();
    
    if (!blockedIPDoc.exists) return false;
    
    const blockData = blockedIPDoc.data();
    const expiresAt = blockData?.expiresAt?.toDate();
    
    if (expiresAt && expiresAt > new Date()) {
      return true;
    } else if (expiresAt && expiresAt <= new Date()) {
      // Le blocage a expiré, le supprimer
      await blockedIPDoc.ref.delete();
      return false;
    }
    
    return !!blockData?.permanent;
  }

  /**
   * Bloquer une IP temporairement
   */
  private async blockIP(ipAddress: string, durationMinutes: number): Promise<void> {
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    
    await this.db.collection(this.blockedIpsCollection).doc(ipAddress).set({
      ipAddress,
      blockedAt: new Date(),
      expiresAt,
      reason: 'Suspicious activity detected',
      permanent: false
    });
  }

  /**
   * Exécuter les actions d'une règle de sécurité
   */
  private async executeRuleActions(rule: SecurityRule, violation: any): Promise<void> {
    for (const action of rule.actions) {
      switch (action) {
        case 'log':
          await this.logSecurityEvent({
            type: 'suspicious_activity',
            severity: 'medium',
            ipAddress: violation.ipAddress || '',
            userAgent: '',
            userId: violation.userId,
            details: {
              rule: rule.name,
              violation
            }
          });
          break;
        
        case 'alert':
          await this.sendSecurityAlert({
            id: this.generateId(),
            type: 'suspicious_activity',
            severity: 'high',
            timestamp: new Date(),
            ipAddress: violation.ipAddress || '',
            userAgent: '',
            userId: violation.userId,
            details: { rule: rule.name, violation },
            resolved: false
          });
          break;
        
        case 'block':
          if (violation.ipAddress) {
            await this.blockIP(violation.ipAddress, 60); // 1 heure
          }
          break;
      }
    }
  }

  private async detectUnusualTimeAccess(userId: string): Promise<void> {
    // Implémentation de la détection d'accès à des heures inhabituelles
  }

  private async detectSuspiciousDeviceChange(userId: string, userAgent: string): Promise<void> {
    // Implémentation de la détection de changements d'appareil suspects
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}