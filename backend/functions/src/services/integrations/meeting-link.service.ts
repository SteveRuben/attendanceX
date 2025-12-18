import { logger } from 'firebase-functions';
import { integrationService } from './integration.service';
import { tokenService } from '../auth/token.service';
import { oauthService } from './oauth.service';
import { IntegrationProvider, IntegrationStatus } from '../../common/types';

export interface MeetingLinkRequest {
  eventTitle: string;
  startDateTime: Date;
  endDateTime: Date;
  description?: string;
  attendees?: string[];
}

export interface MeetingLinkResponse {
  meetingUrl: string;
  provider: IntegrationProvider;
  meetingId?: string;
  joinUrl?: string;
  dialInNumbers?: string[];
  additionalInfo?: Record<string, any>;
}

export class MeetingLinkService {
  /**
   * Génère un lien de réunion selon les intégrations disponibles de l'utilisateur
   */
  static async generateMeetingLink(
    userId: string,
    request: MeetingLinkRequest
  ): Promise<MeetingLinkResponse | null> {
    try {
      // Récupérer les intégrations actives de l'utilisateur
      const integrations = await integrationService.getUserIntegrations(userId);
      const activeIntegrations = integrations.filter(
        integration => integration.getIntegrationData().status === IntegrationStatus.CONNECTED
      );

      if (activeIntegrations.length === 0) {
        logger.warn('No active integrations found for user', { 
          userId, 
          totalIntegrations: integrations.length,
          integrationStatuses: integrations.map(i => ({ 
            provider: i.getIntegrationData().provider, 
            status: i.getIntegrationData().status 
          }))
        });
        return null;
      }

      // Ordre de priorité des providers pour la génération de liens
      const providerPriority = [
        IntegrationProvider.GOOGLE,
        IntegrationProvider.MICROSOFT,
        IntegrationProvider.ZOOM,
        IntegrationProvider.SLACK
      ];

      // Trouver la première intégration disponible selon la priorité
      let selectedIntegration = null;
      for (const provider of providerPriority) {
        selectedIntegration = activeIntegrations.find(
          integration => integration.getIntegrationData().provider === provider
        );
        if (selectedIntegration) break;
      }

      if (!selectedIntegration) {
        logger.warn('No supported integration found for meeting link generation', { 
          userId,
          availableProviders: activeIntegrations.map(i => i.getIntegrationData().provider),
          supportedProviders: providerPriority
        });
        return null;
      }

      const provider = selectedIntegration.getIntegrationData().provider;
      logger.info('Generating meeting link', { userId, provider, eventTitle: request.eventTitle });

      // Générer le lien selon le provider
      switch (provider) {
        case IntegrationProvider.GOOGLE:
          return await this.generateGoogleMeetLink(selectedIntegration.id, request);
        
        case IntegrationProvider.MICROSOFT:
          return await this.generateTeamsLink(selectedIntegration.id, request);
        
        case IntegrationProvider.ZOOM:
          return await this.generateZoomLink(selectedIntegration.id, request);
        
        case IntegrationProvider.SLACK:
          return await this.generateSlackHuddleLink(selectedIntegration.id, request);
        
        default:
          logger.warn('Unsupported provider for meeting link generation', { provider });
          return null;
      }

    } catch (error) {
      logger.error('Error generating meeting link', { error, userId });
      throw error;
    }
  }

