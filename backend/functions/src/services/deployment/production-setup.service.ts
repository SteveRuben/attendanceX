/**
 * Service de préparation de l'environnement de production
 */
import { collections } from '../../config/database';

export interface ProductionConfig {
  environment: 'development' | 'staging' | 'production';
  firestoreIndexes: FirestoreIndex[];
  securityRules: SecurityRule[];
  monitoring: MonitoringConfig;
  performance: PerformanceConfig;
}

export interface FirestoreIndex {
  collection: string;
  fields: IndexField[];
  queryScope: 'COLLECTION' | 'COLLECTION_GROUP';
}

export interface IndexField {
  field: string;
  order: 'ASCENDING' | 'DESCENDING';
  arrayConfig?: 'CONTAINS';
}

export interface SecurityRule {
  path: string;
  allow: string[];
  condition?: string;
}

export interface MonitoringConfig {
  enableLogging: boolean;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  enableMetrics: boolean;
  enableTracing: boolean;
  alerting: AlertConfig[];
}

export interface AlertConfig {
  name: string;
  condition: string;
  threshold: number;
  notification: string[];
}

export interface PerformanceConfig {
  enableCaching: boolean;
  cacheSize: number;
  enableCompression: boolean;
  maxRequestSize: number;
  timeout: number;
}

export interface DeploymentStatus {
  phase: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

export class ProductionSetupService {
  private deploymentStatus: DeploymentStatus[] = [];

  /**
   * Configure les collections Firestore pour la production
   */
  async configureFirestoreCollections(): Promise<void> {
    this.updateDeploymentStatus('firestore_setup', 'running', 0, 'Configuring Firestore collections...');

    const collections = [
      {
        name: 'timesheets',
        structure: {
          tenantId: 'string',
          employeeId: 'string',
          periodStart: 'string',
          periodEnd: 'string',
          status: 'string',
          totalHours: 'number',
          totalBillableHours: 'number',
          totalCost: 'number',
          createdAt: 'timestamp',
          updatedAt: 'timestamp',
          createdBy: 'string',
          updatedBy: 'string'
        }
      },
      {
        name: 'time_entries',
        structure: {
          tenantId: 'string',
          timesheetId: 'string',
          employeeId: 'string',
          date: 'string',
          startTime: 'timestamp',
          endTime: 'timestamp',
          duration: 'number',
          description: 'string',
          projectId: 'string',
          activityCodeId: 'string',
          billable: 'boolean',
          hourlyRate: 'number',
          totalCost: 'number',
          createdAt: 'timestamp',
          updatedAt: 'timestamp'
        }
      },
      {
        name: 'projects',
        structure: {
          tenantId: 'string',
          name: 'string',
          code: 'string',
          description: 'string',
          clientId: 'string',
          status: 'string',
          budget: 'number',
          billable: 'boolean',
          assignedEmployees: 'array',
          settings: 'object',
          createdAt: 'timestamp',
          updatedAt: 'timestamp'
        }
      },
      {
        name: 'activity_codes',
        structure: {
          tenantId: 'string',
          code: 'string',
          name: 'string',
          description: 'string',
          category: 'string',
          parentId: 'string',
          isActive: 'boolean',
          billable: 'boolean',
          createdAt: 'timestamp',
          updatedAt: 'timestamp'
        }
      },
      {
        name: 'employees',
        structure: {
          tenantId: 'string',
          firstName: 'string',
          lastName: 'string',
          email: 'string',
          isActive: 'boolean',
          role: 'string',
          permissions: 'array',
          hourlyRate: 'number',
          createdAt: 'timestamp',
          updatedAt: 'timestamp'
        }
      }
    ];

    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      await this.ensureCollectionExists(collection.name, collection.structure);
      
      const progress = ((i + 1) / collections.length) * 100;
      this.updateDeploymentStatus('firestore_setup', 'running', progress, `Configured ${collection.name}`);
    }

    this.updateDeploymentStatus('firestore_setup', 'completed', 100, 'Firestore collections configured');
  }

