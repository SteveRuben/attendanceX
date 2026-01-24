import { logger } from 'firebase-functions';
import { IntegrationProvider, IntegrationStatus } from '../../common/types';
import { integrationService } from './integration.service';
import { teamsConnectorService } from './teams-connector.service';
import { slackConnectorService } from './slack-connector.service';
import { meetingLinkService } from './meeting-link.service';

export interface ConnectorCapabilities {
  canCreateMeetings: boolean;
  canSendNotifications: boolean;
  canCreateChannels: boolean;
  canScheduleReminders: boolean;
  canSyncCalendar: boolean;
}

export interface EventConnectorRequest {
  eventId: string;
  eventTitle: string;
  eventDescription?: string;
  startDateTime: Date;
  endDateTime: Date;
  attendees?: string[];
  location?: string;
  timeZone?: string;
}

export interface ConnectorResult {
  provider: IntegrationProvider;
  success: boolean;
  data?: any;
  error?: string;
}

export interface NotificationRequest {
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  message: string;
  channelId?: string;
  reminderMinutes?: number;
}

export class ConnectorManagerService {
  /**
   * Obtenir les capacités d'un connecteur
   */
  static getConnectorCapabilities(provider: IntegrationProvider): ConnectorCapabilities {
    switch (provider) {
      case IntegrationProvider.MICROSOFT:
        return {
          canCreateMeetings: true,
          canSendNotifications: false,
          canCreateChannels: false,
          canScheduleReminders: false,
          canSyncCalendar: true
        };

      case IntegrationProvider.SLACK:
        return {
          canCreateMeetings: false,
          canSendNotifications: true,
          canCreateChannels: true,
          canScheduleReminders: true,
          canSyncCalendar: false
        };

      case IntegrationProvider.GOOGLE:
        return {
          canCreateMeetings: true,
          canSendNotifications: false,
          canCreateChannels: false,
          canScheduleReminders: false,
          canSyncCalendar: true
        };

      case IntegrationProvider.ZOOM:
        return {
          canCreateMeetings: true,
          canSendNotifications: false,
          canCreateChannels: false,
          canScheduleReminders: false,
          canSyncCalendar: false
        };

      default:
        return {
          canCreateMeetings: false,
          canSendNotifications: false,
          canCreateChannels: false,
          canScheduleReminders: false,
          canSyncCalendar: false
        };
    }
  }

  /**
   * Créer automatiquement une réunion avec le meilleur connecteur disponible
   */
  static async createEventMeeting(
    userId: string,
    eventRequest: EventConnectorRequest
  ): Promise<{
    meetingUrl?: string;
    meetingId?: string;
    provider?: IntegrationProvider;
    results: ConnectorResult[];
  }> {
    try {
      const integrations = await integrationService.getUserIntegrations(userId);
      const activeIntegrations = integrations.filter(
        integration => integration.getIntegrationData().status === IntegrationStatus.CONNECTED
      );

      if (activeIntegrations.length === 0) {
        logger.warn('No active integrations found for user', { userId });
        return { results: [] };
      }

      const results: ConnectorResult[] = [];
      let meetingUrl: string | undefined;
      let meetingId: string | undefined;
      let successProvider: IntegrationProvider | undefined;

      // Ordre de priorité pour la création de réunions
      const meetingProviders = [
        IntegrationProvider.GOOGLE,    // Google Meet en priorité
        IntegrationProvider.MICROSOFT, // Teams
        IntegrationProvider.ZOOM       // Zoom
      ];

      for (const provider of meetingProviders) {
        const integration = activeIntegrations.find(
          int => int.getIntegrationData().provider === provider
        );

        if (!integration) {continue;}

        const capabilities = this.getConnectorCapabilities(provider);
        if (!capabilities.canCreateMeetings) {continue;}

        try {
          let result;

          switch (provider) {
            case IntegrationProvider.MICROSOFT:
              result = await teamsConnectorService.createTeamsMeeting(
                integration.id,
                {
                  subject: eventRequest.eventTitle,
                  description: eventRequest.eventDescription,
                  startDateTime: eventRequest.startDateTime,
                  endDateTime: eventRequest.endDateTime,
                  attendees: eventRequest.attendees,
                  timeZone: eventRequest.timeZone,
                  location: eventRequest.location
                }
              );
              meetingUrl = result.meetingUrl;
              meetingId = result.meetingId;
              break;

            case IntegrationProvider.GOOGLE:
            case IntegrationProvider.ZOOM:
              // Utiliser le service existant de génération de liens
              const meetingResult = await meetingLinkService.generateMeetingLink(userId, {
                eventTitle: eventRequest.eventTitle,
                startDateTime: eventRequest.startDateTime,
                endDateTime: eventRequest.endDateTime,
                description: eventRequest.eventDescription,
                attendees: eventRequest.attendees
              });

              if (meetingResult) {
                meetingUrl = meetingResult.meetingUrl;
                meetingId = meetingResult.meetingId;
                result = meetingResult;
              }
              break;
          }

          if (result && meetingUrl) {
            successProvider = provider;
            results.push({
              provider,
              success: true,
              data: result
            });

            logger.info('Meeting created successfully', {
              userId,
              provider,
              eventId: eventRequest.eventId,
              meetingUrl
            });

            break; // Arrêter après le premier succès
          }

        } catch (error: any) {
          logger.error('Error creating meeting with provider', {
            error: error.message,
            provider,
            userId,
            eventId: eventRequest.eventId
          });

          results.push({
            provider,
            success: false,
            error: error.message
          });
        }
      }

      return {
        meetingUrl,
        meetingId,
        provider: successProvider,
        results
      };

    } catch (error: any) {
      logger.error('Error in createEventMeeting', {
        error: error.message,
        userId,
        eventId: eventRequest.eventId
      });

      throw new Error(`Failed to create event meeting: ${error.message}`);
    }
  }

