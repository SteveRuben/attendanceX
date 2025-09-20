import { collections } from '../../config';
import { OrganizationModel } from '../../models/organization.model';
import { logger } from 'firebase-functions';
import { notificationService } from '../notification/notification.service';
import { NotificationChannel, NotificationType, OrganizationStatus } from '../../common/types';

export enum SuspensionReason {
  PAYMENT_OVERDUE = 'payment_overdue',
  TERMS_VIOLATION = 'terms_violation',
  SECURITY_BREACH = 'security_breach',
  ABUSE_DETECTED = 'abuse_detected',
  MANUAL_SUSPENSION = 'manual_suspension'
}

interface SuspensionDetails {
  reason: SuspensionReason;
  description: string;
  suspendedBy: string;
  suspendedAt: Date;
  autoReactivateAt?: Date;
  appealable: boolean;
}

export class OrganizationSuspensionService {
  private static instance: OrganizationSuspensionService;

  public static getInstance(): OrganizationSuspensionService {
    if (!OrganizationSuspensionService.instance) {
      OrganizationSuspensionService.instance = new OrganizationSuspensionService();
    }
    return OrganizationSuspensionService.instance;
  }

  async suspendOrganization(
    organizationId: string,
    suspensionDetails: SuspensionDetails
  ): Promise<void> {
    try {
      // Récupérer l'organisation
      const orgDoc = await collections.organizations.doc(organizationId).get();
      if (!orgDoc.exists) {
        throw new Error('Organisation non trouvée');
      }

      const organization = OrganizationModel.fromFirestore(orgDoc);
      if (!organization) {
        throw new Error('Impossible de charger l\'organisation');
      }

      // Mettre à jour le statut de l'organisation
      const updates: any = {
        status: OrganizationStatus.SUSPENDED,
        updatedAt: new Date(),
        suspensionDetails // Ajout en tant que propriété étendue
      };
      
      organization.update(updates);

      await collections.organizations.doc(organizationId).set(organization.toFirestore());

      // Notifier tous les utilisateurs de l'organisation
      await this.notifyOrganizationMembers(organizationId, 'suspension', suspensionDetails);

      // Logger l'action
      await collections.audit_logs.add({
        action: 'organization_suspended',
        organizationId,
        userId: suspensionDetails.suspendedBy,
        timestamp: new Date(),
        details: {
          reason: suspensionDetails.reason,
          description: suspensionDetails.description,
          appealable: suspensionDetails.appealable
        }
      });

      logger.warn('Organization suspended', {
        organizationId,
        reason: suspensionDetails.reason,
        suspendedBy: suspensionDetails.suspendedBy
      });

    } catch (error) {
      logger.error('Error suspending organization', { error, organizationId });
      throw error;
    }
  }

  async reactivateOrganization(
    organizationId: string,
    reactivatedBy: string,
    reason: string
  ): Promise<void> {
    try {
      // Récupérer l'organisation
      const orgDoc = await collections.organizations.doc(organizationId).get();
      if (!orgDoc.exists) {
        throw new Error('Organisation non trouvée');
      }

      const organization = OrganizationModel.fromFirestore(orgDoc);
      if (!organization) {
        throw new Error('Impossible de charger l\'organisation');
      }

      // Mettre à jour le statut de l'organisation
      const updates: any = {
        status: OrganizationStatus.ACTIVE,
        updatedAt: new Date(),
        suspensionDetails: null, // Supprimer les détails de suspension
        reactivationDetails: {
          reactivatedBy,
          reactivatedAt: new Date(),
          reason
        }
      };
      
      organization.update(updates);

      await collections.organizations.doc(organizationId).set(organization.toFirestore());

      // Notifier tous les utilisateurs de l'organisation
      await this.notifyOrganizationMembers(organizationId, 'reactivation', { reason });

      // Logger l'action
      await collections.audit_logs.add({
        action: 'organization_reactivated',
        organizationId,
        userId: reactivatedBy,
        timestamp: new Date(),
        details: { reason }
      });

      logger.info('Organization reactivated', {
        organizationId,
        reactivatedBy,
        reason
      });

    } catch (error) {
      logger.error('Error reactivating organization', { error, organizationId });
      throw error;
    }
  }

