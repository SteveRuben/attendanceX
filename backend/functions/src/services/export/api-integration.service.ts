/**
 * Service d'intégration API pour les systèmes externes
 */

import { firestore } from 'firebase-admin';
import { ValidationError } from '../../models/base.model';

// Types pour les intégrations API
export interface ApiIntegration {
  id?: string;
  tenantId: string;

  // Configuration
  name: string;
  description: string;
  systemType: 'erp' | 'crm' | 'payroll' | 'accounting' | 'hr' | 'project_management' | 'custom';
  provider: string; // SAP, Salesforce, Workday, etc.

  // Connexion
  endpoint: string;
  authentication: {
    type: 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'custom';
    credentials: Record<string, any>;
    refreshToken?: string;
    expiresAt?: Date;
  };

  // Configuration de synchronisation
  syncConfig: {
    enabled: boolean;
    direction: 'export' | 'import' | 'bidirectional';
    frequency: 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly';
    schedule?: string; // Cron expression
    dataTypes: string[]; // timesheet, employees, projects, etc.
    filters?: Record<string, any>;
  };

  // Mapping des données
  fieldMapping: FieldMapping[];

  // Statut
  status: 'active' | 'inactive' | 'error' | 'testing';
  lastSync?: Date;
  lastError?: string;

  // Métadonnées
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string; // JavaScript function as string
  required: boolean;
  defaultValue?: any;
}

export interface SyncJob {
  id?: string;
  tenantId: string;

  // Configuration
  integrationId: string;
  jobType: 'manual' | 'scheduled' | 'triggered';
  direction: 'export' | 'import';
  dataType: string;

