import { db } from '../../config/index';
import { OrganizationModel } from '../../models/organization.model';
import { UserModel } from '../../models/user.model';
import { OrganizationSector, OrganizationStatus } from '../../common/types';
import { logger } from 'firebase-functions';

interface MigrationStats {
  totalUsers: number;
  usersWithOrganization: number;
  usersWithoutOrganization: number;
  organizationsCreated: number;
  usersMigrated: number;
  errors: Array<{
    userId: string;
    error: string;
  }>;
}

interface MigrationOptions {
  dryRun?: boolean;
  batchSize?: number;
  defaultOrganizationName?: string;
  defaultSector?: OrganizationSector;
}

/**
 * Script de migration pour ajouter le contexte organisationnel aux utilisateurs existants
 */
export class OrganizationMigration {
  private stats: MigrationStats = {
    totalUsers: 0,
    usersWithOrganization: 0,
    usersWithoutOrganization: 0,
    organizationsCreated: 0,
    usersMigrated: 0,
    errors: []
  };

  /**
   * Exécuter la migration complète
   */
  async runMigration(options: MigrationOptions = {}): Promise<MigrationStats> {
    const {
      dryRun = false,
      batchSize = 100,
      defaultOrganizationName = 'Mon Organisation',
      defaultSector = OrganizationSector.OTHER
    } = options;

    logger.info('Starting organization migration', {
      dryRun,
      batchSize,
      defaultOrganizationName,
      defaultSector
    });

    try {
      // 1. Analyser les utilisateurs existants
      await this.analyzeExistingUsers();

      // 2. Créer les organisations par défaut pour les utilisateurs sans organisation
      if (!dryRun) {
        await this.createDefaultOrganizations(batchSize, defaultOrganizationName, defaultSector);
      }

      // 3. Valider la migration
      await this.validateMigration();

      logger.info('Migration completed successfully', this.stats);
      return this.stats;

    } catch (error) {
      logger.error('Migration failed', error);
      throw error;
    }
  }

  /**
   * Analyser les utilisateurs existants
   */
  private async analyzeExistingUsers(): Promise<void> {
    logger.info('Analyzing existing users...');

    const usersSnapshot = await db.collection('users').get();
    this.stats.totalUsers = usersSnapshot.size;

    let usersWithOrg = 0;
    let usersWithoutOrg = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      if (userData.organizationId) {
        usersWithOrg++;
      } else {
        usersWithoutOrg++;
      }
    }

    this.stats.usersWithOrganization = usersWithOrg;
    this.stats.usersWithoutOrganization = usersWithoutOrg;

