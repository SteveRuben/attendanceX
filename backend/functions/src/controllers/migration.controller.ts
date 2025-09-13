import { Response } from 'express';
import { rollbackOrganizationMigration, runOrganizationMigration } from '../scripts/migrations/organization-migration';
import { OrganizationSector, TenantRole } from '../shared';
import { logger } from 'firebase-functions';
import { AuthenticatedRequest } from '../types';


/**
 * Contrôleur pour les opérations de migration d'organisation
 */
export class MigrationController {
  /**
   * Exécuter la migration d'organisation
   */
  async runMigration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        dryRun = false,
        batchSize = 100,
        defaultOrganizationName = 'Mon Organisation',
        defaultSector = OrganizationSector.OTHER
      } = req.body;

      logger.info('Migration request received', {
        dryRun,
        batchSize,
        defaultOrganizationName,
        defaultSector,
        requestedBy: req.user?.uid
      });

      // Vérifier les permissions (seuls les super admins peuvent exécuter la migration)
      if (!req.user?.role || req.user.role !== TenantRole.ADMIN) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions. Super admin role required.'
        });
        return;
      }

      const stats = await runOrganizationMigration({
        dryRun,
        batchSize,
        defaultOrganizationName,
        defaultSector
      });

      res.status(200).json({
        success: true,
        message: dryRun ? 'Migration simulation completed' : 'Migration completed successfully',
        data: stats
      });

    } catch (error) {
      logger.error('Migration failed', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Rollback de la migration
   */
  async rollbackMigration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      logger.info('Migration rollback request received', {
        requestedBy: req.user?.uid
      });

      // Vérifier les permissions (seuls les super admins peuvent faire un rollback)
      if (!req.user?.role || req.user.role !== TenantRole.ADMIN) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions. Super admin role required.'
        });
        return;
      }

      await rollbackOrganizationMigration();

      res.status(200).json({
        success: true,
        message: 'Migration rollback completed successfully'
      });

    } catch (error) {
      logger.error('Migration rollback failed', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Migration rollback failed',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Obtenir le statut de la migration
   */
  async getMigrationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Analyser l'état actuel des utilisateurs et organisations
      const { db } = await import('../config/index.js');
      
      const [usersSnapshot, organizationsSnapshot] = await Promise.all([
        db.collection('users').get(),
        db.collection('organizations').get()
      ]);

      let usersWithOrganization = 0;
      let usersWithoutOrganization = 0;
      let migrationOrganizations = 0;

      // Analyser les utilisateurs
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userData.organizationId) {
          usersWithOrganization++;
        } else {
          usersWithoutOrganization++;
        }
      }

      // Analyser les organisations (compter celles créées par migration)
      for (const orgDoc of organizationsSnapshot.docs) {
        const orgData = orgDoc.data();
        if (orgData.description === 'Organisation créée automatiquement lors de la migration') {
          migrationOrganizations++;
        }
      }

      const migrationNeeded = usersWithoutOrganization > 0;
      const migrationCompleted = usersWithoutOrganization === 0 && usersSnapshot.size > 0;

      res.status(200).json({
        success: true,
        data: {
          totalUsers: usersSnapshot.size,
          totalOrganizations: organizationsSnapshot.size,
          usersWithOrganization,
          usersWithoutOrganization,
          migrationOrganizations,
          migrationNeeded,
          migrationCompleted,
          migrationProgress: usersSnapshot.size > 0 ? (usersWithOrganization / usersSnapshot.size) * 100 : 0
        }
      });

    } catch (error) {
      logger.error('Failed to get migration status', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get migration status'
      });
    }
  }

  /**
   * Valider l'intégrité des données après migration
   */
  async validateMigration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { db } = await import('../config/index.js');
      const { OrganizationModel } = await import('../models/organization.model.js');
      const { UserModel } = await import('../models/user.model.js');

      const validationResults = {
        usersValidation: {
          total: 0,
          valid: 0,
          invalid: 0,
          errors: [] as Array<{ userId: string; error: string }>
        },
        organizationsValidation: {
          total: 0,
          valid: 0,
          invalid: 0,
          errors: [] as Array<{ organizationId: string; error: string }>
        },
        dataIntegrity: {
          orphanedUsers: 0,
          orphanedOrganizations: 0,
          inconsistentMemberCounts: 0
        }
      };

      // Valider les utilisateurs
      const usersSnapshot = await db.collection('users').get();
      validationResults.usersValidation.total = usersSnapshot.size;

      for (const userDoc of usersSnapshot.docs) {
        try {
          const user = UserModel.fromFirestore(userDoc);
          if (user) {
            await user.validate();
            validationResults.usersValidation.valid++;
          } else {
            validationResults.usersValidation.invalid++;
            validationResults.usersValidation.errors.push({
              userId: userDoc.id,
              error: 'Failed to create user model'
            });
          }
        } catch (error) {
          validationResults.usersValidation.invalid++;
          validationResults.usersValidation.errors.push({
            userId: userDoc.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Valider les organisations
      const organizationsSnapshot = await db.collection('organizations').get();
      validationResults.organizationsValidation.total = organizationsSnapshot.size;

      for (const orgDoc of organizationsSnapshot.docs) {
        try {
          const organization = OrganizationModel.fromFirestore(orgDoc);
          if (organization) {
            await organization.validate();
            validationResults.organizationsValidation.valid++;
          } else {
            validationResults.organizationsValidation.invalid++;
            validationResults.organizationsValidation.errors.push({
              organizationId: orgDoc.id,
              error: 'Failed to create organization model'
            });
          }
        } catch (error) {
          validationResults.organizationsValidation.invalid++;
          validationResults.organizationsValidation.errors.push({
            organizationId: orgDoc.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Vérifier l'intégrité des données
      // Utilisateurs orphelins (avec organizationId mais organisation inexistante)
      const organizationIds = new Set(organizationsSnapshot.docs.map(doc => doc.id));
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userData.organizationId && !organizationIds.has(userData.organizationId)) {
          validationResults.dataIntegrity.orphanedUsers++;
        }
      }

      // Organisations orphelines (sans utilisateurs)
      const usersByOrganization = new Map<string, number>();
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userData.organizationId) {
          const count = usersByOrganization.get(userData.organizationId) || 0;
          usersByOrganization.set(userData.organizationId, count + 1);
        }
      }

      for (const orgDoc of organizationsSnapshot.docs) {
        const orgData = orgDoc.data();
        const actualMemberCount = usersByOrganization.get(orgDoc.id) || 0;
        
        if (actualMemberCount === 0) {
          validationResults.dataIntegrity.orphanedOrganizations++;
        }
        
        if (orgData.memberCount !== actualMemberCount) {
          validationResults.dataIntegrity.inconsistentMemberCounts++;
        }
      }

      const isValid = validationResults.usersValidation.invalid === 0 &&
                     validationResults.organizationsValidation.invalid === 0 &&
                     validationResults.dataIntegrity.orphanedUsers === 0 &&
                     validationResults.dataIntegrity.orphanedOrganizations === 0 &&
                     validationResults.dataIntegrity.inconsistentMemberCounts === 0;

      res.status(200).json({
        success: true,
        data: {
          isValid,
          ...validationResults
        }
      });

    } catch (error) {
      logger.error('Migration validation failed', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Migration validation failed'
      });
    }
  }
}

export const migrationController = new MigrationController();