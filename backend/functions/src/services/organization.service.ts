import { db } from '../config/firebase';
import { logger } from 'firebase-functions';
import { UserRole } from '@attendance-x/shared';
import { FieldValue } from 'firebase-admin/firestore';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  adminUserId?: string;
  settings: {
    allowSelfRegistration: boolean;
    requireEmailVerification: boolean;
    defaultUserRole: UserRole;
  };
  stats: {
    totalUsers: number;
    totalEvents: number;
  };
}

export class OrganizationService {
  private static instance: OrganizationService;
  private db = db;

  static getInstance(): OrganizationService {
    if (!OrganizationService.instance) {
      OrganizationService.instance = new OrganizationService();
    }
    return OrganizationService.instance;
  }

  /**
   * Créer un slug unique à partir du nom de l'organisation
   */
  private createSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9\s-]/g, '') // Garder seulement lettres, chiffres, espaces et tirets
      .replace(/\s+/g, '-') // Remplacer espaces par tirets
      .replace(/-+/g, '-') // Éviter les tirets multiples
      .trim();
  }

  /**
   * Vérifier si une organisation existe déjà
   */
  async organizationExists(name: string): Promise<boolean> {
    try {
      const slug = this.createSlug(name);
      const orgRef = await this.db
        .collection('organizations')
        .where('slug', '==', slug)
        .limit(1)
        .get();

      return !orgRef.empty;
    } catch (error) {
      logger.error('Error checking organization existence:', error);
      return false;
    }
  }

  /**
   * Obtenir une organisation par son slug
   */
  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    try {
      const orgRef = await this.db
        .collection('organizations')
        .where('slug', '==', slug)
        .limit(1)
        .get();

      if (orgRef.empty) {
        return null;
      }

      const doc = orgRef.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Organization;
    } catch (error) {
      logger.error('Error getting organization by slug:', error);
      return null;
    }
  }

  /**
   * Obtenir une organisation par son nom
   */
  async getOrganizationByName(name: string): Promise<Organization | null> {
    const slug = this.createSlug(name);
    return this.getOrganizationBySlug(slug);
  }

  /**
   * Créer une nouvelle organisation
   */
  async createOrganization(name: string, adminUserId: string): Promise<Organization> {
    try {
      const slug = this.createSlug(name);
      
      // Vérifier si l'organisation existe déjà
      const existingOrg = await this.getOrganizationBySlug(slug);
      if (existingOrg) {
        throw new Error(`Une organisation avec le nom "${name}" existe déjà`);
      }

      const now = new Date();
      const orgData: Omit<Organization, 'id'> = {
        name: name.trim(),
        slug,
        createdAt: now,
        updatedAt: now,
        adminUserId,
        settings: {
          allowSelfRegistration: true,
          requireEmailVerification: true,
          defaultUserRole: UserRole.PARTICIPANT
        },
        stats: {
          totalUsers: 1, // Le premier utilisateur (admin)
          totalEvents: 0
        }
      };

      const docRef = await this.db.collection('organizations').add(orgData);
      
      logger.info('Organization created successfully', {
        organizationId: docRef.id,
        name,
        slug,
        adminUserId
      });

      return {
        id: docRef.id,
        ...orgData
      };
    } catch (error) {
      logger.error('Error creating organization:', error);
      throw error;
    }
  }

  /**
   * Déterminer le rôle d'un utilisateur lors de l'inscription
   * Le premier utilisateur d'une organisation devient admin
   */
  async determineUserRole(organizationName: string): Promise<{
    role: UserRole;
    isFirstUser: boolean;
    organizationId?: string;
  }> {
    try {
      const existingOrg = await this.getOrganizationByName(organizationName);
      
      if (!existingOrg) {
        // Nouvelle organisation - l'utilisateur sera admin
        return {
          role: UserRole.ADMIN,
          isFirstUser: true
        };
      } else {
        // Organisation existante - utilisateur normal
        return {
          role: existingOrg.settings.defaultUserRole,
          isFirstUser: false,
          organizationId: existingOrg.id
        };
      }
    } catch (error) {
      logger.error('Error determining user role:', error);
      // En cas d'erreur, donner le rôle participant par défaut
      return {
        role: UserRole.PARTICIPANT,
        isFirstUser: false
      };
    }
  }

  /**
   * Incrémenter le nombre d'utilisateurs dans une organisation
   */
  async incrementUserCount(organizationId: string): Promise<void> {
    try {
      await this.db.collection('organizations').doc(organizationId).update({
        'stats.totalUsers': FieldValue.increment(1),
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error incrementing user count:', error);
      // Ne pas faire échouer l'inscription pour cette erreur
    }
  }

  /**
   * Obtenir les statistiques d'une organisation
   */
  async getOrganizationStats(organizationId: string): Promise<Organization['stats'] | null> {
    try {
      const doc = await this.db.collection('organizations').doc(organizationId).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data() as Organization;
      return data.stats;
    } catch (error) {
      logger.error('Error getting organization stats:', error);
      return null;
    }
  }

  /**
   * Mettre à jour les paramètres d'une organisation
   */
  async updateOrganizationSettings(
    organizationId: string, 
    settings: Partial<Organization['settings']>
  ): Promise<void> {
    try {
      await this.db.collection('organizations').doc(organizationId).update({
        settings: {
          ...settings
        },
        updatedAt: new Date()
      });

      logger.info('Organization settings updated', {
        organizationId,
        settings
      });
    } catch (error) {
      logger.error('Error updating organization settings:', error);
      throw error;
    }
  }
}

export const organizationService = OrganizationService.getInstance();