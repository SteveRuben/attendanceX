import { 
  IntegrationError, 
  IntegrationErrorCode, 
  IntegrationProvider, 
  IntegrationStatus,
  IntegrationUsageStats,
  SyncSettings,
  UpdateIntegrationSettingsRequest,
  UserIntegration} from  '../../shared';
import { collections } from '../../config';
import { logger } from 'firebase-functions';
import { BaseModel } from '../../models/base.model';
import { FieldValue } from 'firebase-admin/firestore';

export class IntegrationModel extends BaseModel<UserIntegration> {
  constructor(data: Partial<UserIntegration>, id?: string) {
    super(id ? { ...data, id } : data);
  }

  static getCollectionName(): string {
    return require('../config/database').collectionNames.USER_INTEGRATIONS;
  }

  async validate(): Promise<boolean> {
    const data = (this as any).getData();
    return !!(data.userId && data.organizationId && data.provider && data.status);
  }

  // Helper methods to access BaseModel methods with proper typing
  public getIntegrationData(): UserIntegration {
    return (this as any).getData();
  }

  public updateIntegration(updates: Partial<UserIntegration>): void {
    (this as any).update(updates);
  }

  public get integrationId(): string {
    return (this as any).id;
  }

  toFirestore(): any {
    const data = this.getData();
    return {
      userId: data.userId,
      organizationId: data.organizationId,
      provider: data.provider,
      status: data.status,
      connectedAt: data.connectedAt,
      lastSyncAt: data.lastSyncAt,
      lastErrorAt: data.lastErrorAt,
      permissions: data.permissions || [],
      syncSettings: data.syncSettings,
      metadata: data.metadata,
      errorMessage: data.errorMessage,
      retryCount: data.retryCount || 0,
      nextRetryAt: data.nextRetryAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  toAPI(): Partial<UserIntegration> {
    const data = this.getIntegrationData();
    return {
      id: this.integrationId,
      userId: data.userId,
      organizationId: data.organizationId,
      provider: data.provider,
      status: data.status,
      connectedAt: data.connectedAt,
      lastSyncAt: data.lastSyncAt,
      lastErrorAt: data.lastErrorAt,
      permissions: data.permissions,
      syncSettings: data.syncSettings,
      metadata: data.metadata,
      errorMessage: data.errorMessage,
      retryCount: data.retryCount,
      nextRetryAt: data.nextRetryAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  updateSyncSettings(settings: Partial<SyncSettings>): void {
    const currentSettings = this.getData().syncSettings;
    this.update({
      syncSettings: { ...currentSettings, ...settings },
      updatedAt: new Date()
    });
  }

  updateStatus(status: IntegrationStatus, errorMessage?: string): void {
    const updates: any = {
      status,
      updatedAt: new Date()
    };

    if (status === IntegrationStatus.ERROR && errorMessage) {
      updates.errorMessage = errorMessage;
      updates.lastErrorAt = new Date();
      updates.retryCount = (this.getData().retryCount || 0) + 1;
    } else if (status === IntegrationStatus.CONNECTED) {
      updates.errorMessage = FieldValue.delete();
      updates.lastErrorAt = FieldValue.delete();
      updates.retryCount = 0;
      updates.nextRetryAt = FieldValue.delete();
    }

    this.update(updates);
  }

  updateLastSync(): void {
    this.update({
      lastSyncAt: new Date(),
      updatedAt: new Date()
    });
  }

  scheduleRetry(retryAfter: number): void {
    const nextRetryAt = new Date(Date.now() + retryAfter * 1000);
    this.update({
      nextRetryAt,
      updatedAt: new Date()
    });
  }
}

export class IntegrationService {
  private static instance: IntegrationService;

  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  /**
   * Créer une nouvelle intégration utilisateur
   */
  async createIntegration(
    userId: string,
    organizationId: string,
    provider: IntegrationProvider,
    permissions: string[],
    syncSettings: SyncSettings,
    metadata: any
  ): Promise<IntegrationModel> {
    try {
      const integrationData: Partial<UserIntegration> = {
        userId,
        organizationId,
        provider,
        status: IntegrationStatus.CONNECTED,
        connectedAt: new Date(),
        permissions,
        syncSettings,
        metadata,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const integration = new IntegrationModel(integrationData);
      await this.saveIntegration(integration);

      logger.info('Integration created successfully', {
        userId,
        provider,
        integrationId: integration.id
      });

      return integration;

    } catch (error) {
      logger.error('Error creating integration', { error, userId, provider });
      throw error;
    }
  }

  /**
   * Obtenir toutes les intégrations d'un utilisateur
   */
  async getUserIntegrations(userId: string): Promise<IntegrationModel[]> {
    try {
      const query = await collections.user_integrations
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return query.docs.map(doc => new IntegrationModel(doc.data(), doc.id));

    } catch (error) {
      logger.error('Error getting user integrations', { error, userId });
      throw error;
    }
  }

  /**
   * Obtenir une intégration spécifique
   */
  async getIntegration(integrationId: string): Promise<IntegrationModel | null> {
    try {
      const doc = await collections.user_integrations.doc(integrationId).get();
      
      if (!doc.exists) {
        return null;
      }

      return new IntegrationModel(doc.data(), doc.id);

    } catch (error) {
      logger.error('Error getting integration', { error, integrationId });
      throw error;
    }
  }

  /**
   * Obtenir une intégration par utilisateur et provider
   */
  async getUserIntegrationByProvider(
    userId: string, 
    provider: IntegrationProvider
  ): Promise<IntegrationModel | null> {
    try {
      const query = await collections.user_integrations
        .where('userId', '==', userId)
        .where('provider', '==', provider)
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      return new IntegrationModel(doc.data(), doc.id);

    } catch (error) {
      logger.error('Error getting integration by provider', { error, userId, provider });
      throw error;
    }
  }

  /**
   * Mettre à jour les paramètres d'une intégration
   */
  async updateIntegrationSettings(
    integrationId: string,
    updates: UpdateIntegrationSettingsRequest
  ): Promise<IntegrationModel> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      if (updates.syncSettings) {
        integration.updateSyncSettings(updates.syncSettings);
      }

      if (updates.permissions) {
        integration.update({
          permissions: updates.permissions,
          updatedAt: new Date()
        });
      }

      await this.saveIntegration(integration);

      logger.info('Integration settings updated', {
        integrationId,
        updates
      });

      return integration;

    } catch (error) {
      logger.error('Error updating integration settings', { error, integrationId });
      throw error;
    }
  }

  /**
   * Supprimer une intégration
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Marquer comme déconnectée avant suppression
      integration.updateStatus(IntegrationStatus.DISCONNECTED);
      await this.saveIntegration(integration);

      // Supprimer les tokens associés
      await this.cleanupIntegrationData(integrationId);

      // Supprimer l'intégration
      await collections.user_integrations.doc(integrationId).delete();

      logger.info('Integration deleted successfully', {
        integrationId,
        userId: integration.getData().userId,
        provider: integration.getData().provider
      });

    } catch (error) {
      logger.error('Error deleting integration', { error, integrationId });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques d'utilisation des intégrations
   */
  async getIntegrationUsageStats(organizationId: string): Promise<IntegrationUsageStats> {
    try {
      const [integrationsQuery, syncHistoryQuery] = await Promise.all([
        collections.user_integrations
          .where('organizationId', '==', organizationId)
          .get(),
        collections.sync_history
          .where('organizationId', '==', organizationId)
          .orderBy('startedAt', 'desc')
          .limit(1000)
          .get()
      ]);

      const integrations = integrationsQuery.docs.map((doc: any) => doc.data());
      const syncHistory = syncHistoryQuery.docs.map((doc: any) => doc.data());

      const totalIntegrations = integrations.length;
      const activeIntegrations = integrations.filter(
        (i: any) => i.status === IntegrationStatus.CONNECTED
      ).length;

      const integrationsByProvider = integrations.reduce((acc: any, integration: any) => {
        acc[integration.provider] = (acc[integration.provider] || 0) + 1;
        return acc;
      }, {} as Record<IntegrationProvider, number>);

      const totalSyncs = syncHistory.length;
      const successfulSyncs = syncHistory.filter((s: any) => s.status === 'success').length;
      const failedSyncs = syncHistory.filter((s: any) => s.status === 'error').length;
      
      const completedSyncs = syncHistory.filter((s: any) => s.completedAt && s.startedAt);
      const averageSyncDuration = completedSyncs.length > 0
        ? completedSyncs.reduce((sum: any, sync: any) => {
            return sum + (sync.completedAt!.getTime() - sync.startedAt.getTime());
          }, 0) / completedSyncs.length
        : 0;

      const lastSyncAt = syncHistory.length > 0 ? syncHistory[0].startedAt : undefined;

      return {
        totalIntegrations,
        activeIntegrations,
        integrationsByProvider,
        syncStats: {
          totalSyncs,
          successfulSyncs,
          failedSyncs,
          averageSyncDuration
        },
        lastSyncAt
      };

    } catch (error) {
      logger.error('Error getting integration usage stats', { error, organizationId });
      throw error;
    }
  }

  /**
   * Obtenir les intégrations qui nécessitent une nouvelle tentative
   */
  async getIntegrationsForRetry(): Promise<IntegrationModel[]> {
    try {
      const now = new Date();
      const query = await collections.user_integrations
        .where('status', '==', IntegrationStatus.ERROR)
        .where('nextRetryAt', '<=', now)
        .get();

      return query.docs.map(doc => new IntegrationModel(doc.data(), doc.id));

    } catch (error) {
      logger.error('Error getting integrations for retry', { error });
      throw error;
    }
  }

  /**
   * Nettoyer les données d'une intégration supprimée
   */
  private async cleanupIntegrationData(integrationId: string): Promise<void> {
    try {
      // Supprimer les tokens
      const tokensQuery = await collections.oauth_tokens
        .where('integrationId', '==', integrationId)
        .get();

      const deletePromises = tokensQuery.docs.map((doc: any) => doc.ref.delete());

      // Supprimer l'historique de synchronisation
      const historyQuery = await collections.sync_history
        .where('integrationId', '==', integrationId)
        .get();

      deletePromises.push(...historyQuery.docs.map((doc: any) => doc.ref.delete()));

      await Promise.all(deletePromises);

      logger.info('Integration data cleaned up', { integrationId });

    } catch (error) {
      logger.error('Error cleaning up integration data', { error, integrationId });
      // Ne pas faire échouer la suppression si le nettoyage échoue
    }
  }

  /**
   * Sauvegarder une intégration
   */
  private async saveIntegration(integration: IntegrationModel): Promise<void> {
    await collections.user_integrations.doc(integration.id).set(integration.toFirestore());
  }

  /**
   * Créer une erreur d'intégration standardisée
   */
  createIntegrationError(
    code: IntegrationErrorCode,
    message: string,
    details?: Record<string, any>,
    retryable: boolean = true,
    retryAfter?: number
  ): IntegrationError {
    return {
      code,
      message,
      details,
      retryable,
      retryAfter
    };
  }
}

export const integrationService = IntegrationService.getInstance();