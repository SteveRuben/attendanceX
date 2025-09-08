// backend/functions/src/services/nfc-badge.service.ts - Service de gestion des badges NFC

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { ERROR_CODES } from "../shared";
import * as crypto from "crypto";

export interface NFCBadge {
  id: string;
  badgeId: string; // ID physique du badge
  userId?: string; // Utilisateur assigné
  organizationId: string;
  isActive: boolean;
  isAssigned: boolean;
  
  // Informations du badge
  badgeType: 'employee' | 'visitor' | 'contractor' | 'vip';
  serialNumber: string;
  encryptionKey: string;
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date;
  assignedBy?: string;
  lastUsed?: Date;
  
  // Sécurité
  accessLevel: number; // 1-10
  expiresAt?: Date;
  isBlacklisted: boolean;
  blacklistReason?: string;
  
  // Audit
  usageCount: number;
  lastLocation?: { latitude: number; longitude: number };
}

export interface NFCValidationRequest {
  badgeId: string;
  eventId: string;
  readerId?: string; // ID du lecteur NFC
  location?: { latitude: number; longitude: number };
  deviceInfo?: any;
}

export interface NFCValidationResult {
  isValid: boolean;
  badge?: NFCBadge;
  userId?: string;
  reason?: string;
  accessGranted: boolean;
  requiresAdditionalAuth: boolean;
}

export interface NFCBadgeAssignment {
  badgeId: string;
  userId: string;
  assignedBy: string;
  validFrom: Date;
  validUntil?: Date;
  accessLevel: number;
  restrictions?: {
    allowedEvents?: string[];
    allowedLocations?: string[];
    timeWindows?: Array<{ start: string; end: string; days: number[] }>;
  };
}

export class NFCBadgeService {
  private readonly db = getFirestore();