    logger.info('User analysis completed', {
      totalUsers: this.stats.totalUsers,
      usersWithOrganization: this.stats.usersWithOrganization,
      usersWithoutOrganization: this.stats.usersWithoutOrganization
    });
  }

  /**
   * Créer des organisations par défaut pour les utilisateurs sans organisation
   */
  private async createDefaultOrganizations(
    batchSize: number,
    defaultOrganizationName: string,
    defaultSector: OrganizationSector
  ): Promise<void> {
    logger.info('Creating default organizations for users without organization...');

    // Récupérer les utilisateurs sans organisation par batch
    const usersQuery = db.collection('users')
      .where('organizationId', '==', null)
      .limit(batchSize);

    let lastDoc = null;
    let processedCount = 0;

    do {
      let query = usersQuery;
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        break;
      }

      // Traiter ce batch d'utilisateurs
      const batch = db.batch();
      const organizationsToCreate: Array<{
        organization: OrganizationModel;
        userId: string;
        userRef: FirebaseFirestore.DocumentReference;
      }> = [];

      for (const userDoc of snapshot.docs) {
        try {
          const userData = userDoc.data();
          const user = UserModel.fromFirestore(userDoc);

          if (!user || userData.organizationId) {
            continue; // Skip si l'utilisateur a déjà une organisation
          }

          // Créer une organisation par défaut pour cet utilisateur
          const organizationName = this.generateOrganizationName(userData, defaultOrganizationName);
          const organization = this.createDefaultOrganization(
            organizationName,
            defaultSector,
            user.id!,
            userData
          );

          organizationsToCreate.push({
            organization,
            userId: user.id!,
            userRef: userDoc.ref
          });

        } catch (error) {
          this.stats.errors.push({
            userId: userDoc.id,
            error: error instanceof Error ? error.message : String(error)
          });
          logger.error('Error processing user', { userId: userDoc.id, error });
        }
      }

      // Créer les organisations et mettre à jour les utilisateurs
      for (const { organization, userId, userRef } of organizationsToCreate) {
        try {
          // Créer l'organisation
          const orgRef = db.collection('organizations').doc();
          organization.getData().id = orgRef.id;
          batch.set(orgRef, organization.toFirestore());

          // Mettre à jour l'utilisateur
          batch.update(userRef, {
            organizationId: orgRef.id,
            isOrganizationAdmin: true,
            organizationRole: 'owner',
            joinedOrganizationAt: new Date(),
            updatedAt: new Date()
          });

          this.stats.organizationsCreated++;
          this.stats.usersMigrated++;

        } catch (error) {
          this.stats.errors.push({
            userId,
            error: error instanceof Error ? error.message : String(error)
          });
          logger.error('Error creating organization for user', { userId, error });
        }
      }

      // Exécuter le batch
      if (organizationsToCreate.length > 0) {
        await batch.commit();
        logger.info(`Processed batch of ${organizationsToCreate.length} users`);
      }

      processedCount += snapshot.size;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];

    } while (lastDoc && processedCount < this.stats.usersWithoutOrganization);

    logger.info('Default organizations creation completed', {
      organizationsCreated: this.stats.organizationsCreated,
      usersMigrated: this.stats.usersMigrated,
      errors: this.stats.errors.length
    });
  }

  /**
   * Générer un nom d'organisation basé sur les données utilisateur
   */
  private generateOrganizationName(userData: any, defaultName: string): string {
    // Essayer de générer un nom basé sur les informations utilisateur
    if (userData.firstName && userData.lastName) {
      return `Organisation de ${userData.firstName} ${userData.lastName}`;
    }
    
    if (userData.displayName) {
      return `Organisation de ${userData.displayName}`;
    }

    if (userData.email) {
      const emailPrefix = userData.email.split('@')[0];
      return `Organisation de ${emailPrefix}`;
    }

    return defaultName;
  }

  /**
   * Créer une organisation par défaut
   */
  private createDefaultOrganization(
    name: string,
    sector: OrganizationSector,
    createdBy: string,
    userData: any
  ): OrganizationModel {
    const organizationData = {
      name,
      description: `Organisation créée automatiquement lors de la migration`,
      sector,
      status: OrganizationStatus.ACTIVE,
      contactInfo: {
        email: userData.email || undefined
      },
      settings: {
        features: {
          appointments: true,
          attendance: true,
          sales: false,
          clients: true,
          products: false,
          events: true
        },
        branding: {
          primaryColor: '#3B82F6',
          secondaryColor: '#EF4444'
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          digestFrequency: 'weekly' as const
        },
        security: {
          requireTwoFactor: false,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: false,
            requireLowercase: false,
            requireNumbers: true,
            requireSymbols: false
          },
          sessionTimeout: 3600,
          allowedDomains: []
        }
      },
      createdBy,
      adminIds: [createdBy],
      memberCount: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new OrganizationModel(organizationData);
  }

  /**
   * Valider la migration
   */
  private async validateMigration(): Promise<void> {
    logger.info('Validating migration...');

    // Vérifier que tous les utilisateurs ont maintenant une organisation
    const usersWithoutOrgSnapshot = await db.collection('users')
      .where('organizationId', '==', null)
      .get();

    const remainingUsersWithoutOrg = usersWithoutOrgSnapshot.size;

    if (remainingUsersWithoutOrg > 0) {
      logger.warn(`${remainingUsersWithoutOrg} users still without organization after migration`);
    }

    // Vérifier l'intégrité des organisations créées
    const organizationsSnapshot = await db.collection('organizations').get();
    let validOrganizations = 0;
    let invalidOrganizations = 0;

    for (const orgDoc of organizationsSnapshot.docs) {
      try {
        const org = OrganizationModel.fromFirestore(orgDoc);
        if (org) {
          await org.validate();
          validOrganizations++;
        } else {
          invalidOrganizations++;
        }
      } catch (error) {
        invalidOrganizations++;
        logger.error('Invalid organization found', { orgId: orgDoc.id, error });
      }
    }

    logger.info('Migration validation completed', {
      remainingUsersWithoutOrg,
      validOrganizations,
      invalidOrganizations,
      totalErrors: this.stats.errors.length
    });
  }

  /**
   * Rollback de la migration (pour les tests ou en cas de problème)
   */
  async rollbackMigration(): Promise<void> {
    logger.info('Starting migration rollback...');

    try {
      // 1. Supprimer les organisations créées pendant la migration
      const organizationsSnapshot = await db.collection('organizations')
        .where('description', '==', 'Organisation créée automatiquement lors de la migration')
        .get();

      const batch = db.batch();
      let deletedOrganizations = 0;

      for (const orgDoc of organizationsSnapshot.docs) {
        batch.delete(orgDoc.ref);
        deletedOrganizations++;
      }

      if (deletedOrganizations > 0) {
        await batch.commit();
        logger.info(`Deleted ${deletedOrganizations} migration organizations`);
      }

      // 2. Réinitialiser les champs d'organisation des utilisateurs
      const usersSnapshot = await db.collection('users')
        .where('organizationRole', '==', 'owner')
        .get();

      const userBatch = db.batch();
      let resetUsers = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Vérifier si c'est un utilisateur migré (a rejoint récemment)
        if (userData.joinedOrganizationAt) {
          const joinedDate = userData.joinedOrganizationAt.toDate();
          const now = new Date();
          const diffHours = (now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60);
          
          // Si rejoint dans les dernières 24h, probablement migré
          if (diffHours < 24) {
            userBatch.update(userDoc.ref, {
              organizationId: null,
              isOrganizationAdmin: false,
              organizationRole: null,
              joinedOrganizationAt: null
            });
            resetUsers++;
          }
        }
      }

      if (resetUsers > 0) {
        await userBatch.commit();
        logger.info(`Reset ${resetUsers} users`);
      }

      logger.info('Migration rollback completed successfully');

    } catch (error) {
      logger.error('Rollback failed', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques de migration
   */
  getStats(): MigrationStats {
    return { ...this.stats };
  }

  /**
   * Réinitialiser les statistiques
   */
  resetStats(): void {
    this.stats = {
      totalUsers: 0,
      usersWithOrganization: 0,
      usersWithoutOrganization: 0,
      organizationsCreated: 0,
      usersMigrated: 0,
      errors: []
    };
  }
}

/**
 * Fonction utilitaire pour exécuter la migration depuis une Cloud Function
 */
export async function runOrganizationMigration(options: MigrationOptions = {}): Promise<MigrationStats> {
  const migration = new OrganizationMigration();
  return await migration.runMigration(options);
}

/**
 * Fonction utilitaire pour le rollback
 */
export async function rollbackOrganizationMigration(): Promise<void> {
  const migration = new OrganizationMigration();
  return await migration.rollbackMigration();
}