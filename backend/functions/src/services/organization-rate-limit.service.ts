import { collections } from '../config';
import { logger } from 'firebase-functions';

interface RateLimitConfig {
  organizationCreation: {
    maxPerHour: number;
    maxPerDay: number;
  };
  invitations: {
    maxPerHour: number;
    maxPerDay: number;
    maxPerOrganization: number;
  };
  apiCalls: {
    maxPerMinute: number;
    maxPerHour: number;
  };
}

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  organizationCreation: {
    maxPerHour: 2,
    maxPerDay: 5,
  },
  invitations: {
    maxPerHour: 10,
    maxPerDay: 50,
    maxPerOrganization: 100,
  },
  apiCalls: {
    maxPerMinute: 100,
    maxPerHour: 1000,
  },
};

export class OrganizationRateLimitService {
  private static instance: OrganizationRateLimitService;

  public static getInstance(): OrganizationRateLimitService {
    if (!OrganizationRateLimitService.instance) {
      OrganizationRateLimitService.instance = new OrganizationRateLimitService();
    }
    return OrganizationRateLimitService.instance;
  }

  async checkOrganizationCreationLimit(userId: string, ipAddress: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    reason?: string;
  }> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Vérifier les créations par utilisateur
      const userCreationsQuery = await collections.audit_logs
        .where('userId', '==', userId)
        .where('action', '==', 'organization_created')
        .where('timestamp', '>=', dayAgo)
        .get();

      const userCreationsToday = userCreationsQuery.size;
      const userCreationsThisHour = userCreationsQuery.docs.filter(
        doc => doc.data().timestamp.toDate() >= hourAgo
      ).length;

      if (userCreationsThisHour >= DEFAULT_RATE_LIMITS.organizationCreation.maxPerHour) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(now.getTime() + 60 * 60 * 1000),
          reason: 'Limite horaire de création d\'organisation atteinte'
        };
      }

      if (userCreationsToday >= DEFAULT_RATE_LIMITS.organizationCreation.maxPerDay) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          reason: 'Limite quotidienne de création d\'organisation atteinte'
        };
      }

      // Vérifier les créations par IP (protection contre les abus)
      const ipCreationsQuery = await collections.audit_logs
        .where('ipAddress', '==', ipAddress)
        .where('action', '==', 'organization_created')
        .where('timestamp', '>=', hourAgo)
        .get();

      if (ipCreationsQuery.size >= DEFAULT_RATE_LIMITS.organizationCreation.maxPerHour * 2) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(now.getTime() + 60 * 60 * 1000),
          reason: 'Trop de créations d\'organisation depuis cette adresse IP'
        };
      }

      return {
        allowed: true,
        remaining: DEFAULT_RATE_LIMITS.organizationCreation.maxPerDay - userCreationsToday,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      };

    } catch (error) {
      logger.error('Error checking organization creation rate limit', { error, userId, ipAddress });
      // En cas d'erreur, on autorise par défaut mais on log
      return {
        allowed: true,
        remaining: 1,
        resetTime: new Date(now.getTime() + 60 * 60 * 1000)
      };
    }
  }

  async checkInvitationLimit(organizationId: string, userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    reason?: string;
  }> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Vérifier les invitations par utilisateur (par heure)
      const userInvitationsQuery = await collections.audit_logs
        .where('userId', '==', userId)
        .where('action', '==', 'invitation_sent')
        .where('timestamp', '>=', hourAgo)
        .get();

      if (userInvitationsQuery.size >= DEFAULT_RATE_LIMITS.invitations.maxPerHour) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(now.getTime() + 60 * 60 * 1000),
          reason: 'Limite horaire d\'invitations atteinte'
        };
      }

      // Vérifier les invitations par utilisateur (par jour)
      const userInvitationsDayQuery = await collections.audit_logs
        .where('userId', '==', userId)
        .where('action', '==', 'invitation_sent')
        .where('timestamp', '>=', dayAgo)
        .get();

      if (userInvitationsDayQuery.size >= DEFAULT_RATE_LIMITS.invitations.maxPerDay) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          reason: 'Limite quotidienne d\'invitations atteinte'
        };
      }

      // Vérifier le nombre total d'invitations pour l'organisation
      const orgInvitationsQuery = await collections.user_invitations
        .where('organizationId', '==', organizationId)
        .where('status', 'in', ['pending', 'sent'])
        .get();

      if (orgInvitationsQuery.size >= DEFAULT_RATE_LIMITS.invitations.maxPerOrganization) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          reason: 'Limite d\'invitations en attente pour l\'organisation atteinte'
        };
      }

      return {
        allowed: true,
        remaining: DEFAULT_RATE_LIMITS.invitations.maxPerDay - userInvitationsDayQuery.size,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      };

    } catch (error) {
      logger.error('Error checking invitation rate limit', { error, organizationId, userId });
      return {
        allowed: true,
        remaining: 1,
        resetTime: new Date(now.getTime() + 60 * 60 * 1000)
      };
    }
  }

  async logOrganizationAction(
    action: string,
    userId: string,
    organizationId: string,
    details: any = {},
    ipAddress?: string
  ): Promise<void> {
    try {
      await collections.audit_logs.add({
        action,
        userId,
        organizationId,
        timestamp: new Date(),
        details,
        ipAddress: ipAddress || 'unknown',
        userAgent: details.userAgent || 'unknown'
      });
    } catch (error) {
      logger.error('Error logging organization action', { error, action, userId, organizationId });
    }
  }

  async getOrganizationUsageStats(organizationId: string, days: number = 30): Promise<{
    invitationsSent: number;
    activeUsers: number;
    apiCallsCount: number;
    storageUsed: number;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const [invitationsQuery, usersQuery, apiCallsQuery] = await Promise.all([
        collections.audit_logs
          .where('organizationId', '==', organizationId)
          .where('action', '==', 'invitation_sent')
          .where('timestamp', '>=', since)
          .get(),
        collections.users
          .where('organizationId', '==', organizationId)
          .where('lastLoginAt', '>=', since)
          .get(),
        collections.audit_logs
          .where('organizationId', '==', organizationId)
          .where('action', '==', 'api_call')
          .where('timestamp', '>=', since)
          .get()
      ]);

      return {
        invitationsSent: invitationsQuery.size,
        activeUsers: usersQuery.size,
        apiCallsCount: apiCallsQuery.size,
        storageUsed: 0 // TODO: Implémenter le calcul du stockage utilisé
      };

    } catch (error) {
      logger.error('Error getting organization usage stats', { error, organizationId });
      return {
        invitationsSent: 0,
        activeUsers: 0,
        apiCallsCount: 0,
        storageUsed: 0
      };
    }
  }
}

export const organizationRateLimitService = OrganizationRateLimitService.getInstance();