  /**
   * Génère un lien Google Meet
   */
  private static async generateGoogleMeetLink(
    integrationId: string,
    request: MeetingLinkRequest
  ): Promise<MeetingLinkResponse> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No tokens found for Google integration');
      }

      // Créer un événement Google Calendar avec Google Meet
      const calendarEvent = {
        summary: request.eventTitle,
        description: request.description || '',
        start: {
          dateTime: request.startDateTime.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: request.endDateTime.toISOString(),
          timeZone: 'UTC'
        },
        attendees: request.attendees?.map(email => ({ email })) || [],
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      // Appel à l'API Google Calendar
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calendarEvent)
      });

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      const eventData = await response.json();
      const meetingUrl = eventData.conferenceData?.entryPoints?.find(
        (entry: any) => entry.entryPointType === 'video'
      )?.uri;

      if (!meetingUrl) {
        throw new Error('No Google Meet link found in calendar event');
      }

      return {
        meetingUrl,
        provider: IntegrationProvider.GOOGLE,
        meetingId: eventData.conferenceData?.conferenceId,
        joinUrl: meetingUrl,
        additionalInfo: {
          calendarEventId: eventData.id,
          calendarEventLink: eventData.htmlLink
        }
      };

    } catch (error) {
      logger.error('Error generating Google Meet link', { error, integrationId });
      throw error;
    }
  }

  /**
   * Génère un lien Microsoft Teams
   */
  private static async generateTeamsLink(
    integrationId: string,
    request: MeetingLinkRequest
  ): Promise<MeetingLinkResponse> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No tokens found for Microsoft integration');
      }

      // Créer une réunion Teams via Microsoft Graph API
      const meeting = {
        subject: request.eventTitle,
        body: {
          contentType: 'HTML',
          content: request.description || ''
        },
        start: {
          dateTime: request.startDateTime.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: request.endDateTime.toISOString(),
          timeZone: 'UTC'
        },
        attendees: request.attendees?.map(email => ({
          emailAddress: {
            address: email,
            name: email
          },
          type: 'required'
        })) || [],
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness'
      };

      const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meeting)
      });

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.statusText}`);
      }

      const eventData = await response.json();
      const meetingUrl = eventData.onlineMeeting?.joinUrl;

      if (!meetingUrl) {
        throw new Error('No Teams meeting link found in event');
      }

      return {
        meetingUrl,
        provider: IntegrationProvider.MICROSOFT,
        meetingId: eventData.onlineMeeting?.conferenceId,
        joinUrl: meetingUrl,
        dialInNumbers: eventData.onlineMeeting?.dialinUrl ? [eventData.onlineMeeting.dialinUrl] : [],
        additionalInfo: {
          calendarEventId: eventData.id,
          calendarEventLink: eventData.webLink
        }
      };

    } catch (error) {
      logger.error('Error generating Teams link', { error, integrationId });
      throw error;
    }
  }

  /**
   * Génère un lien Zoom
   */
  private static async generateZoomLink(
    integrationId: string,
    request: MeetingLinkRequest
  ): Promise<MeetingLinkResponse> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No tokens found for Zoom integration');
      }

      // Créer une réunion Zoom
      const meeting = {
        topic: request.eventTitle,
        type: 2, // Scheduled meeting
        start_time: request.startDateTime.toISOString(),
        duration: Math.ceil((request.endDateTime.getTime() - request.startDateTime.getTime()) / (1000 * 60)), // Duration in minutes
        agenda: request.description || '',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 2,
          audio: 'both',
          auto_recording: 'none'
        }
      };

      const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meeting)
      });

      if (!response.ok) {
        throw new Error(`Zoom API error: ${response.statusText}`);
      }

      const meetingData = await response.json();

      return {
        meetingUrl: meetingData.join_url,
        provider: IntegrationProvider.ZOOM,
        meetingId: meetingData.id.toString(),
        joinUrl: meetingData.join_url,
        additionalInfo: {
          hostUrl: meetingData.start_url,
          meetingPassword: meetingData.password,
          dialInNumbers: meetingData.settings?.global_dial_in_numbers || []
        }
      };

    } catch (error) {
      logger.error('Error generating Zoom link', { error, integrationId });
      throw error;
    }
  }

  /**
   * Génère un lien Slack Huddle (placeholder)
   */
  private static async generateSlackHuddleLink(
    integrationId: string,
    request: MeetingLinkRequest
  ): Promise<MeetingLinkResponse> {
    try {
      // Note: Slack Huddles ne peuvent pas être pré-programmés via API
      // On génère un lien vers un canal Slack où l'huddle peut être démarré
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No tokens found for Slack integration');
      }

      // Pour l'instant, on retourne un lien générique vers Slack
      // Dans une implémentation complète, on pourrait créer un canal dédié
      const slackWorkspaceUrl = 'https://app.slack.com'; // À récupérer depuis l'API Slack

      return {
        meetingUrl: slackWorkspaceUrl,
        provider: IntegrationProvider.SLACK,
        joinUrl: slackWorkspaceUrl,
        additionalInfo: {
          note: 'Start a Huddle in your Slack workspace when the meeting begins',
          instructions: 'Click on the Huddle button in any Slack channel to start the audio/video call'
        }
      };

    } catch (error) {
      logger.error('Error generating Slack Huddle link', { error, integrationId });
      throw error;
    }
  }

  /**
   * Vérifie si l'utilisateur a des intégrations compatibles pour la génération de liens
   */
  static async hasCompatibleIntegrations(userId: string): Promise<{
    hasIntegrations: boolean;
    availableProviders: IntegrationProvider[];
  }> {
    try {
      const integrations = await integrationService.getUserIntegrations(userId);
      const activeIntegrations = integrations.filter(
        integration => integration.getIntegrationData().status === IntegrationStatus.CONNECTED
      );

      const supportedProviders = [
        IntegrationProvider.GOOGLE,
        IntegrationProvider.MICROSOFT,
        IntegrationProvider.ZOOM,
        IntegrationProvider.SLACK
      ];

      const availableProviders = activeIntegrations
        .map(integration => integration.getIntegrationData().provider)
        .filter(provider => supportedProviders.includes(provider));

      logger.info('Checking compatible integrations', {
        userId,
        totalIntegrations: integrations.length,
        activeIntegrations: activeIntegrations.length,
        availableProviders,
        supportedProviders
      });

      return {
        hasIntegrations: availableProviders.length > 0,
        availableProviders
      };

    } catch (error) {
      logger.error('Error checking compatible integrations', { error, userId });
      return {
        hasIntegrations: false,
        availableProviders: []
      };
    }
  }
}

export const meetingLinkService = MeetingLinkService;