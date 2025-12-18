/**
 * Index des services de déploiement
 */

// Services de déploiement
export { ProductionSetupService } from './production-setup.service';
export { DataMigrationService } from './data-migration.service';
export { TrainingDocumentationService } from './training-documentation.service';

// Types
export type {
  ProductionConfig,
  FirestoreIndex,
  IndexField,
  SecurityRule,
  MonitoringConfig,
  AlertConfig,
  PerformanceConfig,
  DeploymentStatus
} from './production-setup.service';

export type {
  MigrationJob,
  MigrationError,
  MigrationConfig,
  DataValidationResult
} from './data-migration.service';

export type {
  TrainingModule,
  TrainingContent,
  Assessment,
  Question,
  Resource,
  DocumentationSection,
  FAQItem,
  TroubleshootingGuide,
  Solution
} from './training-documentation.service';

/**
 * Factory pour créer les services de déploiement
 */
import { ProductionSetupService } from './production-setup.service';
import { DataMigrationService } from './data-migration.service';
import { TrainingDocumentationService } from './training-documentation.service';

export class DeploymentServiceFactory {

  /**
   * Crée une instance du service de configuration de production
   */
  createProductionSetupService(): ProductionSetupService {
    return new ProductionSetupService();
  }

  /**
   * Crée une instance du service de migration de données
   */
  createDataMigrationService(config?: any): DataMigrationService {
    return new DataMigrationService(config);
  }

  /**
   * Crée une instance du service de formation et documentation
   */
  createTrainingDocumentationService(): TrainingDocumentationService {
    return new TrainingDocumentationService();
  }

  /**
   * Crée tous les services de déploiement
   */
  createAllServices(config?: {
    migration?: any;
  }) {
    return {
      productionSetupService: this.createProductionSetupService(),
      dataMigrationService: this.createDataMigrationService(config?.migration),
      trainingDocumentationService: this.createTrainingDocumentationService()
    };
  }
}

/**
 * Orchestrateur de déploiement
 */
export class DeploymentOrchestrator {
  private services: ReturnType<DeploymentServiceFactory['createAllServices']>;

  constructor(config?: any) {
    const factory = new DeploymentServiceFactory();
    this.services = factory.createAllServices(config);
  }