  /**
   * Envoyer des notifications d'événement via tous les connecteurs compatibles
   */
  static async sendEventNotifications(
    userId: string,
    notification: NotificationRequest
  ): Promise<{
    results: ConnectorResult[];
    successCount: number;
  }> {
    try {
      const integrations = await integrationService.getUserIntegrations(userId);
      const activeIntegrations = integrations.filter(
        integration => integration.getIntegrationData().status === IntegrationStatus.CONNECTED
      );

      const results: ConnectorResult[] = [];
      let successCount = 0;

      for (const integration of activeIntegrations) {
        const provider = integration.getIntegrationData().provider;
        const capabilities = this.getConnectorCapabilities(provider);

        if (!capabilities.canSendNotifications) {continue;}

        try {
          let result;

          switch (provider) {
            case IntegrationProvider.SLACK:
              // Si aucun canal spécifié, utiliser le canal général ou le premier disponible
              let channelId = notification.channelId;
              
              if (!channelId) {
                const channels = await slackConnectorService.getChannels(integration.id, {
                  excludeArchived: true,
                  limit: 10
                });
                
                // Chercher le canal général ou prendre le premier
                const generalChannel = channels.find(ch => ch.is_general || ch.name === 'general');
                channelId = generalChannel?.id || channels[0]?.id;
              }

              if (channelId) {
                result = await slackConnectorService.sendEventNotification(integration.id, {
                  eventId: notification.eventId,
                  eventTitle: notification.eventTitle,
                  eventDate: notification.eventDate,
                  channelId,
                  message: notification.message,
                  reminderMinutes: notification.reminderMinutes
                });
              }
              break;
          }

          if (result) {
            successCount++;
            results.push({
              provider,
              success: true,
              data: result
            });

            logger.info('Event notification sent successfully', {
              userId,
              provider,
              eventId: notification.eventId
            });
          }

        } catch (error: any) {
          logger.error('Error sending notification with provider', {
            error: error.message,
            provider,
            userId,
            eventId: notification.eventId
          });

          results.push({
            provider,
            success: false,
            error: error.message
          });
        }
      }

      return {
        results,
        successCount
      };

    } catch (error: any) {
      logger.error('Error in sendEventNotifications', {
        error: error.message,
        userId,
        eventId: notification.eventId
      });

      throw new Error(`Failed to send event notifications: ${error.message}`);
    }
  }

