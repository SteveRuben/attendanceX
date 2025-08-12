import {
  SyncHistory,
  SyncType,
  SyncStatus,
  IntegrationProvider,
  UserIntegration,
  SyncedCalendarEvent,
  SyncedContact,
  IntegrationError,
  IntegrationErrorCode
} from '../../../../shared/src/types/integration.types';
import { collections } from '../config';
import { logger } from 'firebase-functions';
import { integrationService, IntegrationModel } from './integration.service';
import { tokenService } from './token.service';
import { BaseModel } from '../models/base.model';
import axios from 'axios';
import { oauthService } from './oauth.service';

export class SyncHistoryModel extends BaseModel<SyncHistory> {
  constructor(data: Partial<SyncHistory>, id?: string) {
    super(id ? { ...data, id } : data);
  }

  static getCollectionName(): string {
    return require('../config/database').collectionNames.SYNC_HISTORY;
  }

  async validate(): Promise<boolean> {
    const data = this.getData();
    return !!(data.integrationId && data.userId && data.syncType && data.status);
  }

  toFirestore(): any {
    const data = this.getData();
    return {
      integrationId: data.integrationId,
      userId: data.userId,
      syncType: data.syncType,
      status: data.status,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      itemsProcessed: data.itemsProcessed || 0,
      itemsCreated: data.itemsCreated || 0,
      itemsUpdated: data.itemsUpdated || 0,
      itemsDeleted: data.itemsDeleted || 0,
      errors: data.errors || [],
      duration: data.duration,
      dataSize: data.dataSize,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  toAPI(): Partial<SyncHistory> {
    const data = this.getData();
    return {
      id: this.id,
      integrationId: data.integrationId,
      userId: data.userId,
      syncType: data.syncType,
      status: data.status,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      itemsProcessed: data.itemsProcessed,
      itemsCreated: data.itemsCreated,
      itemsUpdated: data.itemsUpdated,
      itemsDeleted: data.itemsDeleted,
      errors: data.errors,
      duration: data.duration,
      dataSize: data.dataSize,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  markCompleted(stats: {
    itemsProcessed: number;
    itemsCreated: number;
    itemsUpdated: number;
    itemsDeleted: number;
    errors?: string[];
    dataSize?: number;
  }): void {
    const now = new Date();
    const startedAt = this.getData().startedAt;
    const duration = startedAt ? now.getTime() - startedAt.getTime() : 0;

    this.update({
      status: stats.errors && stats.errors.length > 0 ? SyncStatus.PARTIAL : SyncStatus.SUCCESS,
      completedAt: now,
      duration,
      itemsProcessed: stats.itemsProcessed,
      itemsCreated: stats.itemsCreated,
      itemsUpdated: stats.itemsUpdated,
      itemsDeleted: stats.itemsDeleted,
      errors: stats.errors || [],
      dataSize: stats.dataSize,
      updatedAt: now
    });
  }

  markFailed(error: string): void {
    const now = new Date();
    const startedAt = this.getData().startedAt;
    const duration = startedAt ? now.getTime() - startedAt.getTime() : 0;

    this.update({
      status: SyncStatus.ERROR,
      completedAt: now,
      duration,
      errors: [error],
      updatedAt: now
    });
  }
}

export class SyncService {
  private static instance: SyncService;

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Synchroniser toutes les données d'une intégration
   */
  async syncIntegration(integrationId: string, syncTypes?: SyncType[], force: boolean = false): Promise<SyncHistoryModel[]> {
    try {
      const integration = await integrationService.getIntegration(integrationId);
      if (!integration) {
        throw this.createSyncError(
          IntegrationErrorCode.OAUTH_ERROR,
          'Integration not found'
        );
      }

      const integrationData = integration.getData();
      const typesToSync = syncTypes || this.getEnabledSyncTypes(integrationData);

      logger.info('Starting integration sync', {
        integrationId,
        provider: integrationData.provider,
        syncTypes: typesToSync,
        force
      });

      const syncResults: SyncHistoryModel[] = [];

      for (const syncType of typesToSync) {
        try {
          const syncHistory = await this.syncData(integration, syncType, force);
          syncResults.push(syncHistory);
        } catch (error) {
          logger.error('Error syncing data type', {
            error,
            integrationId,
            syncType
          });

          // Créer un historique d'erreur
          const errorHistory = await this.createSyncHistory(
            integrationId,
            integrationData.userId,
            syncType,
            SyncStatus.ERROR
          );
          errorHistory.markFailed(error instanceof Error ? error.message : 'Unknown sync error');
          await this.saveSyncHistory(errorHistory);
          syncResults.push(errorHistory);
        }
      }

      // Mettre à jour la date de dernière synchronisation
      integration.updateLastSync();
      await this.saveIntegration(integration);

      return syncResults;

    } catch (error) {
      logger.error('Error syncing integration', { error, integrationId });
      throw error;
    }
  }

  /**
   * Synchroniser un type de données spécifique
   */
  private async syncData(integration: IntegrationModel, syncType: SyncType, force: boolean): Promise<SyncHistoryModel> {
    const integrationData = integration.getData();
    const syncHistory = await this.createSyncHistory(
      integration.id,
      integrationData.userId,
      syncType,
      SyncStatus.IN_PROGRESS
    );

    try {
      await this.saveSyncHistory(syncHistory);

      let syncResult;
      switch (integrationData.provider) {
        case IntegrationProvider.GOOGLE:
          syncResult = await this.syncGoogleData(integration, syncType, force);
          break;
        case IntegrationProvider.MICROSOFT:
          syncResult = await this.syncMicrosoftData(integration, syncType, force);
          break;
        default:
          throw this.createSyncError(
            IntegrationErrorCode.OAUTH_ERROR,
            `Sync not supported for provider ${integrationData.provider}`
          );
      }

      syncHistory.markCompleted(syncResult);
      await this.saveSyncHistory(syncHistory);

      logger.info('Data sync completed', {
        integrationId: integration.id,
        syncType,
        ...syncResult
      });

      return syncHistory;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      syncHistory.markFailed(errorMessage);
      await this.saveSyncHistory(syncHistory);
      throw error;
    }
  }

  /**
   * Synchroniser les données Google
   */
  private async syncGoogleData(integration: IntegrationModel, syncType: SyncType, force: boolean): Promise<any> {
    const tokens = await tokenService.getTokens(integration.id);
    if (!tokens) {
      throw this.createSyncError(
        IntegrationErrorCode.TOKEN_EXPIRED,
        'No tokens found for integration'
      );
    }

    // Vérifier et rafraîchir les tokens si nécessaire
    if (await tokenService.areTokensExpired(integration.id)) {
      const refreshedTokens = await this.refreshTokens(integration, tokens.refreshToken);
      await tokenService.updateTokens(integration.id, refreshedTokens);
    }

    switch (syncType) {
      case SyncType.CALENDAR:
        return await this.syncGoogleCalendar(integration, tokens.accessToken, force);
      case SyncType.CONTACTS:
        return await this.syncGoogleContacts(integration, tokens.accessToken, force);
      default:
        throw this.createSyncError(
          IntegrationErrorCode.OAUTH_ERROR,
          `Sync type ${syncType} not supported for Google`
        );
    }
  }

  /**
   * Synchroniser les données Microsoft
   */
  private async syncMicrosoftData(integration: IntegrationModel, syncType: SyncType, force: boolean): Promise<any> {
    const tokens = await tokenService.getTokens(integration.id);
    if (!tokens) {
      throw this.createSyncError(
        IntegrationErrorCode.TOKEN_EXPIRED,
        'No tokens found for integration'
      );
    }

    // Vérifier et rafraîchir les tokens si nécessaire
    if (await tokenService.areTokensExpired(integration.id)) {
      const refreshedTokens = await this.refreshTokens(integration, tokens.refreshToken);
      await tokenService.updateTokens(integration.id, refreshedTokens);
    }

    switch (syncType) {
      case SyncType.CALENDAR:
        return await this.syncMicrosoftCalendar(integration, tokens.accessToken, force);
      case SyncType.CONTACTS:
        return await this.syncMicrosoftContacts(integration, tokens.accessToken, force);
      case SyncType.PRESENCE:
        return await this.syncMicrosoftPresence(integration, tokens.accessToken, force);
      default:
        throw this.createSyncError(
          IntegrationErrorCode.OAUTH_ERROR,
          `Sync type ${syncType} not supported for Microsoft`
        );
    }
  }

  /**
   * Synchroniser le calendrier Google
   */
  private async syncGoogleCalendar(integration: IntegrationModel, accessToken: string, force: boolean): Promise<any> {
    try {
      const response = await axios.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        params: {
          maxResults: 250,
          singleEvents: true,
          orderBy: 'startTime',
          timeMin: new Date().toISOString()
        }
      });

      const events = response.data.items || [];
      const syncedEvents: SyncedCalendarEvent[] = events.map((event: any) => ({
        externalId: event.id,
        title: event.summary || 'Sans titre',
        description: event.description,
        startTime: new Date(event.start.dateTime || event.start.date),
        endTime: new Date(event.end.dateTime || event.end.date),
        location: event.location,
        attendees: event.attendees?.map((a: any) => a.email) || [],
        isAllDay: !event.start.dateTime,
        recurrence: event.recurrence?.join(';'),
        lastModified: new Date(event.updated)
      }));

      // Sauvegarder les événements synchronisés
      await this.saveSyncedCalendarEvents(integration.getData().userId, syncedEvents);

      return {
        itemsProcessed: events.length,
        itemsCreated: syncedEvents.length,
        itemsUpdated: 0,
        itemsDeleted: 0,
        dataSize: JSON.stringify(events).length
      };

    } catch (error) {
      logger.error('Error syncing Google Calendar', { error, integrationId: integration.id });
      throw this.createSyncError(
        IntegrationErrorCode.PROVIDER_UNAVAILABLE,
        'Failed to sync Google Calendar'
      );
    }
  }

  /**
   * Synchroniser les contacts Google
   */
  private async syncGoogleContacts(integration: IntegrationModel, accessToken: string, force: boolean): Promise<any> {
    try {
      const response = await axios.get('https://people.googleapis.com/v1/people/me/connections', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        params: {
          personFields: 'names,emailAddresses,phoneNumbers,organizations',
          pageSize: 1000
        }
      });

      const connections = response.data.connections || [];
      const syncedContacts: SyncedContact[] = connections
        .filter((contact: any) => contact.names && contact.emailAddresses)
        .map((contact: any) => ({
          externalId: contact.resourceName,
          firstName: contact.names[0]?.givenName || '',
          lastName: contact.names[0]?.familyName || '',
          email: contact.emailAddresses[0]?.value || '',
          phone: contact.phoneNumbers?.[0]?.value,
          company: contact.organizations?.[0]?.name,
          jobTitle: contact.organizations?.[0]?.title,
          lastModified: new Date(contact.metadata?.sources?.[0]?.updateTime || Date.now())
        }));

      // Sauvegarder les contacts synchronisés
      await this.saveSyncedContacts(integration.getData().userId, syncedContacts);

      return {
        itemsProcessed: connections.length,
        itemsCreated: syncedContacts.length,
        itemsUpdated: 0,
        itemsDeleted: 0,
        dataSize: JSON.stringify(connections).length
      };

    } catch (error) {
      logger.error('Error syncing Google Contacts', { error, integrationId: integration.id });
      throw this.createSyncError(
        IntegrationErrorCode.PROVIDER_UNAVAILABLE,
        'Failed to sync Google Contacts'
      );
    }
  }

  /**
   * Synchroniser le calendrier Microsoft
   */
  private async syncMicrosoftCalendar(integration: IntegrationModel, accessToken: string, force: boolean): Promise<any> {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me/events', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        params: {
          $top: 250,
          $orderby: 'start/dateTime',
          $filter: `start/dateTime ge '${new Date().toISOString()}'`
        }
      });

      const events = response.data.value || [];
      const syncedEvents: SyncedCalendarEvent[] = events.map((event: any) => ({
        externalId: event.id,
        title: event.subject || 'Sans titre',
        description: event.bodyPreview,
        startTime: new Date(event.start.dateTime),
        endTime: new Date(event.end.dateTime),
        location: event.location?.displayName,
        attendees: event.attendees?.map((a: any) => a.emailAddress.address) || [],
        isAllDay: event.isAllDay,
        recurrence: event.recurrence ? JSON.stringify(event.recurrence) : undefined,
        lastModified: new Date(event.lastModifiedDateTime)
      }));

      // Sauvegarder les événements synchronisés
      await this.saveSyncedCalendarEvents(integration.getData().userId, syncedEvents);

      return {
        itemsProcessed: events.length,
        itemsCreated: syncedEvents.length,
        itemsUpdated: 0,
        itemsDeleted: 0,
        dataSize: JSON.stringify(events).length
      };

    } catch (error) {
      logger.error('Error syncing Microsoft Calendar', { error, integrationId: integration.id });
      throw this.createSyncError(
        IntegrationErrorCode.PROVIDER_UNAVAILABLE,
        'Failed to sync Microsoft Calendar'
      );
    }
  }

  /**
   * Synchroniser les contacts Microsoft
   */
  private async syncMicrosoftContacts(integration: IntegrationModel, accessToken: string, force: boolean): Promise<any> {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me/contacts', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        params: {
          $top: 1000
        }
      });

      const contacts = response.data.value || [];
      const syncedContacts: SyncedContact[] = contacts
        .filter((contact: any) => contact.emailAddresses && contact.emailAddresses.length > 0)
        .map((contact: any) => ({
          externalId: contact.id,
          firstName: contact.givenName || '',
          lastName: contact.surname || '',
          email: contact.emailAddresses[0]?.address || '',
          phone: contact.homePhones?.[0] || contact.businessPhones?.[0],
          company: contact.companyName,
          jobTitle: contact.jobTitle,
          lastModified: new Date(contact.lastModifiedDateTime)
        }));

      // Sauvegarder les contacts synchronisés
      await this.saveSyncedContacts(integration.getData().userId, syncedContacts);

      return {
        itemsProcessed: contacts.length,
        itemsCreated: syncedContacts.length,
        itemsUpdated: 0,
        itemsDeleted: 0,
        dataSize: JSON.stringify(contacts).length
      };

    } catch (error) {
      logger.error('Error syncing Microsoft Contacts', { error, integrationId: integration.id });
      throw this.createSyncError(
        IntegrationErrorCode.PROVIDER_UNAVAILABLE,
        'Failed to sync Microsoft Contacts'
      );
    }
  }

  /**
   * Synchroniser la présence Microsoft Teams
   */
  private async syncMicrosoftPresence(integration: IntegrationModel, accessToken: string, force: boolean): Promise<any> {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me/presence', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      const presence = response.data;
      
      // Sauvegarder les informations de présence
      await this.saveSyncedPresence(integration.getData().userId, {
        availability: presence.availability,
        activity: presence.activity,
        lastModified: new Date()
      });

      return {
        itemsProcessed: 1,
        itemsCreated: 1,
        itemsUpdated: 0,
        itemsDeleted: 0,
        dataSize: JSON.stringify(presence).length
      };

    } catch (error) {
      logger.error('Error syncing Microsoft Presence', { error, integrationId: integration.id });
      throw this.createSyncError(
        IntegrationErrorCode.PROVIDER_UNAVAILABLE,
        'Failed to sync Microsoft Presence'
      );
    }
  }

  /**
   * Obtenir l'historique de synchronisation d'une intégration
   */
  async getSyncHistory(integrationId: string, limit: number = 50): Promise<SyncHistoryModel[]> {
    try {
      const query = await collections.sync_history
        .where('integrationId', '==', integrationId)
        .orderBy('startedAt', 'desc')
        .limit(limit)
        .get();

      return query.docs.map(doc => new SyncHistoryModel(doc.data(), doc.id));

    } catch (error) {
      logger.error('Error getting sync history', { error, integrationId });
      throw error;
    }
  }

  /**
   * Obtenir les types de synchronisation activés pour une intégration
   */
  private getEnabledSyncTypes(integration: UserIntegration): SyncType[] {
    const syncTypes: SyncType[] = [];
    const settings = integration.syncSettings;

    if (settings.calendar) syncTypes.push(SyncType.CALENDAR);
    if (settings.contacts) syncTypes.push(SyncType.CONTACTS);
    if (settings.email) syncTypes.push(SyncType.EMAIL);
    if (settings.files) syncTypes.push(SyncType.FILES);
    if (settings.tasks) syncTypes.push(SyncType.TASKS);
    if (settings.presence) syncTypes.push(SyncType.PRESENCE);

    return syncTypes;
  }

  /**
   * Rafraîchir les tokens d'une intégration
   */
  private async refreshTokens(integration: IntegrationModel, refreshToken: string): Promise<any> {
    return await oauthService.refreshToken(integration.getData().provider, refreshToken);
  }

  /**
   * Créer un nouvel historique de synchronisation
   */
  private async createSyncHistory(
    integrationId: string,
    userId: string,
    syncType: SyncType,
    status: SyncStatus
  ): Promise<SyncHistoryModel> {
    const syncHistoryData: Partial<SyncHistory> = {
      integrationId,
      userId,
      syncType,
      status,
      startedAt: new Date(),
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      errors: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new SyncHistoryModel(syncHistoryData);
  }

  /**
   * Sauvegarder l'historique de synchronisation
   */
  private async saveSyncHistory(syncHistory: SyncHistoryModel): Promise<void> {
    await collections.sync_history.doc(syncHistory.id).set(syncHistory.toFirestore());
  }

  /**
   * Sauvegarder une intégration
   */
  private async saveIntegration(integration: IntegrationModel): Promise<void> {
    await collections.user_integrations.doc(integration.id).set(integration.toFirestore());
  }

  /**
   * Sauvegarder les événements de calendrier synchronisés
   */
  private async saveSyncedCalendarEvents(userId: string, events: SyncedCalendarEvent[]): Promise<void> {
    const batch = require('../config').db.batch();
    
    events.forEach(event => {
      const docRef = collections.synced_calendar_events.doc();
      batch.set(docRef, {
        userId,
        ...event,
        syncedAt: new Date()
      });
    });

    await batch.commit();
  }

  /**
   * Sauvegarder les contacts synchronisés
   */
  private async saveSyncedContacts(userId: string, contacts: SyncedContact[]): Promise<void> {
    const batch = require('../config').db.batch();
    
    contacts.forEach(contact => {
      const docRef = collections.synced_contacts.doc();
      batch.set(docRef, {
        userId,
        ...contact,
        syncedAt: new Date()
      });
    });

    await batch.commit();
  }

  /**
   * Sauvegarder les informations de présence
   */
  private async saveSyncedPresence(userId: string, presence: any): Promise<void> {
    await collections.synced_presence.doc(userId).set({
      userId,
      ...presence,
      syncedAt: new Date()
    });
  }

  /**
   * Créer une erreur de synchronisation standardisée
   */
  private createSyncError(code: IntegrationErrorCode, message: string): IntegrationError {
    return {
      code,
      message,
      retryable: true,
      retryAfter: 300 // 5 minutes
    };
  }
}

export const syncService = SyncService.getInstance();