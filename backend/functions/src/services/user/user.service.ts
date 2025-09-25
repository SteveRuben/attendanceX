import { logger } from "firebase-functions";
import { collections } from "../../config";

/**
 * Interface utilisateur simplifiée
 */
export interface SimpleUser {
  id?: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Service utilisateur simplifié pour les résolutions
 */
export class UserService {
  
  /**
   * Obtenir un utilisateur par ID
   */
  static async getUserById(userId: string, tenantId: string): Promise<SimpleUser | null> {
    try {
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      
      // Vérifier que l'utilisateur appartient au bon tenant (si applicable)
      if (userData?.tenantId && userData.tenantId !== tenantId) {
        return null;
      }

      return {
        id: userDoc.id,
        email: userData?.email || "",
        displayName: userData?.displayName || userData?.name || "",
        firstName: userData?.firstName || "",
        lastName: userData?.lastName || "",
      };

    } catch (error) {
      logger.error(`Error getting user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Obtenir plusieurs utilisateurs par IDs
   */
  static async getUsersByIds(userIds: string[], tenantId: string): Promise<SimpleUser[]> {
    try {
      const users: SimpleUser[] = [];
      
      // Traiter par batch de 10 (limite Firestore pour les requêtes 'in')
      for (let i = 0; i < userIds.length; i += 10) {
        const batch = userIds.slice(i, i + 10);
        
        const snapshot = await collections.users
          .where("__name__", "in", batch.map(id => collections.users.doc(id)))
          .get();

        snapshot.docs.forEach(doc => {
          const userData = doc.data();
          
          // Vérifier le tenant si applicable
          if (!userData?.tenantId || userData.tenantId === tenantId) {
            users.push({
              id: doc.id,
              email: userData?.email || "",
              displayName: userData?.displayName || userData?.name || "",
              firstName: userData?.firstName || "",
              lastName: userData?.lastName || "",
            });
          }
        });
      }

      return users;

    } catch (error) {
      logger.error("Error getting users by IDs:", error);
      return [];
    }
  }
}