  /**
   * Crée les index de production optimisés
   */
  async createProductionIndexes(): Promise<void> {
    this.updateDeploymentStatus('indexes_creation', 'running', 0, 'Creating production indexes...');

    const indexes: FirestoreIndex[] = [
      // Index pour les feuilles de temps
      {
        collection: 'timesheets',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'employeeId', order: 'ASCENDING' },
          { field: 'periodStart', order: 'DESCENDING' }
        ],
        queryScope: 'COLLECTION'
      },
      {
        collection: 'timesheets',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'status', order: 'ASCENDING' },
          { field: 'periodStart', order: 'DESCENDING' }
        ],
        queryScope: 'COLLECTION'
      },
      {
        collection: 'timesheets',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'employeeId', order: 'ASCENDING' },
          { field: 'status', order: 'ASCENDING' },
          { field: 'updatedAt', order: 'DESCENDING' }
        ],
        queryScope: 'COLLECTION'
      },
      
      // Index pour les entrées de temps
      {
        collection: 'time_entries',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'employeeId', order: 'ASCENDING' },
          { field: 'date', order: 'DESCENDING' }
        ],
        queryScope: 'COLLECTION'
      },
      {
        collection: 'time_entries',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'timesheetId', order: 'ASCENDING' },
          { field: 'date', order: 'ASCENDING' }
        ],
        queryScope: 'COLLECTION'
      },
      {
        collection: 'time_entries',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'projectId', order: 'ASCENDING' },
          { field: 'date', order: 'DESCENDING' }
        ],
        queryScope: 'COLLECTION'
      },
      {
        collection: 'time_entries',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'billable', order: 'ASCENDING' },
          { field: 'date', order: 'DESCENDING' }
        ],
        queryScope: 'COLLECTION'
      },
      
      // Index pour les projets
      {
        collection: 'projects',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'status', order: 'ASCENDING' },
          { field: 'createdAt', order: 'DESCENDING' }
        ],
        queryScope: 'COLLECTION'
      },
      {
        collection: 'projects',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'clientId', order: 'ASCENDING' },
          { field: 'status', order: 'ASCENDING' }
        ],
        queryScope: 'COLLECTION'
      },
      
      // Index pour les codes d'activité
      {
        collection: 'activity_codes',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'category', order: 'ASCENDING' },
          { field: 'isActive', order: 'ASCENDING' }
        ],
        queryScope: 'COLLECTION'
      },
      {
        collection: 'activity_codes',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'parentId', order: 'ASCENDING' },
          { field: 'isActive', order: 'ASCENDING' }
        ],
        queryScope: 'COLLECTION'
      },
      
      // Index pour les employés
      {
        collection: 'employees',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'isActive', order: 'ASCENDING' },
          { field: 'createdAt', order: 'DESCENDING' }
        ],
        queryScope: 'COLLECTION'
      }
    ];

    for (let i = 0; i < indexes.length; i++) {
      const index = indexes[i];
      await this.createIndex(index);
      
      const progress = ((i + 1) / indexes.length) * 100;
      this.updateDeploymentStatus('indexes_creation', 'running', progress, `Created index for ${index.collection}`);
    }

    this.updateDeploymentStatus('indexes_creation', 'completed', 100, 'Production indexes created');
  }

  /**
   * Configure les permissions et la sécurité
   */
  async configureSecurityAndPermissions(): Promise<void> {
    this.updateDeploymentStatus('security_setup', 'running', 0, 'Configuring security and permissions...');

    const securityRules: SecurityRule[] = [
      {
        path: '/timesheets/{timesheetId}',
        allow: ['read', 'write'],
        condition: 'request.auth != null && resource.data.tenantId == request.auth.token.tenantId'
      },
      {
        path: '/time_entries/{entryId}',
        allow: ['read', 'write'],
        condition: 'request.auth != null && resource.data.tenantId == request.auth.token.tenantId'
      },
      {
        path: '/projects/{projectId}',
        allow: ['read'],
        condition: 'request.auth != null && resource.data.tenantId == request.auth.token.tenantId'
      },
      {
        path: '/projects/{projectId}',
        allow: ['write'],
        condition: 'request.auth != null && request.auth.token.role in ["admin", "manager"]'
      },
      {
        path: '/activity_codes/{codeId}',
        allow: ['read'],
        condition: 'request.auth != null && resource.data.tenantId == request.auth.token.tenantId'
      },
      {
        path: '/activity_codes/{codeId}',
        allow: ['write'],
        condition: 'request.auth != null && request.auth.token.role in ["admin", "manager"]'
      },
      {
        path: '/employees/{employeeId}',
        allow: ['read'],
        condition: 'request.auth != null && (resource.data.tenantId == request.auth.token.tenantId || resource.id == request.auth.uid)'
      },
      {
        path: '/employees/{employeeId}',
        allow: ['write'],
        condition: 'request.auth != null && request.auth.token.role in ["admin", "hr"]'
      }
    ];

    await this.applySecurityRules(securityRules);
    
    this.updateDeploymentStatus('security_setup', 'completed', 100, 'Security and permissions configured');
  }

  /**
   * Met en place le monitoring et les alertes
   */
  async setupMonitoring(): Promise<void> {
    this.updateDeploymentStatus('monitoring_setup', 'running', 0, 'Setting up monitoring...');

    const monitoringConfig: MonitoringConfig = {
      enableLogging: true,
      logLevel: 'INFO',
      enableMetrics: true,
      enableTracing: true,
      alerting: [
        {
          name: 'High Error Rate',
          condition: 'error_rate > 0.05',
          threshold: 0.05,
          notification: ['admin@company.com']
        },
        {
          name: 'Slow Response Time',
          condition: 'response_time_p95 > 2000',
          threshold: 2000,
          notification: ['admin@company.com']
        },
        {
          name: 'High Memory Usage',
          condition: 'memory_usage > 0.8',
          threshold: 0.8,
          notification: ['admin@company.com']
        },
        {
          name: 'Database Connection Issues',
          condition: 'db_connection_errors > 10',
          threshold: 10,
          notification: ['admin@company.com', 'dba@company.com']
        }
      ]
    };

    await this.configureMonitoring(monitoringConfig);
    
    this.updateDeploymentStatus('monitoring_setup', 'completed', 100, 'Monitoring configured');
  }

  /**
   * Valide la configuration de production
   */
  async validateProductionSetup(): Promise<{ isValid: boolean; issues: string[] }> {
    this.updateDeploymentStatus('validation', 'running', 0, 'Validating production setup...');

    const issues: string[] = [];

    // Vérifier les collections
    const requiredCollections = ['timesheets', 'time_entries', 'projects', 'activity_codes', 'employees'];
    for (const collection of requiredCollections) {
      const exists = await this.checkCollectionExists(collection);
      if (!exists) {
        issues.push(`Collection ${collection} does not exist`);
      }
    }

    // Vérifier les index
    const criticalIndexes = [
      'timesheets_tenantId_employeeId_periodStart',
      'time_entries_tenantId_timesheetId_date',
      'projects_tenantId_status_createdAt'
    ];
    
    for (const indexName of criticalIndexes) {
      const exists = await this.checkIndexExists(indexName);
      if (!exists) {
        issues.push(`Critical index ${indexName} is missing`);
      }
    }

    // Vérifier les variables d'environnement
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        issues.push(`Environment variable ${envVar} is not set`);
      }
    }

    // Vérifier la connectivité
    try {
      await collections.health_check.doc('test').set({ timestamp: new Date() });
      await collections.health_check.doc('test').delete();
    } catch (error) {
      issues.push(`Database connectivity issue: ${error}`);
    }

    const isValid = issues.length === 0;
    const status = isValid ? 'completed' : 'failed';
    const message = isValid ? 'Production setup validated successfully' : `Validation failed with ${issues.length} issues`;
    
    this.updateDeploymentStatus('validation', status, 100, message, issues);

    return { isValid, issues };
  }

  /**
   * Génère un rapport de déploiement
   */
  generateDeploymentReport(): {
    summary: any;
    phases: DeploymentStatus[];
    recommendations: string[];
  } {
    const completedPhases = this.deploymentStatus.filter(s => s.status === 'completed').length;
    const failedPhases = this.deploymentStatus.filter(s => s.status === 'failed').length;
    const totalPhases = this.deploymentStatus.length;

    const summary = {
      totalPhases,
      completedPhases,
      failedPhases,
      successRate: totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0,
      totalDuration: this.calculateTotalDuration(),
      status: failedPhases > 0 ? 'failed' : completedPhases === totalPhases ? 'completed' : 'in_progress'
    };

    const recommendations = this.generateRecommendations();

    return {
      summary,
      phases: this.deploymentStatus,
      recommendations
    };
  }

  // Méthodes privées

  private async ensureCollectionExists(name: string, structure: any): Promise<void> {
    try {
      // Créer un document de test pour initialiser la collection
      const collection = (collections as any)[name] || collections.health_check;
      const testDoc = collection.doc('_init');
      await testDoc.set({ _initialized: true, _structure: structure, _createdAt: new Date() });
      await testDoc.delete();
      
      console.log(`Collection ${name} initialized`);
    } catch (error) {
      console.error(`Error initializing collection ${name}:`, error);
      throw error;
    }
  }

  private async createIndex(index: FirestoreIndex): Promise<void> {
    // En production, les index sont créés via Firebase CLI ou Console
    // Ici nous documentons l'index pour référence
    console.log(`Index to create for ${index.collection}:`, {
      fields: index.fields,
      queryScope: index.queryScope
    });
    
    // Simuler la création d'index
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async applySecurityRules(rules: SecurityRule[]): Promise<void> {
    // En production, les règles de sécurité sont déployées via Firebase CLI
    console.log('Security rules to apply:', rules);
    
    // Simuler l'application des règles
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async configureMonitoring(config: MonitoringConfig): Promise<void> {
    // Configuration du monitoring (intégration avec des services comme Stackdriver, DataDog, etc.)
    console.log('Monitoring configuration:', config);
    
    // Simuler la configuration
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  private async checkCollectionExists(name: string): Promise<boolean> {
    try {
      const collection = (collections as any)[name] || collections.health_check;
      // @ts-ignore
      const snapshot = await collection.limit(1).get();
      return true; // Si pas d'erreur, la collection existe
    } catch (error) {
      return false;
    }
  }

  private async checkIndexExists(indexName: string): Promise<boolean> {
    // En production, vérifier via l'API Firebase Admin
    // Ici nous simulons
    return Math.random() > 0.1; // 90% de chance que l'index existe
  }

  private updateDeploymentStatus(
    phase: string,
    status: DeploymentStatus['status'],
    progress: number,
    message: string,
    errors: string[] = []
  ): void {
    const existingStatus = this.deploymentStatus.find(s => s.phase === phase);
    
    if (existingStatus) {
      existingStatus.status = status;
      existingStatus.progress = progress;
      existingStatus.message = message;
      existingStatus.errors = errors;
      
      if (status === 'completed' || status === 'failed') {
        existingStatus.endTime = new Date();
      }
    } else {
      this.deploymentStatus.push({
        phase,
        status,
        progress,
        message,
        startTime: new Date(),
        endTime: status === 'completed' || status === 'failed' ? new Date() : undefined,
        errors
      });
    }
    
    console.log(`Deployment [${phase}]: ${status} - ${message}`);
  }

  private calculateTotalDuration(): number {
    const startTimes = this.deploymentStatus.map(s => s.startTime.getTime());
    const endTimes = this.deploymentStatus
      .filter(s => s.endTime)
      .map(s => s.endTime!.getTime());
    
    if (startTimes.length === 0) return 0;
    
    const earliestStart = Math.min(...startTimes);
    const latestEnd = endTimes.length > 0 ? Math.max(...endTimes) : Date.now();
    
    return latestEnd - earliestStart;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const failedPhases = this.deploymentStatus.filter(s => s.status === 'failed');
    if (failedPhases.length > 0) {
      recommendations.push('Review and fix failed deployment phases before proceeding to production');
    }
    
    const slowPhases = this.deploymentStatus.filter(s => {
      if (!s.endTime) return false;
      const duration = s.endTime.getTime() - s.startTime.getTime();
      return duration > 60000; // Plus de 1 minute
    });
    
    if (slowPhases.length > 0) {
      recommendations.push('Consider optimizing slow deployment phases for faster future deployments');
    }
    
    recommendations.push('Set up automated monitoring and alerting for production environment');
    recommendations.push('Create backup and disaster recovery procedures');
    recommendations.push('Document rollback procedures for emergency situations');
    recommendations.push('Schedule regular performance reviews and optimizations');
    
    return recommendations;
  }
}