  /**
   * Créer des canaux dédiés pour un événement
   */
  static async createEventChannels(
    userId: string,
    eventData: {
      eventId: string;
      eventTitle: string;
      isPrivate?: boolean;
      attendeeEmails?: string[];
    }
  ): Promise<{
    results: ConnectorResult[];
    channels: Array<{
      provider: IntegrationProvider;
      channelId: string;
      channelName: string;
    }>;
  }> {
    try {
      const integrations = await integrationService.getUserIntegrations(userId);
      const activeIntegrations = integrations.filter(
        integration => integration.getIntegrationData().status === IntegrationStatus.CONNECTED
      );

      const results: ConnectorResult[] = [];
      const channels: Array<{
        provider: IntegrationProvider;
        channelId: string;
        channelName: string;
      }> = [];

      for (const integration of activeIntegrations) {
        const provider = integration.getIntegrationData().provider;
        const capabilities = this.getConnectorCapabilities(provider);

        if (!capabilities.canCreateChannels) {continue;}

        try {
          let result;

          switch (provider) {
            case IntegrationProvider.SLACK:
              result = await slackConnectorService.createEventChannel(integration.id, {
                eventId: eventData.eventId,
                eventTitle: eventData.eventTitle,
                isPrivate: eventData.isPrivate
              });

              if (result) {
                channels.push({
                  provider,
                  channelId: result.channelId,
                  channelName: result.channelName
                });
              }
              break;
          }

          if (result) {
            results.push({
              provider,
              success: true,
              data: result
            });

            logger.info('Event channel created successfully', {
              userId,
              provider,
              eventId: eventData.eventId,
              channelId: result.channelId
            });
          }

        } catch (error: any) {
          logger.error('Error creating channel with provider', {
            error: error.message,
            provider,
            userId,
            eventId: eventData.eventId
          });

          results.push({
            provider,
            success: false,
            error: error.message
          });
        }
      }

      return {
        results,
        channels
      };

    } catch (error: any) {
      logger.error('Error in createEventChannels', {
        error: error.message,
        userId,
        eventId: eventData.eventId
      });

      throw new Error(`Failed to create event channels: ${error.message}`);
    }
  }

  /**
   * Programmer des rappels d'événement
   */
  static async scheduleEventReminders(
    userId: string,
    reminderData: {
      eventId: string;
      eventTitle: string;
      eventDate: Date;
      reminderMinutes: number[];
      channelIds?: Record<IntegrationProvider, string>;
    }
  ): Promise<{
    results: ConnectorResult[];
    scheduledCount: number;
  }> {
    try {
      const integrations = await integrationService.getUserIntegrations(userId);
      const activeIntegrations = integrations.filter(
        integration => integration.getIntegrationData().status === IntegrationStatus.CONNECTED
      );

      const results: ConnectorResult[] = [];
      let scheduledCount = 0;

      for (const integration of activeIntegrations) {
        const provider = integration.getIntegrationData().provider;
        const capabilities = this.getConnectorCapabilities(provider);

        if (!capabilities.canScheduleReminders) {continue;}

        try {
          const channelId = reminderData.channelIds?.[provider];
          if (!channelId) {continue;}

          for (const reminderMinutes of reminderData.reminderMinutes) {
            let result;

            switch (provider) {
              case IntegrationProvider.SLACK:
                result = await slackConnectorService.scheduleEventReminder(integration.id, {
                  eventId: reminderData.eventId,
                  eventTitle: reminderData.eventTitle,
                  eventDate: reminderData.eventDate,
                  channelId,
                  reminderMinutes
                });
                break;
            }

            if (result) {
              scheduledCount++;
              results.push({
                provider,
                success: true,
                data: { reminderMinutes, ...result }
              });

              logger.info('Event reminder scheduled successfully', {
                userId,
                provider,
                eventId: reminderData.eventId,
                reminderMinutes
              });
            }
          }

        } catch (error: any) {
          logger.error('Error scheduling reminder with provider', {
            error: error.message,
            provider,
            userId,
            eventId: reminderData.eventId
          });

          results.push({
            provider,
            success: false,
            error: error.message
          });
        }
      }

      return {
        results,
        scheduledCount
      };

    } catch (error: any) {
      logger.error('Error in scheduleEventReminders', {
        error: error.message,
        userId,
        eventId: reminderData.eventId
      });

      throw new Error(`Failed to schedule event reminders: ${error.message}`);
    }
  }