  /**
   * Exécute le processus de déploiement complet
   */
  async executeFullDeployment(tenantId: string): Promise<{
    success: boolean;
    phases: Array<{ name: string; status: string; duration: number; errors?: string[] }>;
    summary: any;
  }> {
    const phases: Array<{ name: string; status: string; duration: number; errors?: string[] }> = [];
    let overallSuccess = true;

    // Phase 1: Configuration de production
    console.log('Starting production setup...');
    const setupStart = Date.now();
    try {
      await this.services.productionSetupService.configureFirestoreCollections();
      await this.services.productionSetupService.createProductionIndexes();
      await this.services.productionSetupService.configureSecurityAndPermissions();
      await this.services.productionSetupService.setupMonitoring();

      const validation = await this.services.productionSetupService.validateProductionSetup();
      if (!validation.isValid) {
        throw new Error(`Production setup validation failed: ${validation.issues.join(', ')}`);
      }

      phases.push({
        name: 'Production Setup',
        status: 'completed',
        duration: Date.now() - setupStart
      });
    } catch (error) {
      phases.push({
        name: 'Production Setup',
        status: 'failed',
        duration: Date.now() - setupStart,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      overallSuccess = false;
    }

    // Phase 2: Migration des données
    console.log('Starting data migration...');
    const migrationStart = Date.now();
    try {
      const presenceMigration = await this.services.dataMigrationService.migratePresenceDataToTimesheets(tenantId);
      if (presenceMigration.status === 'failed') {
        throw new Error(`Presence migration failed: ${presenceMigration.errors.map(e => e.error).join(', ')}`);
      }

      const historicalCreation = await this.services.dataMigrationService.createHistoricalTimesheets(
        tenantId,
        '2024-01-01',
        new Date().toISOString().split('T')[0]
      );
      if (historicalCreation.status === 'failed') {
        throw new Error(`Historical creation failed: ${historicalCreation.errors.map(e => e.error).join(', ')}`);
      }

      const validation = await this.services.dataMigrationService.validateMigratedData(tenantId);
      if (!validation.isValid) {
        throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
      }

      phases.push({
        name: 'Data Migration',
        status: 'completed',
        duration: Date.now() - migrationStart
      });
    } catch (error) {
      phases.push({
        name: 'Data Migration',
        status: 'failed',
        duration: Date.now() - migrationStart,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      overallSuccess = false;
    }

    // Phase 3: Formation et documentation
    console.log('Creating training and documentation...');
    const trainingStart = Date.now();
    try {
      await this.services.trainingDocumentationService.createUserGuides();
      await this.services.trainingDocumentationService.createAdminGuides();
      await this.services.trainingDocumentationService.createTrainingModules();
      await this.services.trainingDocumentationService.createFAQ();
      await this.services.trainingDocumentationService.createTroubleshootingGuides();

      phases.push({
        name: 'Training & Documentation',
        status: 'completed',
        duration: Date.now() - trainingStart
      });
    } catch (error) {
      phases.push({
        name: 'Training & Documentation',
        status: 'failed',
        duration: Date.now() - trainingStart,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      overallSuccess = false;
    }

    // Phase 4: Tests post-déploiement
    console.log('Running post-deployment tests...');
    const testingStart = Date.now();
    try {
      const testResults = await this.services.dataMigrationService.performPostMigrationTests(tenantId);

      if (testResults.failed > 0) {
        const failedTests = testResults.tests.filter(t => t.status === 'failed');
        throw new Error(`${testResults.failed} tests failed: ${failedTests.map(t => t.name).join(', ')}`);
      }

      phases.push({
        name: 'Post-Deployment Testing',
        status: 'completed',
        duration: Date.now() - testingStart
      });
    } catch (error) {
      phases.push({
        name: 'Post-Deployment Testing',
        status: 'failed',
        duration: Date.now() - testingStart,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      overallSuccess = false;
    }

    // Générer le résumé
    const summary = {
      totalPhases: phases.length,
      completedPhases: phases.filter(p => p.status === 'completed').length,
      failedPhases: phases.filter(p => p.status === 'failed').length,
      totalDuration: phases.reduce((sum, p) => sum + p.duration, 0),
      successRate: (phases.filter(p => p.status === 'completed').length / phases.length) * 100
    };

    return {
      success: overallSuccess,
      phases,
      summary
    };
  }

  /**
   * Exécute seulement la migration des données
   */
  async executeMigrationOnly(tenantId: string): Promise<{
    success: boolean;
    migrations: any[];
    validation: any;
  }> {
    const migrations = [];

    // Migration des données de présence
    const presenceMigration = await this.services.dataMigrationService.migratePresenceDataToTimesheets(tenantId);
    migrations.push(presenceMigration);

    // Création des feuilles historiques
    const historicalCreation = await this.services.dataMigrationService.createHistoricalTimesheets(
      tenantId,
      '2024-01-01',
      new Date().toISOString().split('T')[0]
    );
    migrations.push(historicalCreation);

    // Validation des données
    const validation = await this.services.dataMigrationService.validateMigratedData(tenantId);

    const success = migrations.every(m => m.status === 'completed') && validation.isValid;

    return {
      success,
      migrations,
      validation
    };
  }

  /**
   * Génère la documentation complète
   */
  async generateCompleteDocumentation(): Promise<{
    userGuides: any[];
    adminGuides: any[];
    trainingModules: any[];
    faq: any[];
    troubleshooting: any[];
  }> {
    const [userGuides, adminGuides, trainingModules, faq, troubleshooting] = await Promise.all([
      this.services.trainingDocumentationService.createUserGuides(),
      this.services.trainingDocumentationService.createAdminGuides(),
      this.services.trainingDocumentationService.createTrainingModules(),
      this.services.trainingDocumentationService.createFAQ(),
      this.services.trainingDocumentationService.createTroubleshootingGuides()
    ]);

    return {
      userGuides,
      adminGuides,
      trainingModules,
      faq,
      troubleshooting
    };
  }

  /**
   * Obtient le statut global du déploiement
   */
  getDeploymentStatus(): {
    productionSetup: any;
    migrations: any[];
    documentation: any;
  } {
    return {
      productionSetup: this.services.productionSetupService.generateDeploymentReport(),
      migrations: this.services.dataMigrationService.getMigrationStatus(),
      documentation: {
        status: 'available',
        lastUpdated: new Date()
      }
    };
  }
}

/**
 * Utilitaires de déploiement
 */
export class DeploymentUtils {
  /**
   * Valide la configuration de déploiement
   */
  static validateDeploymentConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.tenantId) {
      errors.push('Tenant ID is required');
    }

    if (!config.environment || !['development', 'staging', 'production'].includes(config.environment)) {
      errors.push('Valid environment is required (development, staging, production)');
    }

    if (config.environment === 'production') {
      if (!config.backupEnabled) {
        errors.push('Backup must be enabled for production environment');
      }

      if (!config.monitoringEnabled) {
        errors.push('Monitoring must be enabled for production environment');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Génère un plan de rollback
   */
  static generateRollbackPlan(deploymentPhases: any[]): {
    steps: Array<{ phase: string; action: string; priority: number }>;
    estimatedDuration: number;
  } {
    const steps = deploymentPhases
      .filter(phase => phase.status === 'completed')
      .reverse()
      .map((phase, index) => ({
        phase: phase.name,
        action: `Rollback ${phase.name}`,
        priority: index + 1
      }));

    const estimatedDuration = steps.length * 15; // 15 minutes par étape

    return {
      steps,
      estimatedDuration
    };
  }

  /**
   * Calcule les métriques de déploiement
   */
  static calculateDeploymentMetrics(phases: any[]): {
    totalDuration: number;
    averagePhaseDuration: number;
    successRate: number;
    criticalErrors: number;
  } {
    const totalDuration = phases.reduce((sum, phase) => sum + (phase.duration || 0), 0);
    const averagePhaseDuration = phases.length > 0 ? totalDuration / phases.length : 0;
    const successfulPhases = phases.filter(phase => phase.status === 'completed').length;
    const successRate = phases.length > 0 ? (successfulPhases / phases.length) * 100 : 0;
    const criticalErrors = phases.reduce((sum, phase) => {
      return sum + (phase.errors?.filter((error: string) => error.includes('critical')).length || 0);
    }, 0);

    return {
      totalDuration,
      averagePhaseDuration,
      successRate,
      criticalErrors
    };
  }
}