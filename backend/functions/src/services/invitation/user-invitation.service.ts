/**
 * Service pour la gestion des invitations utilisateur
 */

import { collections } from '../../config/database';
import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';

export interface UserInvitation {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  invitedBy: string;
  invitedByName?: string;
  permissions?: string[];
  department?: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
}

export interface GetInvitationsOptions {
  tenantId: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'email' | 'status';
  sortOrder?: 'asc' | 'desc';
  status?: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface GetInvitationsResponse {
  invitations: UserInvitation[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export class UserInvitationService {
  /**
   * Récupérer les invitations d'un tenant avec pagination et filtres
   */
  async getInvitations(options: GetInvitationsOptions): Promise<GetInvitationsResponse> {
    try {
      const {
        tenantId,
        limit = 50,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status
      } = options;

      logger.info('📧 Récupération des invitations', {
        tenantId,
        limit,
        offset,
        sortBy,
        sortOrder,
        status
      });

      // Construire la requête Firestore
      let query = collections.user_invitations
        .where('tenantId', '==', tenantId);

      // Filtrer par statut si spécifié
      if (status) {
        query = query.where('status', '==', status);
      }

      // Trier
      const firestoreSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
      query = query.orderBy(sortBy, firestoreSortOrder);

      // Compter le total (pour la pagination)
      const countSnapshot = await query.count().get();
      const total = countSnapshot.data().count;

      // Appliquer la pagination
      query = query.offset(offset).limit(limit);

      // Exécuter la requête
      const snapshot = await query.get();

      // Mapper les résultats
      const invitations: UserInvitation[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Récupérer le nom de l'inviteur
        let invitedByName = 'Unknown';
        try {
          const inviterDoc = await collections.users.doc(data.invitedBy).get();
          if (inviterDoc.exists) {
            const inviterData = inviterDoc.data();
            invitedByName = `${inviterData.firstName} ${inviterData.lastName}`;
          }
        } catch (error) {
          logger.warn('Impossible de récupérer le nom de l\'inviteur', { invitedBy: data.invitedBy });
        }

        invitations.push({
          id: doc.id,
          tenantId: data.tenantId,
          email: data.email,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          role: data.role,
          status: data.status,
          invitedBy: data.invitedBy,
          invitedByName,
          permissions: data.permissions || [],
          department: data.department,
          createdAt: data.createdAt?.toDate() || new Date(),
          expiresAt: data.expiresAt?.toDate() || new Date(),
          acceptedAt: data.acceptedAt?.toDate(),
          rejectedAt: data.rejectedAt?.toDate()
        });
      }

      logger.info(`✅ ${invitations.length} invitations récupérées sur ${total}`, {
        tenantId,
        returned: invitations.length,
        total
      });

      return {
        invitations,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };

    } catch (error) {
      logger.error('Erreur lors de la récupération des invitations', error);
      throw error;
    }
  }

  /**
   * Récupérer une invitation par son ID
   */
  async getInvitationById(invitationId: string): Promise<UserInvitation | null> {
    try {
      const doc = await collections.user_invitations.doc(invitationId).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();

      // Récupérer le nom de l'inviteur
      let invitedByName = 'Unknown';
      try {
        const inviterDoc = await collections.users.doc(data.invitedBy).get();
        if (inviterDoc.exists) {
          const inviterData = inviterDoc.data();
          invitedByName = `${inviterData.firstName} ${inviterData.lastName}`;
        }
      } catch (error) {
        logger.warn('Impossible de récupérer le nom de l\'inviteur', { invitedBy: data.invitedBy });
      }

      return {
        id: doc.id,
        tenantId: data.tenantId,
        email: data.email,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        role: data.role,
        status: data.status,
        invitedBy: data.invitedBy,
        invitedByName,
        permissions: data.permissions || [],
        department: data.department,
        createdAt: data.createdAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate() || new Date(),
        acceptedAt: data.acceptedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate()
      };

    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'invitation', error);
      throw error;
    }
  }

  /**
   * Marquer les invitations expirées
   */
  async markExpiredInvitations(tenantId: string): Promise<number> {
    try {
      const now = new Date();
      
      // Trouver les invitations expirées
      const expiredSnapshot = await collections.user_invitations
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'pending')
        .where('expiresAt', '<', now)
        .get();

      if (expiredSnapshot.empty) {
        return 0;
      }

      // Mettre à jour en batch
      const batch = collections.user_invitations.firestore.batch();
      
      expiredSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'expired',
          updatedAt: FieldValue.serverTimestamp()
        });
      });

      await batch.commit();

      logger.info(`✅ ${expiredSnapshot.size} invitations marquées comme expirées`, {
        tenantId,
        count: expiredSnapshot.size
      });

      return expiredSnapshot.size;

    } catch (error) {
      logger.error('Erreur lors du marquage des invitations expirées', error);
      throw error;
    }
  }

  /**
   * Supprimer une invitation
   */
  async deleteInvitation(invitationId: string): Promise<void> {
    try {
      await collections.user_invitations.doc(invitationId).delete();
      
      logger.info('✅ Invitation supprimée', { invitationId });

    } catch (error) {
      logger.error('Erreur lors de la suppression de l\'invitation', error);
      throw error;
    }
  }

  /**
   * Renvoyer une invitation (créer une nouvelle avec nouvelle date d'expiration)
   */
  async resendInvitation(invitationId: string): Promise<UserInvitation> {
    try {
      const invitation = await this.getInvitationById(invitationId);

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending' && invitation.status !== 'expired') {
        throw new Error('Cannot resend invitation with status: ' + invitation.status);
      }

      // Mettre à jour la date d'expiration
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

      await collections.user_invitations.doc(invitationId).update({
        status: 'pending',
        expiresAt: newExpiresAt,
        updatedAt: FieldValue.serverTimestamp()
      });

      logger.info('✅ Invitation renvoyée', { invitationId, newExpiresAt });

      return {
        ...invitation,
        status: 'pending',
        expiresAt: newExpiresAt
      };

    } catch (error) {
      logger.error('Erreur lors du renvoi de l\'invitation', error);
      throw error;
    }
  }
}

// Instance singleton
export const userInvitationService = new UserInvitationService();
export default userInvitationService;