  /**
   * Créer un nouveau badge NFC
   */
  async createBadge(
    badgeId: string,
    organizationId: string,
    badgeType: NFCBadge['badgeType'],
    accessLevel: number = 1
  ): Promise<NFCBadge> {
    try {
      // Vérifier que le badge n'existe pas déjà
      const existingBadge = await this.getBadgeByBadgeId(badgeId);
      if (existingBadge) {
        throw new Error('Badge already exists');
      }

      const badge: NFCBadge = {
        id: crypto.randomUUID(),
        badgeId,
        organizationId,
        isActive: true,
        isAssigned: false,
        badgeType,
        serialNumber: this.generateSerialNumber(),
        encryptionKey: crypto.randomBytes(32).toString('hex'),
        createdAt: new Date(),
        updatedAt: new Date(),
        accessLevel,
        isBlacklisted: false,
        usageCount: 0
      };

      await this.db.collection('nfc_badges').doc(badge.id).set(badge);

      // Log de l'audit
      await this.logNFCAction('badge_created', badge.id, null, {
        badgeId,
        badgeType,
        accessLevel
      });

      return badge;
    } catch (error) {
      console.error('Error creating NFC badge:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Assigner un badge à un utilisateur
   */
  async assignBadge(assignment: NFCBadgeAssignment): Promise<NFCBadge> {
    try {
      const badge = await this.getBadgeByBadgeId(assignment.badgeId);
      if (!badge) {
        throw new Error('Badge not found');
      }

      if (badge.isAssigned) {
        throw new Error('Badge is already assigned');
      }

      if (!badge.isActive) {
        throw new Error('Badge is not active');
      }

      // Mettre à jour le badge
      const updatedBadge: Partial<NFCBadge> = {
        userId: assignment.userId,
        isAssigned: true,
        assignedAt: assignment.validFrom,
        assignedBy: assignment.assignedBy,
        expiresAt: assignment.validUntil,
        accessLevel: assignment.accessLevel,
        updatedAt: new Date()
      };

      await this.db.collection('nfc_badges').doc(badge.id).update(updatedBadge);

      // Créer l'enregistrement d'assignation
      await this.db.collection('nfc_badge_assignments').add({
        ...assignment,
        badgeInternalId: badge.id,
        createdAt: new Date()
      });

      // Log de l'audit
      await this.logNFCAction('badge_assigned', badge.id, assignment.userId, {
        assignedBy: assignment.assignedBy,
        accessLevel: assignment.accessLevel
      });

      return { ...badge, ...updatedBadge } as NFCBadge;
    } catch (error) {
      console.error('Error assigning NFC badge:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Valider un badge NFC pour un check-in
   */
  async validateBadge(request: NFCValidationRequest): Promise<NFCValidationResult> {
    try {
      const badge = await this.getBadgeByBadgeId(request.badgeId);
      
      if (!badge) {
        return {
          isValid: false,
          reason: 'Badge not found',
          accessGranted: false,
          requiresAdditionalAuth: false
        };
      }

      // Vérifications de base
      if (!badge.isActive) {
        return {
          isValid: false,
          badge,
          reason: 'Badge is not active',
          accessGranted: false,
          requiresAdditionalAuth: false
        };
      }

      if (badge.isBlacklisted) {
        await this.logNFCAction('blacklisted_access_attempt', badge.id, badge.userId, {
          eventId: request.eventId,
          reason: badge.blacklistReason
        });
        
        return {
          isValid: false,
          badge,
          reason: `Badge is blacklisted: ${badge.blacklistReason}`,
          accessGranted: false,
          requiresAdditionalAuth: false
        };
      }

      if (!badge.isAssigned || !badge.userId) {
        return {
          isValid: false,
          badge,
          reason: 'Badge is not assigned to any user',
          accessGranted: false,
          requiresAdditionalAuth: false
        };
      }

      // Vérifier l'expiration
      if (badge.expiresAt && badge.expiresAt < new Date()) {
        return {
          isValid: false,
          badge,
          reason: 'Badge has expired',
          accessGranted: false,
          requiresAdditionalAuth: false
        };
      }

      // Vérifier les permissions pour l'événement
      const hasEventAccess = await this.checkEventAccess(badge, request.eventId);
      if (!hasEventAccess) {
        return {
          isValid: false,
          badge,
          reason: 'Badge does not have access to this event',
          accessGranted: false,
          requiresAdditionalAuth: false
        };
      }

      // Vérifier les restrictions temporelles
      const isInTimeWindow = await this.checkTimeWindow(badge);
      if (!isInTimeWindow) {
        return {
          isValid: false,
          badge,
          reason: 'Badge access is not allowed at this time',
          accessGranted: false,
          requiresAdditionalAuth: false
        };
      }

      // Mettre à jour les statistiques d'usage
      await this.updateBadgeUsage(badge.id, request.location);

      // Déterminer si une authentification supplémentaire est requise
      const requiresAdditionalAuth = this.requiresAdditionalAuthentication(badge, request.eventId);

      // Log de l'audit
      await this.logNFCAction('badge_validated', badge.id, badge.userId, {
        eventId: request.eventId,
        readerId: request.readerId,
        accessGranted: true,
        requiresAdditionalAuth
      });

      return {
        isValid: true,
        badge,
        userId: badge.userId,
        accessGranted: true,
        requiresAdditionalAuth
      };
    } catch (error) {
      console.error('Error validating NFC badge:', error);
      return {
        isValid: false,
        reason: 'Internal server error during validation',
        accessGranted: false,
        requiresAdditionalAuth: false
      };
    }
  }

  /**
   * Désactiver un badge
   */
  async deactivateBadge(badgeId: string, reason: string, deactivatedBy: string): Promise<void> {
    try {
      const badge = await this.getBadgeByBadgeId(badgeId);
      if (!badge) {
        throw new Error('Badge not found');
      }

      await this.db.collection('nfc_badges').doc(badge.id).update({
        isActive: false,
        isBlacklisted: true,
        blacklistReason: reason,
        updatedAt: new Date()
      });

      // Log de l'audit
      await this.logNFCAction('badge_deactivated', badge.id, badge.userId, {
        reason,
        deactivatedBy
      });
    } catch (error) {
      console.error('Error deactivating NFC badge:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir les badges d'un utilisateur
   */
  async getUserBadges(userId: string): Promise<NFCBadge[]> {
    try {
      const badgesQuery = await this.db
        .collection('nfc_badges')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      return badgesQuery.docs.map(doc => doc.data() as NFCBadge);
    } catch (error) {
      console.error('Error getting user badges:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir les statistiques d'usage d'un badge
   */
  async getBadgeUsageStats(badgeId: string): Promise<{
    totalUsage: number;
    lastUsed?: Date;
    usageByMonth: Record<string, number>;
    topEvents: Array<{ eventId: string; count: number }>;
  }> {
    try {
      const badge = await this.getBadgeByBadgeId(badgeId);
      if (!badge) {
        throw new Error('Badge not found');
      }

      // Récupérer les logs d'usage
      const usageLogsQuery = await this.db
        .collection('nfc_audit_logs')
        .where('badgeId', '==', badge.id)
        .where('action', '==', 'badge_validated')
        .orderBy('timestamp', 'desc')
        .get();

      const usageLogs = usageLogsQuery.docs.map(doc => doc.data());

      // Calculer les statistiques
      const usageByMonth: Record<string, number> = {};
      const eventCounts: Record<string, number> = {};

      usageLogs.forEach(log => {
        const month = log.timestamp.toDate().toISOString().substring(0, 7); // YYYY-MM
        usageByMonth[month] = (usageByMonth[month] || 0) + 1;

        if (log.details?.eventId) {
          eventCounts[log.details.eventId] = (eventCounts[log.details.eventId] || 0) + 1;
        }
      });

      const topEvents = Object.entries(eventCounts)
        .map(([eventId, count]) => ({ eventId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalUsage: badge.usageCount,
        lastUsed: badge.lastUsed,
        usageByMonth,
        topEvents
      };
    } catch (error) {
      console.error('Error getting badge usage stats:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // Méthodes privées

  private async getBadgeByBadgeId(badgeId: string): Promise<NFCBadge | null> {
    try {
      const badgeQuery = await this.db
        .collection('nfc_badges')
        .where('badgeId', '==', badgeId)
        .limit(1)
        .get();

      return badgeQuery.empty ? null : badgeQuery.docs[0].data() as NFCBadge;
    } catch (error) {
      console.error('Error getting badge by badge ID:', error);
      return null;
    }
  }

  private generateSerialNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `NFC-${timestamp}-${random}`.toUpperCase();
  }

  private async checkEventAccess(badge: NFCBadge, eventId: string): Promise<boolean> {
    try {
      // Récupérer les restrictions d'assignation
      const assignmentQuery = await this.db
        .collection('nfc_badge_assignments')
        .where('badgeInternalId', '==', badge.id)
        .where('userId', '==', badge.userId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (assignmentQuery.empty) {
        return true; // Pas de restrictions spécifiques
      }

      const assignment = assignmentQuery.docs[0].data();
      
      // Vérifier les événements autorisés
      if (assignment.restrictions?.allowedEvents) {
        return assignment.restrictions.allowedEvents.includes(eventId);
      }

      return true; // Pas de restrictions d'événements
    } catch (error) {
      console.error('Error checking event access:', error);
      return false;
    }
  }

  private async checkTimeWindow(badge: NFCBadge): Promise<boolean> {
    try {
      // Récupérer les restrictions d'assignation
      const assignmentQuery = await this.db
        .collection('nfc_badge_assignments')
        .where('badgeInternalId', '==', badge.id)
        .where('userId', '==', badge.userId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (assignmentQuery.empty) {
        return true; // Pas de restrictions temporelles
      }

      const assignment = assignmentQuery.docs[0].data();
      
      if (!assignment.restrictions?.timeWindows) {
        return true; // Pas de restrictions temporelles
      }

      const now = new Date();
      const currentDay = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM

      // Vérifier chaque fenêtre temporelle
      for (const window of assignment.restrictions.timeWindows) {
        if (window.days.includes(currentDay)) {
          if (currentTime >= window.start && currentTime <= window.end) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking time window:', error);
      return false;
    }
  }

  private requiresAdditionalAuthentication(badge: NFCBadge, eventId: string): boolean {
    // Logique pour déterminer si une authentification supplémentaire est requise
    // Basée sur le niveau d'accès, le type d'événement, etc.
    
    if (badge.accessLevel >= 8) {
      return false; // Niveau d'accès élevé, pas besoin d'auth supplémentaire
    }

    if (badge.badgeType === 'visitor' || badge.badgeType === 'contractor') {
      return true; // Visiteurs et contractuels nécessitent une auth supplémentaire
    }

    return false;
  }

  private async updateBadgeUsage(badgeId: string, location?: { latitude: number; longitude: number }): Promise<void> {
    const updates: any = {
      usageCount: FieldValue.increment(1),
      lastUsed: new Date()
    };

    if (location) {
      updates.lastLocation = location;
    }

    await this.db.collection('nfc_badges').doc(badgeId).update(updates);
  }

  private async logNFCAction(
    action: string,
    badgeId: string,
    userId: string | null,
    details: any
  ): Promise<void> {
    await this.db.collection('nfc_audit_logs').add({
      action,
      badgeId,
      userId,
      details,
      timestamp: new Date()
    });
  }
}

export const nfcBadgeService = new NFCBadgeService();