import { logger } from 'firebase-functions';
import { IntegrationStatus, OAuthTokens } from '../../common/types';
import { tokenService } from '../auth/token.service';
import { integrationService } from './integration.service';
import axios from 'axios';

export interface TeamsEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'HTML' | 'Text';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type: 'required' | 'optional' | 'resource';
  }>;
  location?: {
    displayName: string;
  };
  isOnlineMeeting: boolean;
  onlineMeetingProvider: 'teamsForBusiness';
}

export interface TeamsCalendarEvent {
  id: string;
  subject: string;
  bodyPreview: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location: {
    displayName: string;
  };
  attendees: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
    status: {
      response: string;
      time: string;
    };
  }>;
  organizer: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  onlineMeeting?: {
    joinUrl: string;
    conferenceId: string;
  };
  isOnlineMeeting: boolean;
  webLink: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

export interface TeamsUserProfile {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
}

export class TeamsConnectorService {
  private static readonly BASE_URL = 'https://graph.microsoft.com/v1.0';

  /**
   * Créer une réunion Teams avec lien de visioconférence
   */
  static async createTeamsMeeting(
    integrationId: string,
    eventData: {
      subject: string;
      description?: string;
      startDateTime: Date;
      endDateTime: Date;
      attendees?: string[];
      timeZone?: string;
      location?: string;
    }
  ): Promise<{
    event: TeamsCalendarEvent;
    meetingUrl: string;
    meetingId: string;
    dialInInfo?: any;
  }> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No valid tokens found for Teams integration');
      }

      const validTokens = await this.ensureValidTokens(integrationId, tokens);
      const timeZone = eventData.timeZone || 'UTC';
      
      const teamsEvent: TeamsEvent = {
        subject: eventData.subject,
        body: {
          contentType: 'HTML',
          content: eventData.description || ''
        },
        start: {
          dateTime: eventData.startDateTime.toISOString(),
          timeZone
        },
        end: {
          dateTime: eventData.endDateTime.toISOString(),
          timeZone
        },
        attendees: eventData.attendees?.map(email => ({
          emailAddress: {
            address: email,
            name: email.split('@')[0]
          },
          type: 'required' as const
        })) || [],
        location: eventData.location ? {
          displayName: eventData.location
        } : undefined,
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness'
      };

      logger.info('Creating Teams meeting', {
        integrationId,
        subject: eventData.subject
      });

      const response = await axios.post(
        `${this.BASE_URL}/me/events`,
        teamsEvent,
        {
          headers: {
            'Authorization': `Bearer ${validTokens.accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'outlook.timezone="UTC"'
          }
        }
      );

      const createdEvent: TeamsCalendarEvent = response.data;

      if (!createdEvent.onlineMeeting?.joinUrl) {
        throw new Error('Teams meeting was created but no join URL was provided');
      }

      logger.info('Teams meeting created successfully', {
        integrationId,
        eventId: createdEvent.id,
        meetingUrl: createdEvent.onlineMeeting.joinUrl
      });

      return {
        event: createdEvent,
        meetingUrl: createdEvent.onlineMeeting.joinUrl,
        meetingId: createdEvent.onlineMeeting.conferenceId,
        dialInInfo: {
          conferenceId: createdEvent.onlineMeeting.conferenceId,
          webLink: createdEvent.webLink
        }
      };

    } catch (error: any) {
      logger.error('Error creating Teams meeting', {
        error: error.message,
        integrationId,
        response: error.response?.data
      });

      if (error.response?.status === 401) {
        await this.handleTokenError(integrationId);
        throw new Error('Teams integration token expired. Please reconnect your account.');
      }

      throw new Error(`Failed to create Teams meeting: ${error.message}`);
    }
  }

  /**
   * Obtenir les événements du calendrier Teams
   */
  static async getCalendarEvents(
    integrationId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      maxResults?: number;
    } = {}
  ): Promise<TeamsCalendarEvent[]> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No valid tokens found for Teams integration');
      }

      const validTokens = await this.ensureValidTokens(integrationId, tokens);
      const params = new URLSearchParams();
      
      if (options.maxResults) {
        params.append('$top', options.maxResults.toString());
      }

      if (options.startDate && options.endDate) {
        const filter = `start/dateTime ge '${options.startDate.toISOString()}' and end/dateTime le '${options.endDate.toISOString()}'`;
        params.append('$filter', filter);
      }

      params.append('$orderby', 'start/dateTime');

      const response = await axios.get(
        `${this.BASE_URL}/me/events?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${validTokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Retrieved Teams calendar events', {
        integrationId,
        eventCount: response.data.value?.length || 0
      });

      return response.data.value || [];

    } catch (error: any) {
      logger.error('Error retrieving Teams calendar events', {
        error: error.message,
        integrationId
      });

      if (error.response?.status === 401) {
        await this.handleTokenError(integrationId);
        throw new Error('Teams integration token expired. Please reconnect your account.');
      }

      throw new Error(`Failed to retrieve Teams calendar events: ${error.message}`);
    }
  }

  /**
   * Obtenir le profil utilisateur Teams
   */
  static async getUserProfile(integrationId: string): Promise<TeamsUserProfile> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No valid tokens found for Teams integration');
      }

      const validTokens = await this.ensureValidTokens(integrationId, tokens);

      const response = await axios.get(
        `${this.BASE_URL}/me`,
        {
          headers: {
            'Authorization': `Bearer ${validTokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Retrieved Teams user profile', {
        integrationId,
        userId: response.data.id
      });

      return response.data;

    } catch (error: any) {
      logger.error('Error retrieving Teams user profile', {
        error: error.message,
        integrationId
      });

      if (error.response?.status === 401) {
        await this.handleTokenError(integrationId);
        throw new Error('Teams integration token expired. Please reconnect your account.');
      }

      throw new Error(`Failed to retrieve Teams user profile: ${error.message}`);
    }
  }

  /**
   * Tester la connexion Teams
   */
  static async testConnection(integrationId: string): Promise<{
    isValid: boolean;
    userInfo?: TeamsUserProfile;
    error?: string;
  }> {
    try {
      const userProfile = await this.getUserProfile(integrationId);
      
      return {
        isValid: true,
        userInfo: userProfile
      };

    } catch (error: any) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * S'assurer que les tokens sont valides et les rafraîchir si nécessaire
   */
  private static async ensureValidTokens(integrationId: string, tokens: OAuthTokens): Promise<OAuthTokens> {
    const expirationBuffer = 5 * 60 * 1000; // 5 minutes
    const now = new Date();
    const expiresAt = new Date(tokens.expiresAt);

    if (expiresAt.getTime() - now.getTime() < expirationBuffer) {
      try {
        return await tokenService.refreshToken(integrationId);
      } catch (error) {
        logger.error('Failed to refresh Teams tokens', { error, integrationId });
        throw new Error('Failed to refresh Teams authentication tokens');
      }
    }

    return tokens;
  }

  /**
   * Gérer les erreurs de token
   */
  private static async handleTokenError(integrationId: string): Promise<void> {
    try {
      const integration = await integrationService.getIntegration(integrationId);
      if (integration) {
        integration.updateStatus(
          IntegrationStatus.ERROR,
          'Authentication token expired or invalid. Please reconnect your Teams account.'
        );
        await integrationService.updateIntegrationSettings(integrationId, {});
      }
    } catch (error) {
      logger.error('Error updating integration status after token error', {
        error,
        integrationId
      });
    }
  }

  /**
   * Obtenir les scopes requis pour Teams
   */
  static getRequiredScopes(): string[] {
    return [
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/OnlineMeetings.ReadWrite',
      'https://graph.microsoft.com/User.Read'
    ];
  }
}

export const teamsConnectorService = TeamsConnectorService;