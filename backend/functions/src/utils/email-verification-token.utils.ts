import { collections } from "../config/database";
import { EmailVerificationTokenModel } from "../models/email-verification-token.model";
import { EmailVerificationToken } from "@attendance-x/shared";
import { FieldValue } from "firebase-admin/firestore";

export class EmailVerificationTokenUtils {
  
  /**
   * Sauvegarde un token de vérification dans la base de données
   */
  static async saveToken(tokenModel: EmailVerificationTokenModel): Promise<string> {
    try {
      await tokenModel.validate();
      
      const docRef = await collections.email_verification_tokens.add(tokenModel.toFirestore());
      
      // Mettre à jour l'ID du modèle
      tokenModel.update({ id: docRef.id } as Partial<EmailVerificationToken>);
      
      return docRef.id;
    } catch (error) {
      throw new Error(`Failed to save email verification token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Récupère un token par son hash
   */
  static async getTokenByHash(hashedToken: string): Promise<EmailVerificationTokenModel | null> {
    try {
      const querySnapshot = await collections.email_verification_tokens
        .where("hashedToken", "==", hashedToken)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return EmailVerificationTokenModel.fromFirestore(doc);
    } catch (error) {
      throw new Error(`Failed to retrieve token by hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Récupère tous les tokens actifs pour un utilisateur
   */
  static async getActiveTokensForUser(userId: string): Promise<EmailVerificationTokenModel[]> {
    try {
      const querySnapshot = await collections.email_verification_tokens
        .where("userId", "==", userId)
        .where("isUsed", "==", false)
        .where("expiresAt", ">", new Date())
        .get();

      return querySnapshot.docs.map(doc => EmailVerificationTokenModel.fromFirestore(doc)!).filter(Boolean);
    } catch (error) {
      throw new Error(`Failed to retrieve active tokens for user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Récupère tous les tokens (actifs et inactifs) pour un utilisateur
   */
  static async getAllTokensForUser(userId: string): Promise<EmailVerificationTokenModel[]> {
    try {
      const querySnapshot = await collections.email_verification_tokens
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get();

      return querySnapshot.docs.map(doc => EmailVerificationTokenModel.fromFirestore(doc)!).filter(Boolean);
    } catch (error) {
      throw new Error(`Failed to retrieve all tokens for user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Invalide tous les tokens actifs pour un utilisateur
   */
  static async invalidateAllTokensForUser(userId: string): Promise<number> {
    try {
      const activeTokens = await this.getActiveTokensForUser(userId);
      
      if (activeTokens.length === 0) {
        return 0;
      }

      // Utiliser une transaction pour garantir la cohérence
      const batch = collections.email_verification_tokens.firestore.batch();
      
      activeTokens.forEach(token => {
        const docRef = collections.email_verification_tokens.doc(token.id);
        batch.update(docRef, {
          isUsed: true,
          usedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      return activeTokens.length;
    } catch (error) {
      throw new Error(`Failed to invalidate tokens for user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Met à jour un token existant
   */
  static async updateToken(tokenId: string, updates: Partial<EmailVerificationToken>): Promise<void> {
    try {
      const docRef = collections.email_verification_tokens.doc(tokenId);
      
      // Ajouter le timestamp de mise à jour
      const updateData = {
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      };

      await docRef.update(updateData);
    } catch (error) {
      throw new Error(`Failed to update token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Supprime un token par son ID
   */
  static async deleteToken(tokenId: string): Promise<void> {
    try {
      await collections.email_verification_tokens.doc(tokenId).delete();
    } catch (error) {
      throw new Error(`Failed to delete token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Nettoie les tokens expirés
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const now = new Date();
      const querySnapshot = await collections.email_verification_tokens
        .where("expiresAt", "<=", now)
        .get();

      if (querySnapshot.empty) {
        return 0;
      }

      // Utiliser un batch pour supprimer tous les tokens expirés
      const batch = collections.email_verification_tokens.firestore.batch();
      
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return querySnapshot.docs.length;
    } catch (error) {
      throw new Error(`Failed to cleanup expired tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Nettoie les tokens utilisés plus anciens que X jours
   */
  static async cleanupUsedTokens(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const querySnapshot = await collections.email_verification_tokens
        .where("isUsed", "==", true)
        .where("usedAt", "<=", cutoffDate)
        .get();

      if (querySnapshot.empty) {
        return 0;
      }

      // Utiliser un batch pour supprimer tous les tokens utilisés anciens
      const batch = collections.email_verification_tokens.firestore.batch();
      
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return querySnapshot.docs.length;
    } catch (error) {
      throw new Error(`Failed to cleanup used tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compte le nombre de tokens créés pour un utilisateur dans une période donnée
   */
  static async countTokensForUserInPeriod(userId: string, periodHours: number = 1): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - periodHours);

      const querySnapshot = await collections.email_verification_tokens
        .where("userId", "==", userId)
        .where("createdAt", ">=", cutoffDate)
        .get();

      return querySnapshot.size;
    } catch (error) {
      throw new Error(`Failed to count tokens for user in period: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Récupère les statistiques des tokens pour un utilisateur
   */
  static async getTokenStatsForUser(userId: string): Promise<{
    total: number;
    active: number;
    used: number;
    expired: number;
    recentCount: number;
  }> {
    try {
      const allTokens = await this.getAllTokensForUser(userId);
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const stats = {
        total: allTokens.length,
        active: 0,
        used: 0,
        expired: 0,
        recentCount: 0,
      };

      allTokens.forEach(token => {
        const tokenData = token.getTokenData();
        if (tokenData.isUsed) {
          stats.used++;
        } else if (tokenData.expiresAt <= now) {
          stats.expired++;
        } else {
          stats.active++;
        }

        if (tokenData.createdAt >= oneHourAgo) {
          stats.recentCount++;
        }
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get token stats for user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vérifie si un utilisateur peut demander un nouveau token (rate limiting)
   */
  static async canUserRequestToken(userId: string, maxTokensPerHour: number = 3): Promise<{
    canRequest: boolean;
    tokensInLastHour: number;
    nextRequestAllowedAt?: Date;
  }> {
    try {
      const tokensInLastHour = await this.countTokensForUserInPeriod(userId, 1);
      
      if (tokensInLastHour < maxTokensPerHour) {
        return {
          canRequest: true,
          tokensInLastHour,
        };
      }

      // Calculer quand le prochain token peut être demandé
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const querySnapshot = await collections.email_verification_tokens
        .where("userId", "==", userId)
        .where("createdAt", ">=", oneHourAgo)
        .orderBy("createdAt", "asc")
        .limit(1)
        .get();

      let nextRequestAllowedAt: Date | undefined;
      if (!querySnapshot.empty) {
        const oldestTokenInHour = querySnapshot.docs[0].data();
        nextRequestAllowedAt = new Date(oldestTokenInHour.createdAt.toDate().getTime() + 60 * 60 * 1000);
      }

      return {
        canRequest: false,
        tokensInLastHour,
        nextRequestAllowedAt,
      };
    } catch (error) {
      throw new Error(`Failed to check if user can request token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}