  /**
   * Obtenir un résumé des connecteurs disponibles pour un utilisateur
   */
  static async getUserConnectorSummary(userId: string): Promise<{
    totalIntegrations: number;
    activeIntegrations: number;
    availableCapabilities: ConnectorCapabilities;
    providerStatus: Record<IntegrationProvider, {
      connected: boolean;
      capabilities: ConnectorCapabilities;
      lastSync?: Date;
      error?: string;
    }>;
  }> {
    try {
      const integrations = await integrationService.getUserIntegrations(userId);
      
      const totalIntegrations = integrations.length;
      const activeIntegrations = integrations.filter(
        integration => integration.getIntegrationData().status === IntegrationStatus.CONNECTED
      ).length;

      const providerStatus: Record<string, any> = {};
      const availableCapabilities: ConnectorCapabilities = {
        canCreateMeetings: false,
        canSendNotifications: false,
        canCreateChannels: false,
        canScheduleReminders: false,
        canSyncCalendar: false
      };

      // Analyser chaque intégration
      for (const integration of integrations) {
        const data = integration.getIntegrationData();
        const provider = data.provider;
        const capabilities = this.getConnectorCapabilities(provider);

        providerStatus[provider] = {
          connected: data.status === IntegrationStatus.CONNECTED,
          capabilities,
          lastSync: data.lastSyncAt,
          error: data.errorMessage
        };

        // Agréger les capacités disponibles
        if (data.status === IntegrationStatus.CONNECTED) {
          availableCapabilities.canCreateMeetings = availableCapabilities.canCreateMeetings || capabilities.canCreateMeetings;
          availableCapabilities.canSendNotifications = availableCapabilities.canSendNotifications || capabilities.canSendNotifications;
          availableCapabilities.canCreateChannels = availableCapabilities.canCreateChannels || capabilities.canCreateChannels;
          availableCapabilities.canScheduleReminders = availableCapabilities.canScheduleReminders || capabilities.canScheduleReminders;
          availableCapabilities.canSyncCalendar = availableCapabilities.canSyncCalendar || capabilities.canSyncCalendar;
        }
      }

      logger.info('Generated user connector summary', {
        userId,
        totalIntegrations,
        activeIntegrations,
        availableCapabilities
      });

      return {
        totalIntegrations,
        activeIntegrations,
        availableCapabilities,
        providerStatus
      };

    } catch (error: any) {
      logger.error('Error generating user connector summary', {
        error: error.message,
        userId
      });

      throw new Error(`Failed to generate connector summary: ${error.message}`);
    }
  }

  /**
   * Tester toutes les connexions d'un utilisateur
   */
  static async testAllConnections(userId: string): Promise<{
    results: Array<{
      provider: IntegrationProvider;
      isValid: boolean;
      error?: string;
      userInfo?: any;
    }>;
    overallHealth: 'healthy' | 'partial' | 'unhealthy';
  }> {
    try {
      const integrations = await integrationService.getUserIntegrations(userId);
      const results = [];

      for (const integration of integrations) {
        const provider = integration.getIntegrationData().provider;
        
        try {
          let testResult;

          switch (provider) {
            case IntegrationProvider.MICROSOFT:
              testResult = await teamsConnectorService.testConnection(integration.id);
              break;

            case IntegrationProvider.SLACK:
              testResult = await slackConnectorService.testConnection(integration.id);
              break;

            default:
              testResult = { isValid: false, error: 'Provider not supported for testing' };
          }

          results.push({
            provider,
            isValid: testResult.isValid,
            error: testResult.error,
            userInfo: testResult.userInfo || testResult.workspaceInfo
          });

        } catch (error: any) {
          results.push({
            provider,
            isValid: false,
            error: error.message
          });
        }
      }

      // Déterminer la santé globale
      const validConnections = results.filter(r => r.isValid).length;
      const totalConnections = results.length;
      
      let overallHealth: 'healthy' | 'partial' | 'unhealthy';
      if (validConnections === totalConnections && totalConnections > 0) {
        overallHealth = 'healthy';
      } else if (validConnections > 0) {
        overallHealth = 'partial';
      } else {
        overallHealth = 'unhealthy';
      }

      logger.info('Completed connection tests', {
        userId,
        totalConnections,
        validConnections,
        overallHealth
      });

      return {
        results,
        overallHealth
      };

    } catch (error: any) {
      logger.error('Error testing all connections', {
        error: error.message,
        userId
      });

      throw new Error(`Failed to test connections: ${error.message}`);
    }
  }
}

export const connectorManagerService = ConnectorManagerService;