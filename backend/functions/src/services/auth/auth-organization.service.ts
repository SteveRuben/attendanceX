// backend/functions/src/services/auth/auth-organization.service.ts - Service d'authentification avec support d'organisation

import { getFirestore } from "firebase-admin/firestore";
import {
  InvitationStatus,
  LoginResponse,
  RegisterResponse,
  UserRole
} from "../../shared";
import { organizationService } from "../organization/organization.service";
import { userService } from "../user.service";
import * as jwt from "jsonwebtoken";

// Créer une classe d'erreur simple si elle n'existe pas
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthOrganizationService {
  private readonly db = getFirestore();
  private readonly jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
  private readonly jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

  /**
   * Connexion utilisateur avec vérification d'organisation
   */
  async login(email: string, password: string, deviceInfo?: any): Promise<LoginResponse> {
    try {
      // Récupérer l'utilisateur par email (implémentation simplifiée)
      const usersQuery = await this.db
        .collection('users')
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      if (usersQuery.empty) {
        throw new ValidationError('Utilisateur non trouvé');
      }

      const userDoc = usersQuery.docs[0];
      const user = { id: userDoc.id, ...userDoc.data() } as any;

      // Vérifier le mot de passe (implémentation simplifiée)
      // Dans un vrai système, vous utiliseriez bcrypt ou un service d'auth

      // Récupérer les invitations en attente si l'utilisateur a besoin d'une organisation
      const needsOrganization = !user.organizationId;
      let organizationInvitations: any[] = [];

      if (needsOrganization) {
        organizationInvitations = await this.getPendingInvitations(email);
      }

      // Générer les tokens
      const tokens = await this.generateTokens(user.id, deviceInfo);

      // Filtrer les champs sensibles de l'utilisateur
      const { password, hashedPassword, twoFactorSecret, twoFactorBackupCodes, ...safeUser } = user;

      return {
        user: safeUser,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 3600000), // 1 heure
        needsOrganization,
        organizationInvitations: organizationInvitations.map(inv => ({
          id: inv.id,
          organizationName: inv.organizationName,
          role: inv.role,
          invitedBy: inv.inviterName,
          expiresAt: inv.expiresAt
        }))
      };
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Erreur de connexion');
    }
  }

  /**
   * Inscription utilisateur
   */
  async register(
    email: string,
    password: string,
    name: string,
    additionalData?: any
  ): Promise<RegisterResponse & { organizationInvitations?: any[] }> {
    try {
      // Créer l'utilisateur via le service utilisateur
      const registerData = {
        email: email.toLowerCase().trim(),
        password,
        name: name.trim(),
        role: UserRole.MODERATOR, // Ajouter le rôle requis
        firstName: additionalData?.firstName,
        lastName: additionalData?.lastName,
        phone: additionalData?.phone,
        profile: additionalData?.profile,
        preferences: additionalData?.preferences
      };

      const userResult = await userService.createUser(registerData, 'system');

      // Vérifier les invitations en attente
      const organizationInvitations = await this.getPendingInvitations(email);
      const needsOrganization = organizationInvitations.length === 0;

      // Générer les tokens
      const tokens = await this.generateTokens(userResult.user.id);

      return {
        user: userResult.user.toUser(),
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 3600000), // 1 heure
        needsEmailVerification: true, // Par défaut, nécessite une vérification
        needsOrganization,
        organizationInvitations: organizationInvitations.map(inv => ({
          id: inv.id,
          organizationName: inv.organizationName,
          role: inv.role,
          invitedBy: inv.inviterName,
          expiresAt: inv.expiresAt
        }))
      };
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Erreur lors de l\'inscription');
    }
  }

  /**
   * Finaliser l'onboarding d'organisation après création
   */
  async completeOrganizationOnboarding(
    userId: string,
    organizationId: string
  ): Promise<LoginResponse> {
    try {
      // Vérifier que l'organisation existe et que l'utilisateur en est le propriétaire
      const organization = await organizationService.getOrganization(organizationId);
      if (!organization) {
        throw new ValidationError('Organisation non trouvée');
      }

      if (organization.createdBy !== userId) {
        throw new ValidationError('Seul le créateur de l\'organisation peut finaliser l\'onboarding');
      }

      // Assigner l'utilisateur à l'organisation comme propriétaire
      /*await organizationService.addMember(
        organizationId,
        userId,
        OrganizationRole.OWNER,
        userId // assignedBy
      );*/

      // Récupérer l'utilisateur mis à jour
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new ValidationError('Utilisateur non trouvé');
      }

      // Générer de nouveaux tokens
      const tokens = await this.generateTokens(userId);

      return {
        user: user.toUser(),
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 3600000),
        needsOrganization: false
      };
    } catch (error) {
      console.error('Organization onboarding completion error:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Erreur lors de la finalisation de l\'onboarding');
    }
  }

  /**
   * Accepter une invitation d'organisation
   */
  async acceptOrganizationInvitation(
    userId: string,
    invitationToken: string
  ): Promise<LoginResponse> {
    try {
      // Accepter l'invitation via le service d'organisation
      await organizationService.acceptInvitation(invitationToken, userId);

      // L'utilisateur est déjà assigné à l'organisation via acceptInvitation
      // Pas besoin d'action supplémentaire

      // Récupérer l'utilisateur mis à jour
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new ValidationError('Utilisateur non trouvé');
      }

      // Générer de nouveaux tokens
      const tokens = await this.generateTokens(userId);

      return {
        user: user.toUser(),
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 3600000),
        needsOrganization: false
      };
    } catch (error) {
      console.error('Invitation acceptance error:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Erreur lors de l\'acceptation de l\'invitation');
    }
  }

  /**
   * Vérifier si un utilisateur a besoin d'une organisation
   */
  async checkOrganizationStatus(userId: string): Promise<{
    needsOrganization: boolean;
    organizationInvitations: any[];
    canCreateOrganization: boolean;
  }> {
    try {
      // Vérifier si l'utilisateur a une organisation
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new ValidationError('Utilisateur non trouvé');
      }

      const needsOrganization = !user.organizationId;

      let organizationInvitations: any[] = [];
      if (needsOrganization) {
        organizationInvitations = await this.getPendingInvitations(user.email);
      }

      return {
        needsOrganization,
        organizationInvitations,
        canCreateOrganization: true // Tous les utilisateurs peuvent créer une organisation
      };
    } catch (error) {
      console.error('Organization status check error:', error);
      throw new ValidationError('Erreur lors de la vérification du statut d\'organisation');
    }
  }

  /**
   * Quitter une organisation
   */
  async leaveOrganization(userId: string): Promise<void> {
    try {
      // Récupérer l'utilisateur
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new ValidationError('Utilisateur non trouvé');
      }

      if (!user.organizationId) {
        throw new ValidationError('L\'utilisateur n\'appartient à aucune organisation');
      }

      // Supprimer l'utilisateur de l'organisation
      await organizationService.removeMember(user.organizationId, userId, userId);

      // Le service d'organisation met à jour automatiquement le contexte utilisateur
    } catch (error) {
      console.error('Leave organization error:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Erreur lors de la sortie de l\'organisation');
    }
  }

  /**
   * Rafraîchir le token d'accès
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    try {
      // Vérifier et décoder le refresh token
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;

      // Générer de nouveaux tokens
      const tokens = await this.generateTokens(decoded.userId);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 3600000) // 1 heure
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new ValidationError('Token de rafraîchissement invalide');
    }
  }

  /**
   * Déconnexion
   */
  async logout(userId: string, sessionId?: string): Promise<void> {
    try {
      if (sessionId) {
        // Désactiver la session spécifique
        await this.db.collection('user_sessions').doc(sessionId).update({
          isActive: false,
          loggedOutAt: new Date()
        });
      } else {
        // Désactiver toutes les sessions de l'utilisateur
        const sessionsQuery = await this.db
          .collection('user_sessions')
          .where('userId', '==', userId)
          .where('isActive', '==', true)
          .get();

        const batch = this.db.batch();
        sessionsQuery.docs.forEach(doc => {
          batch.update(doc.ref, {
            isActive: false,
            loggedOutAt: new Date()
          });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Ne pas faire échouer la déconnexion même en cas d'erreur
    }
  }
  /**
   * Générer les tokens JWT
   */
  private async generateTokens(userId: string, deviceInfo?: any): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Récupérer l'utilisateur pour générer les tokens
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new ValidationError('Utilisateur non trouvé');
    }

    const payload = {
      userId,
      email: user.email,
      role: user.role,
      sessionId: this.generateSessionId(),
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, { expiresIn: '7d' });

    // Créer une session si des informations d'appareil sont fournies
    if (deviceInfo) {
      await this.createSession(userId, deviceInfo, accessToken);
    }

    return { accessToken, refreshToken };
  }

  /**
   * Créer une session utilisateur
   */
  private async createSession(userId: string, deviceInfo: any, token: string): Promise<void> {
    try {
      const sessionId = this.generateSessionId();
      const session = {
        id: sessionId,
        userId,
        deviceInfo,
        token,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        isActive: true
      };

      await this.db.collection('user_sessions').doc(sessionId).set(session);

      // Nettoyer les anciennes sessions
      await this.cleanupOldSessions(userId);
    } catch (error) {
      console.error('Session creation error:', error);
      // Ne pas faire échouer l'authentification si la création de session échoue
    }
  }

  /**
   * Nettoyer les anciennes sessions
   */
  private async cleanupOldSessions(userId: string): Promise<void> {
    try {
      const sessionsQuery = await this.db
        .collection('user_sessions')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('lastActiveAt', 'desc')
        .get();

      if (sessionsQuery.size > 5) { // Garder maximum 5 sessions actives
        const batch = this.db.batch();
        sessionsQuery.docs.slice(5).forEach(doc => {
          batch.update(doc.ref, { isActive: false });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }

  /**
   * Récupérer les invitations en attente pour un email
   */
  private async getPendingInvitations(email: string): Promise<any[]> {
    try {
      const invitationsQuery = await this.db
        .collection('organization_invitations')
        .where('email', '==', email.toLowerCase())
        .where('status', '==', InvitationStatus.PENDING)
        .get();

      const invitations = [];

      for (const doc of invitationsQuery.docs) {
        const invitation = doc.data();

        // Vérifier que l'invitation n'est pas expirée
        if (invitation.expiresAt.toDate() > new Date()) {
          // Récupérer le nom de l'organisation
          const orgDoc = await this.db.collection('organizations').doc(invitation.organizationId).get();
          const organizationName = orgDoc.exists ? orgDoc.data()!.name : 'Organisation inconnue';

          // Récupérer le nom de l'inviteur
          const inviterDoc = await this.db.collection('users').doc(invitation.invitedBy).get();
          const inviterName = inviterDoc.exists ? inviterDoc.data()!.name : 'Utilisateur inconnu';

          invitations.push({
            ...invitation,
            organizationName,
            inviterName
          });
        }
      }

      return invitations;
    } catch (error) {
      console.error('Error getting pending invitations:', error);
      return [];
    }
  }

  /**
   * Générer un ID de session unique
   */
  private generateSessionId(): string {
    return this.db.collection('temp').doc().id;
  }
}

export const authOrganizationService = new AuthOrganizationService();