  // Paramètres
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };

  // Statut
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100

  // Résultats
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;

  // Détails
  errors: SyncError[];
  warnings: SyncWarning[];

  // Retry
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;

  // Métadonnées
  startedBy?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // en millisecondes

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncError {
  recordId?: string;
  field?: string;
  errorCode: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface SyncWarning {
  recordId?: string;
  field?: string;
  warningCode: string;
  message: string;
  timestamp: Date;
}

export class ApiIntegrationService {
  private db: firestore.Firestore;
  private integrationsCollection: string = 'api_integrations';
  private syncJobsCollection: string = 'sync_jobs';

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  // ==================== Gestion des intégrations ====================

  /**
   * Créer une nouvelle intégration API
   */
  async createIntegration(
    tenantId: string,
    config: Omit<ApiIntegration, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<ApiIntegration> {
    try {
      // Valider la configuration
      await this.validateIntegrationConfig(config);

      const integration: ApiIntegration = {
        ...config,
        tenantId,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.db.collection(this.integrationsCollection).add(integration);

      return {
        ...integration,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to create integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Tester une connexion d'intégration
   */
  async testIntegration(tenantId: string, integrationId: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
    details?: any;
  }> {
    try {
      const integration = await this.getIntegration(tenantId, integrationId);

      if (!integration) {
        throw new ValidationError('Integration not found');
      }

      const startTime = Date.now();

      try {
        // Effectuer un appel de test
        const testResult = await this.performTestCall(integration);
        const responseTime = Date.now() - startTime;

        // Mettre à jour le statut
        await this.updateIntegrationStatus(integrationId, 'active');

        return {
          success: true,
          responseTime,
          details: testResult
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;

        // Mettre à jour le statut d'erreur
        await this.updateIntegrationStatus(integrationId, 'error', error instanceof Error ? error.message : 'Unknown error');

        return {
          success: false,
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } catch (error) {
      throw new Error(`Failed to test integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Synchronisation ====================

  /**
   * Démarrer une synchronisation manuelle
   */
  async startManualSync(
    tenantId: string,
    integrationId: string,
    direction: 'export' | 'import',
    dataType: string,
    startedBy: string,
    options: {
      filters?: Record<string, any>;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<SyncJob> {
    try {
      const integration = await this.getIntegration(tenantId, integrationId);

      if (!integration) {
        throw new ValidationError('Integration not found');
      }

      if (integration.status !== 'active') {
        throw new ValidationError('Integration is not active');
      }

      // Créer le job de synchronisation
      const syncJob: SyncJob = {
        tenantId,
        integrationId,
        jobType: 'manual',
        direction,
        dataType,
        filters: options.filters,
        dateRange: options.dateRange,
        status: 'pending',
        progress: 0,
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
        errors: [],
        warnings: [],
        retryCount: 0,
        maxRetries: 3,
        startedBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.db.collection(this.syncJobsCollection).add(syncJob);
      const createdJob = {
        ...syncJob,
        id: docRef.id
      };

      // Démarrer le traitement asynchrone
      this.processSyncJobAsync(createdJob, integration);

      return createdJob;
    } catch (error) {
      throw new Error(`Failed to start manual sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Traiter un job de synchronisation de manière asynchrone
   */
  private async processSyncJobAsync(job: SyncJob, integration: ApiIntegration): Promise<void> {
    try {
      // Mettre à jour le statut
      await this.updateSyncJobStatus(job.id!, 'running', 0);

      // Obtenir les données à synchroniser
      const data = await this.fetchSyncData(job, integration);
      await this.updateSyncJobStatus(job.id!, 'running', 30);

      // Transformer les données selon le mapping
      const transformedData = await this.transformData(data, integration.fieldMapping);
      await this.updateSyncJobStatus(job.id!, 'running', 60);

      // Envoyer les données vers le système externe
      const result = await this.sendDataToExternalSystem(transformedData, job, integration);
      await this.updateSyncJobStatus(job.id!, 'running', 90);

      // Finaliser le job
      await this.finalizeSyncJob(job.id!, result);
      await this.updateSyncJobStatus(job.id!, 'completed', 100);

      // Mettre à jour la date de dernière synchronisation
      await this.updateLastSyncDate(integration.id!);

    } catch (error) {
      await this.handleSyncJobError(job, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Gérer les erreurs de synchronisation avec retry
   */
  private async handleSyncJobError(job: SyncJob, errorMessage: string): Promise<void> {
    try {
      const updatedJob = await this.getSyncJob(job.tenantId, job.id!);

      if (!updatedJob) {
        return;
      }

      updatedJob.retryCount++;
      updatedJob.errors.push({
        errorCode: 'SYNC_ERROR',
        message: errorMessage,
        timestamp: new Date()
      });

      if (updatedJob.retryCount < updatedJob.maxRetries) {
        // Programmer un retry avec backoff exponentiel
        const retryDelay = Math.pow(2, updatedJob.retryCount) * 60 * 1000; // Minutes
        updatedJob.nextRetryAt = new Date(Date.now() + retryDelay);
        updatedJob.status = 'pending';

        await this.updateSyncJob(updatedJob);

        // Programmer le retry (TODO: utiliser un système de queue)
        setTimeout(() => {
          this.retrySyncJob(updatedJob);
        }, retryDelay);
      } else {
        // Échec définitif
        updatedJob.status = 'failed';
        updatedJob.completedAt = new Date();
        await this.updateSyncJob(updatedJob);
      }
    } catch (error) {
      console.error('Failed to handle sync job error:', error);
    }
  }

  /**
   * Retry d'un job de synchronisation
   */
  private async retrySyncJob(job: SyncJob): Promise<void> {
    try {
      const integration = await this.getIntegration(job.tenantId, job.integrationId);

      if (integration) {
        await this.processSyncJobAsync(job, integration);
      }
    } catch (error) {
      await this.handleSyncJobError(job, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ==================== Authentification ====================

  /**
   * Authentifier avec un système externe
   */
  private async authenticateWithSystem(integration: ApiIntegration): Promise<string> {
    try {
      switch (integration.authentication.type) {
        case 'api_key':
          return integration.authentication.credentials.apiKey;

        case 'bearer':
          return integration.authentication.credentials.token;

        case 'oauth2':
          return await this.refreshOAuth2Token(integration);

        case 'basic':
          const { username, password } = integration.authentication.credentials;
          return Buffer.from(`${username}:${password}`).toString('base64');

        default:
          throw new ValidationError(`Unsupported authentication type: ${integration.authentication.type}`);
      }
    } catch (error) {
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rafraîchir un token OAuth2
   */
  private async refreshOAuth2Token(integration: ApiIntegration): Promise<string> {
    try {
      const { clientId, clientSecret, refreshToken } = integration.authentication.credentials;

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Construire l'URL de refresh (standard OAuth2)
      const tokenEndpoint = integration.authentication.credentials.tokenEndpoint ||
        `${integration.endpoint}/oauth/token`;

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`OAuth2 refresh failed: HTTP ${response.status}`);
      }

      const tokenData = await response.json();

      if (!tokenData.access_token) {
        throw new Error('No access token in refresh response');
      }

      // Mettre à jour les credentials dans l'intégration
      const updatedCredentials = {
        ...integration.authentication.credentials,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Garder l'ancien si pas de nouveau
      };

      // Calculer la date d'expiration
      let expiresAt: Date | undefined;
      if (tokenData.expires_in) {
        expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
      }

      // Mettre à jour en base de données
      if (integration.id) {
        await this.db.collection(this.integrationsCollection).doc(integration.id).update({
          'authentication.credentials': updatedCredentials,
          'authentication.expiresAt': expiresAt,
          updatedAt: new Date()
        });
      }

      return tokenData.access_token;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('OAuth2 refresh timed out');
        }
        if (error.message.includes('fetch')) {
          throw new Error(`Network error during OAuth2 refresh: ${error.message}`);
        }
      }
      throw new Error(`Failed to refresh OAuth2 token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Transformation des données ====================

  /**
   * Transformer les données selon le mapping de champs
   */
  private async transformData(data: any[], fieldMapping: FieldMapping[]): Promise<any[]> {
    try {
      return data.map(record => {
        const transformed: any = {};

        fieldMapping.forEach(mapping => {
          let value = record[mapping.sourceField];

          // Appliquer la transformation si définie
          if (mapping.transformation && value !== undefined) {
            try {
              // Use a safer transformation approach instead of Function constructor
              // For now, we'll disable dynamic transformations for security
              console.warn(`Dynamic transformations are disabled for security. Field: ${mapping.sourceField}`);
              // value = transformFunction(value);
            } catch (error) {
              console.warn(`Transformation failed for field ${mapping.sourceField}:`, error);
            }
          }

          // Utiliser la valeur par défaut si nécessaire
          if (value === undefined && mapping.defaultValue !== undefined) {
            value = mapping.defaultValue;
          }

          // Vérifier les champs requis
          if (mapping.required && (value === undefined || value === null)) {
            throw new ValidationError(`Required field ${mapping.targetField} is missing`);
          }

          transformed[mapping.targetField] = value;
        });

        return transformed;
      });
    } catch (error) {
      throw new Error(`Data transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Communication avec systèmes externes ====================

  /**
   * Effectuer un appel de test vers le système externe
   */
  private async performTestCall(integration: ApiIntegration): Promise<any> {
    try {
      const authToken = await this.authenticateWithSystem(integration);

      // Construire les headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'TimeTracker-Integration/1.0'
      };

      switch (integration.authentication.type) {
        case 'api_key':
          headers['X-API-Key'] = authToken;
          break;
        case 'bearer':
          headers['Authorization'] = `Bearer ${authToken}`;
          break;
        case 'basic':
          headers['Authorization'] = `Basic ${authToken}`;
          break;
      }

      // Effectuer l'appel de test (généralement un GET vers un endpoint de santé)
      const testEndpoint = `${integration.endpoint}/health` || `${integration.endpoint}/status` || integration.endpoint;

      // Utiliser fetch pour l'appel HTTP
      const response = await fetch(testEndpoint, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000) // Timeout de 10 secondes
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Essayer de parser la réponse JSON, sinon retourner un objet par défaut
      let responseData;
      try {
        responseData = await response.json();
      } catch {
        // Si ce n'est pas du JSON, créer une réponse par défaut
        responseData = {
          status: 'ok',
          httpStatus: response.status,
          statusText: response.statusText
        };
      }

      return {
        ...responseData,
        timestamp: new Date().toISOString(),
        endpoint: testEndpoint,
        responseHeaders: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Test call timed out after 10 seconds');
        }
        if (error.message.includes('fetch')) {
          throw new Error(`Network error: ${error.message}`);
        }
      }
      throw new Error(`Test call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Envoyer des données vers le système externe
   */
  private async sendDataToExternalSystem(
    data: any[],
    job: SyncJob,
    integration: ApiIntegration
  ): Promise<{
    successful: number;
    failed: number;
    errors: SyncError[];
  }> {
    try {
      const authToken = await this.authenticateWithSystem(integration);
      const result = {
        successful: 0,
        failed: 0,
        errors: [] as SyncError[]
      };

      // Construire les headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'TimeTracker-Integration/1.0'
      };

      switch (integration.authentication.type) {
        case 'api_key':
          headers['X-API-Key'] = authToken;
          break;
        case 'bearer':
          headers['Authorization'] = `Bearer ${authToken}`;
          break;
        case 'basic':
          headers['Authorization'] = `Basic ${authToken}`;
          break;
      }

      // Déterminer l'endpoint selon le type de données
      const endpoint = this.getDataEndpoint(integration.endpoint, job.dataType, job.direction);

      // Envoyer les données par batch pour éviter les timeouts
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        try {
          // Effectuer l'appel HTTP réel
          const response = await fetch(endpoint, {
            method: job.direction === 'export' ? 'POST' : 'GET',
            headers,
            body: job.direction === 'export' ? JSON.stringify({
              data: batch,
              metadata: {
                batchNumber: Math.floor(i / batchSize) + 1,
                totalBatches: Math.ceil(data.length / batchSize),
                jobId: job.id,
                timestamp: new Date().toISOString()
              }
            }) : undefined,
            signal: AbortSignal.timeout(30000) // Timeout de 30 secondes pour les gros batches
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          // Parser la réponse
          let responseData;
          try {
            responseData = await response.json();
          } catch {
            responseData = { success: true };
          }

          // Vérifier si la réponse indique des erreurs partielles
          if (responseData.errors && Array.isArray(responseData.errors)) {
            result.failed += responseData.errors.length;
            result.successful += batch.length - responseData.errors.length;

            // Ajouter les erreurs détaillées
            responseData.errors.forEach((error: any, index: number) => {
              result.errors.push({
                recordId: batch[index]?.id || `batch_${i}_record_${index}`,
                errorCode: error.code || 'RECORD_ERROR',
                message: error.message || 'Unknown record error',
                details: error.details,
                timestamp: new Date()
              });
            });
          } else {
            result.successful += batch.length;
          }

          // Mettre à jour le progrès
          const progress = Math.min(90, 60 + ((i + batch.length) / data.length) * 30);
          await this.updateSyncJobStatus(job.id!, 'running', progress);

        } catch (error) {
          result.failed += batch.length;

          let errorMessage = 'Unknown error';
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              errorMessage = 'Request timed out after 30 seconds';
            } else if (error.message.includes('fetch')) {
              errorMessage = `Network error: ${error.message}`;
            } else {
              errorMessage = error.message;
            }
          }

          result.errors.push({
            errorCode: 'BATCH_ERROR',
            message: errorMessage,
            details: {
              batchStart: i,
              batchSize: batch.length,
              endpoint,
              httpMethod: job.direction === 'export' ? 'POST' : 'GET'
            },
            timestamp: new Date()
          });

          // Log l'erreur pour debugging
          console.error(`Batch sync error for job ${job.id}:`, {
            batchStart: i,
            batchSize: batch.length,
            error: errorMessage
          });
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to send data to external system: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Méthodes utilitaires ====================

  private async validateIntegrationConfig(config: any): Promise<void> {
    // Valider l'endpoint
    if (!config.endpoint || !this.isValidUrl(config.endpoint)) {
      throw new ValidationError('Invalid endpoint URL');
    }

    // Valider l'authentification
    if (!config.authentication || !config.authentication.type) {
      throw new ValidationError('Authentication configuration is required');
    }

    // Valider les credentials selon le type
    switch (config.authentication.type) {
      case 'api_key':
        if (!config.authentication.credentials?.apiKey) {
          throw new ValidationError('API key is required');
        }
        break;
      case 'oauth2':
        if (!config.authentication.credentials?.clientId || !config.authentication.credentials?.clientSecret) {
          throw new ValidationError('OAuth2 client credentials are required');
        }
        break;
      case 'basic':
        if (!config.authentication.credentials?.username || !config.authentication.credentials?.password) {
          throw new ValidationError('Basic auth credentials are required');
        }
        break;
    }

    // Valider le mapping des champs
    if (!config.fieldMapping || !Array.isArray(config.fieldMapping)) {
      throw new ValidationError('Field mapping is required');
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Construire l'endpoint pour un type de données spécifique
   */
  private getDataEndpoint(baseEndpoint: string, dataType: string, direction: 'export' | 'import'): string {
    // Supprimer le slash final s'il existe
    const cleanBase = baseEndpoint.replace(/\/$/, '');

    // Mapping des types de données vers les endpoints
    const endpointMap: Record<string, { export: string; import: string }> = {
      timesheet: {
        export: '/api/v1/timesheets',
        import: '/api/v1/timesheets/import'
      },
      employees: {
        export: '/api/v1/employees',
        import: '/api/v1/employees/import'
      },
      projects: {
        export: '/api/v1/projects',
        import: '/api/v1/projects/import'
      },
      activities: {
        export: '/api/v1/activities',
        import: '/api/v1/activities/import'
      }
    };

    const endpoints = endpointMap[dataType];
    if (!endpoints) {
      // Fallback générique
      return `${cleanBase}/api/v1/${dataType}${direction === 'import' ? '/import' : ''}`;
    }

    return `${cleanBase}${endpoints[direction]}`;
  }

  private async fetchSyncData(job: SyncJob, integration: ApiIntegration): Promise<any[]> {
    try {
      // TODO: Intégrer avec les services appropriés selon le type de données
      switch (job.dataType) {
        case 'timesheet':
          return this.fetchTimesheetData(job);
        case 'employees':
          return this.fetchEmployeeData(job);
        case 'projects':
          return this.fetchProjectData(job);
        default:
          throw new ValidationError(`Unsupported data type: ${job.dataType}`);
      }
    } catch (error) {
      throw new Error(`Failed to fetch sync data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchTimesheetData(job: SyncJob): Promise<any[]> {
    // TODO: Intégrer avec TimesheetService
    return [];
  }

  private async fetchEmployeeData(job: SyncJob): Promise<any[]> {
    // TODO: Intégrer avec EmployeeService
    return [];
  }

  private async fetchProjectData(job: SyncJob): Promise<any[]> {
    // TODO: Intégrer avec ProjectService
    return [];
  }

  // ==================== Méthodes de base de données ====================

  private async getIntegration(tenantId: string, integrationId: string): Promise<ApiIntegration | null> {
    try {
      const doc = await this.db.collection(this.integrationsCollection).doc(integrationId).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (!data || data.tenantId !== tenantId) {
        return null;
      }

      return {
        id: doc.id,
        ...data
      } as ApiIntegration;
    } catch (error) {
      return null;
    }
  }

  private async getSyncJob(tenantId: string, jobId: string): Promise<SyncJob | null> {
    try {
      const doc = await this.db.collection(this.syncJobsCollection).doc(jobId).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (!data || data.tenantId !== tenantId) {
        return null;
      }

      return {
        id: doc.id,
        ...data
      } as SyncJob;
    } catch (error) {
      return null;
    }
  }

  private async updateIntegrationStatus(
    integrationId: string,
    status: ApiIntegration['status'],
    error?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (error) {
        updateData.lastError = error;
      }

      await this.db.collection(this.integrationsCollection).doc(integrationId).update(updateData);
    } catch (error) {
      console.error('Failed to update integration status:', error);
    }
  }

  private async updateSyncJobStatus(
    jobId: string,
    status: SyncJob['status'],
    progress: number
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        progress,
        updatedAt: new Date()
      };

      if (status === 'running' && progress === 0) {
        updateData.startedAt = new Date();
      }

      if (status === 'completed' || status === 'failed') {
        updateData.completedAt = new Date();
      }

      await this.db.collection(this.syncJobsCollection).doc(jobId).update(updateData);
    } catch (error) {
      console.error('Failed to update sync job status:', error);
    }
  }

  private async updateSyncJob(job: SyncJob): Promise<void> {
    try {
      if (!job.id) {
        throw new ValidationError('Job ID is required for update');
      }

      await this.db.collection(this.syncJobsCollection).doc(job.id).update({
        ...job,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to update sync job:', error);
    }
  }

  private async finalizeSyncJob(jobId: string, result: any): Promise<void> {
    try {
      await this.db.collection(this.syncJobsCollection).doc(jobId).update({
        recordsSuccessful: result.successful,
        recordsFailed: result.failed,
        errors: result.errors,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to finalize sync job:', error);
    }
  }

  private async updateLastSyncDate(integrationId: string): Promise<void> {
    try {
      await this.db.collection(this.integrationsCollection).doc(integrationId).update({
        lastSync: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to update last sync date:', error);
    }
  }

  // ==================== Méthodes publiques ====================

  /**
   * Lister les intégrations d'un tenant
   */
  async listIntegrations(tenantId: string): Promise<ApiIntegration[]> {
    try {
      const query = await this.db.collection(this.integrationsCollection)
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ApiIntegration));
    } catch (error) {
      throw new Error(`Failed to list integrations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lister les jobs de synchronisation
   */
  async listSyncJobs(
    tenantId: string,
    options: {
      integrationId?: string;
      status?: SyncJob['status'];
      limit?: number;
    } = {}
  ): Promise<SyncJob[]> {
    try {
      let query = this.db.collection(this.syncJobsCollection)
        .where('tenantId', '==', tenantId);

      if (options.integrationId) {
        query = query.where('integrationId', '==', options.integrationId);
      }

      if (options.status) {
        query = query.where('status', '==', options.status);
      }

      const result = await query
        .orderBy('createdAt', 'desc')
        .limit(options.limit || 50)
        .get();

      return result.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SyncJob));
    } catch (error) {
      throw new Error(`Failed to list sync jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques de synchronisation
   */
  async getSyncStatistics(
    tenantId: string,
    integrationId?: string,
    period?: { start: Date; end: Date }
  ): Promise<{
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    averageDuration: number;
    totalRecordsProcessed: number;
    successRate: number;
  }> {
    try {
      let query = this.db.collection(this.syncJobsCollection)
        .where('tenantId', '==', tenantId);

      if (integrationId) {
        query = query.where('integrationId', '==', integrationId);
      }

      if (period) {
        query = query.where('createdAt', '>=', period.start)
          .where('createdAt', '<=', period.end);
      }

      const result = await query.get();
      const jobs = result.docs.map(doc => doc.data() as SyncJob);

      const stats = {
        totalJobs: jobs.length,
        successfulJobs: jobs.filter(j => j.status === 'completed').length,
        failedJobs: jobs.filter(j => j.status === 'failed').length,
        averageDuration: 0,
        totalRecordsProcessed: jobs.reduce((sum, j) => sum + j.recordsProcessed, 0),
        successRate: 0
      };

      // Calculer la durée moyenne
      const completedJobs = jobs.filter(j => j.duration);
      if (completedJobs.length > 0) {
        const totalDuration = completedJobs.reduce((sum, j) => sum + (j.duration || 0), 0);
        stats.averageDuration = Math.round(totalDuration / completedJobs.length);
      }

      // Calculer le taux de succès
      if (stats.totalJobs > 0) {
        stats.successRate = Math.round((stats.successfulJobs / stats.totalJobs) * 100);
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to get sync statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}