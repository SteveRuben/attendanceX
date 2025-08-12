#!/usr/bin/env node

/**
 * Script CLI pour exécuter la migration d'organisation
 * 
 * Usage:
 *   npm run migrate:organizations -- --dry-run
 *   npm run migrate:organizations -- --batch-size=50 --sector=services
 *   npm run migrate:organizations -- --rollback
 */

import { Command } from 'commander';
import { OrganizationSector } from '@attendance-x/shared';
import { OrganizationMigration } from './organization-migration';
import { db } from '../config';
import { UserModel } from '../models/user.model';
import { OrganizationModel } from '../models/organization.model';

const program = new Command();

// Configuration du programme CLI
program
  .name('organization-migration')
  .description('Script de migration pour ajouter le contexte organisationnel aux utilisateurs existants')
  .version('1.0.0');

// Commande de migration
program
  .command('run')
  .description('Exécuter la migration d\'organisation')
  .option('--dry-run', 'Simuler la migration sans l\'exécuter', false)
  .option('--batch-size <number>', 'Nombre d\'utilisateurs à traiter par batch', '100')
  .option('--default-name <string>', 'Nom par défaut pour les organisations', 'Mon Organisation')
  .option('--sector <sector>', 'Secteur par défaut', 'other')
  .action(async (options) => {
    try {
      console.log('🚀 Démarrage de la migration d\'organisation...');
      console.log('Options:', options);

      const migration = new OrganizationMigration();
      
      const stats = await migration.runMigration({
        dryRun: options.dryRun,
        batchSize: parseInt(options.batchSize),
        defaultOrganizationName: options.defaultName,
        defaultSector: options.sector as OrganizationSector
      });

      console.log('\n✅ Migration terminée avec succès !');
      console.log('\n📊 Statistiques:');
      console.log(`   • Utilisateurs total: ${stats.totalUsers}`);
      console.log(`   • Utilisateurs avec organisation: ${stats.usersWithOrganization}`);
      console.log(`   • Utilisateurs sans organisation: ${stats.usersWithoutOrganization}`);
      console.log(`   • Organisations créées: ${stats.organizationsCreated}`);
      console.log(`   • Utilisateurs migrés: ${stats.usersMigrated}`);
      console.log(`   • Erreurs: ${stats.errors.length}`);

      if (stats.errors.length > 0) {
        console.log('\n❌ Erreurs rencontrées:');
        stats.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. Utilisateur ${error.userId}: ${error.error}`);
        });
      }

      if (options.dryRun) {
        console.log('\n💡 Ceci était une simulation. Utilisez --no-dry-run pour exécuter réellement la migration.');
      }

    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error);
      process.exit(1);
    }
  });

// Commande de rollback
program
  .command('rollback')
  .description('Annuler la migration d\'organisation')
  .action(async () => {
    try {
      console.log('🔄 Démarrage du rollback de la migration...');

      const migration = new OrganizationMigration();
      await migration.rollbackMigration();

      console.log('✅ Rollback terminé avec succès !');

    } catch (error) {
      console.error('❌ Erreur lors du rollback:', error);
      process.exit(1);
    }
  });

// Commande de statut
program
  .command('status')
  .description('Afficher le statut de la migration')
  .action(async () => {
    try {
      console.log('📊 Vérification du statut de la migration...');

      // Importer les dépendances nécessaires
      
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

      // Analyser les organisations
      for (const orgDoc of organizationsSnapshot.docs) {
        const orgData = orgDoc.data();
        if (orgData.description === 'Organisation créée automatiquement lors de la migration') {
          migrationOrganizations++;
        }
      }

      const migrationNeeded = usersWithoutOrganization > 0;
      const migrationCompleted = usersWithoutOrganization === 0 && usersSnapshot.size > 0;
      const progress = usersSnapshot.size > 0 ? (usersWithOrganization / usersSnapshot.size) * 100 : 0;

      console.log('\n📈 Statut de la migration:');
      console.log(`   • Utilisateurs total: ${usersSnapshot.size}`);
      console.log(`   • Organisations total: ${organizationsSnapshot.size}`);
      console.log(`   • Utilisateurs avec organisation: ${usersWithOrganization}`);
      console.log(`   • Utilisateurs sans organisation: ${usersWithoutOrganization}`);
      console.log(`   • Organisations de migration: ${migrationOrganizations}`);
      console.log(`   • Migration nécessaire: ${migrationNeeded ? 'Oui' : 'Non'}`);
      console.log(`   • Migration terminée: ${migrationCompleted ? 'Oui' : 'Non'}`);
      console.log(`   • Progression: ${progress.toFixed(1)}%`);

      if (migrationNeeded) {
        console.log('\n💡 La migration est nécessaire. Utilisez "run" pour l\'exécuter.');
      } else {
        console.log('\n✅ Tous les utilisateurs ont une organisation assignée.');
      }

    } catch (error) {
      console.error('❌ Erreur lors de la vérification du statut:', error);
      process.exit(1);
    }
  });

// Commande de validation
program
  .command('validate')
  .description('Valider l\'intégrité des données après migration')
  .action(async () => {
    try {
      console.log('🔍 Validation de l\'intégrité des données...');

      let validUsers = 0;
      let invalidUsers = 0;
      let validOrganizations = 0;
      let invalidOrganizations = 0;
      let orphanedUsers = 0;
      let orphanedOrganizations = 0;

      // Valider les utilisateurs
      const usersSnapshot = await db.collection('users').get();
      console.log(`Validation de ${usersSnapshot.size} utilisateurs...`);

      for (const userDoc of usersSnapshot.docs) {
        try {
          const user = UserModel.fromFirestore(userDoc);
          if (user) {
            await user.validate();
            validUsers++;
          } else {
            invalidUsers++;
          }
        } catch (error) {
          invalidUsers++;
          console.log(`   ❌ Utilisateur ${userDoc.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Valider les organisations
      const organizationsSnapshot = await db.collection('organizations').get();
      console.log(`Validation de ${organizationsSnapshot.size} organisations...`);

      for (const orgDoc of organizationsSnapshot.docs) {
        try {
          const organization = OrganizationModel.fromFirestore(orgDoc);
          if (organization) {
            await organization.validate();
            validOrganizations++;
          } else {
            invalidOrganizations++;
          }
        } catch (error) {
          invalidOrganizations++;
          console.log(`   ❌ Organisation ${orgDoc.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Vérifier l'intégrité des données
      const organizationIds = new Set(organizationsSnapshot.docs.map(doc => doc.id));
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userData.organizationId && !organizationIds.has(userData.organizationId)) {
          orphanedUsers++;
          console.log(`   ⚠️  Utilisateur orphelin: ${userDoc.id} (organisation ${userData.organizationId} introuvable)`);
        }
      }

      const usersByOrganization = new Map<string, number>();
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userData.organizationId) {
          const count = usersByOrganization.get(userData.organizationId) || 0;
          usersByOrganization.set(userData.organizationId, count + 1);
        }
      }

      for (const orgDoc of organizationsSnapshot.docs) {
        const actualMemberCount = usersByOrganization.get(orgDoc.id) || 0;
        if (actualMemberCount === 0) {
          orphanedOrganizations++;
          console.log(`   ⚠️  Organisation orpheline: ${orgDoc.id} (aucun membre)`);
        }
      }

      console.log('\n📋 Résultats de la validation:');
      console.log(`   • Utilisateurs valides: ${validUsers}/${usersSnapshot.size}`);
      console.log(`   • Utilisateurs invalides: ${invalidUsers}`);
      console.log(`   • Organisations valides: ${validOrganizations}/${organizationsSnapshot.size}`);
      console.log(`   • Organisations invalides: ${invalidOrganizations}`);
      console.log(`   • Utilisateurs orphelins: ${orphanedUsers}`);
      console.log(`   • Organisations orphelines: ${orphanedOrganizations}`);

      const isValid = invalidUsers === 0 && invalidOrganizations === 0 && orphanedUsers === 0 && orphanedOrganizations === 0;
      
      if (isValid) {
        console.log('\n✅ Toutes les données sont valides !');
      } else {
        console.log('\n❌ Des problèmes d\'intégrité ont été détectés.');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Erreur lors de la validation:', error);
      process.exit(1);
    }
  });

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Exécuter le programme
program.parse(process.argv);

// Si aucune commande n'est fournie, afficher l'aide
if (!process.argv.slice(2).length) {
  program.outputHelp();
}