  async checkAutoReactivation(): Promise<void> {
    try {
      const now = new Date();
      
      // Rechercher les organisations suspendues avec une date de réactivation automatique
      const suspendedOrgsQuery = await collections.organizations
        .where('status', '==', 'suspended')
        .where('suspensionDetails.autoReactivateAt', '<=', now)
        .get();

      for (const orgDoc of suspendedOrgsQuery.docs) {
        const organizationId = orgDoc.id;
        
        try {
          await this.reactivateOrganization(
            organizationId,
            'system',
            'Réactivation automatique programmée'
          );
        } catch (error) {
          logger.error('Error during auto-reactivation', { error, organizationId });
        }
      }

    } catch (error) {
      logger.error('Error checking auto-reactivation', { error });
    }
  }

  async getSuspendedOrganizations(): Promise<Array<{
    id: string;
    name: string;
    suspensionDetails: SuspensionDetails;
    memberCount: number;
  }>> {
    try {
      const suspendedOrgsQuery = await collections.organizations
        .where('status', '==', 'suspended')
        .get();

      const results = [];

      for (const orgDoc of suspendedOrgsQuery.docs) {
        const orgData = orgDoc.data();
        
        // Compter les membres
        const membersQuery = await collections.users
          .where('organizationId', '==', orgDoc.id)
          .get();

        results.push({
          id: orgDoc.id,
          name: orgData.name,
          suspensionDetails: orgData.suspensionDetails,
          memberCount: membersQuery.size
        });
      }

      return results;

    } catch (error) {
      logger.error('Error getting suspended organizations', { error });
      return [];
    }
  }

  private async notifyOrganizationMembers(
    organizationId: string,
    type: 'suspension' | 'reactivation',
    details: any
  ): Promise<void> {
    try {
      // Récupérer tous les membres de l'organisation
      const membersQuery = await collections.users
        .where('organizationId', '==', organizationId)
        .get();

      const notificationPromises = membersQuery.docs.map(async (memberDoc) => {
        if (type === 'suspension') {
          return notificationService.sendNotification({
            userId: memberDoc.id,
            type: NotificationType.ORGANIZATION_SUSPENDED,
            title: 'Organisation suspendue',
            message: `Votre organisation a été suspendue. Raison: ${details.description}`,
            data: {
              organizationId,
              reason: details.reason,
              appealable: details.appealable
            },
            channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH]
          });
        } else {
          return notificationService.sendNotification({
            userId: memberDoc.id,
            type: NotificationType.ORGANIZATION_REACTIVATED,
            title: 'Organisation réactivée',
            message: 'Votre organisation a été réactivée. Vous pouvez à nouveau accéder à tous les services.',
            data: {
              organizationId,
              reason: details.reason
            },
            channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH]
          });
        }
      });

      await Promise.allSettled(notificationPromises);

    } catch (error) {
      logger.error('Error notifying organization members', { error, organizationId, type });
    }
  }

  async appealSuspension(
    organizationId: string,
    appealedBy: string,
    appealReason: string
  ): Promise<void> {
    try {
      // Vérifier que l'organisation est suspendue et que l'appel est autorisé
      const orgDoc = await collections.organizations.doc(organizationId).get();
      if (!orgDoc.exists) {
        throw new Error('Organisation non trouvée');
      }

      const orgData = orgDoc.data();
      if (orgData?.status !== 'suspended') {
        throw new Error('L\'organisation n\'est pas suspendue');
      }

      if (!orgData?.suspensionDetails?.appealable) {
        throw new Error('Cette suspension ne peut pas faire l\'objet d\'un appel');
      }

      // Créer l'appel
      await collections.suspension_appeals.add({
        organizationId,
        appealedBy,
        appealReason,
        appealedAt: new Date(),
        status: 'pending',
        suspensionDetails: orgData.suspensionDetails
      });

      // Logger l'action
      await collections.audit_logs.add({
        action: 'suspension_appeal_submitted',
        organizationId,
        userId: appealedBy,
        timestamp: new Date(),
        details: { appealReason }
      });

      logger.info('Suspension appeal submitted', {
        organizationId,
        appealedBy,
        appealReason
      });

    } catch (error) {
      logger.error('Error submitting suspension appeal', { error, organizationId });
      throw error;
    }
  }
}

export const organizationSuspensionService = OrganizationSuspensionService.getInstance();