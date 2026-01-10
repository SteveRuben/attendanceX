import { logger } from 'firebase-functions';
import { IntegrationStatus, OAuthTokens } from '../../common/types';
import { tokenService } from '../auth/token.service';
import { integrationService } from './integration.service';
import axios from 'axios';

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  created: number;
  is_archived: boolean;
  is_general: boolean;
  unlinked: number;
  name_normalized: string;
  is_shared: boolean;
  is_ext_shared: boolean;
  is_org_shared: boolean;
  pending_shared: string[];
  pending_connected_team_ids: string[];
  is_pending_ext_shared: boolean;
  is_member: boolean;
  is_open: boolean;
  topic: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose: {
    value: string;
    creator: string;
    last_set: number;
  };
  num_members?: number;
}

export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  color: string;
  real_name: string;
  tz: string;
  tz_label: string;
  tz_offset: number;
  profile: {
    title: string;
    phone: string;
    skype: string;
    real_name: string;
    real_name_normalized: string;
    display_name: string;
    display_name_normalized: string;
    fields: Record<string, any>;
    status_text: string;
    status_emoji: string;
    status_expiration: number;
    avatar_hash: string;
    email: string;
    first_name: string;
    last_name: string;
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
    image_192: string;
    image_512: string;
  };
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  is_app_user: boolean;
  updated: number;
}

export interface SlackMessage {
  type: string;
  channel: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  replies?: Array<{
    user: string;
    ts: string;
  }>;
  subscribed?: boolean;
  last_read?: string;
  unread_count?: number;
  attachments?: Array<{
    fallback: string;
    color: string;
    pretext: string;
    author_name: string;
    author_link: string;
    author_icon: string;
    title: string;
    title_link: string;
    text: string;
    fields: Array<{
      title: string;
      value: string;
      short: boolean;
    }>;
    image_url: string;
    thumb_url: string;
    footer: string;
    footer_icon: string;
    ts: number;
  }>;
}

export interface SlackWorkspace {
  id: string;
  name: string;
  domain: string;
  email_domain: string;
  icon: {
    image_34: string;
    image_44: string;
    image_68: string;
    image_88: string;
    image_102: string;
    image_132: string;
    image_230: string;
    image_default: boolean;
  };
}

export interface SlackEventNotification {
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  channelId: string;
  message: string;
  reminderMinutes?: number;
}

export class SlackConnectorService {
  private static readonly BASE_URL = 'https://slack.com/api';

  /**
   * Envoyer une notification d'événement dans un canal Slack
   */
  static async sendEventNotification(
    integrationId: string,
    notification: SlackEventNotification
  ): Promise<{
    messageTs: string;
    channel: string;
    permalink: string;
  }> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No valid tokens found for Slack integration');
      }

      const validTokens = await this.ensureValidTokens(integrationId, tokens);

      // Créer un message formaté pour l'événement
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📅 ${notification.eventTitle}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: notification.message
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Date:*\n${notification.eventDate.toLocaleDateString()}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${notification.eventDate.toLocaleTimeString()}`
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Event Details',
                emoji: true
              },
              value: notification.eventId,
              action_id: 'view_event_details'
            }
          ]
        }
      ];

      const response = await axios.post(
        `${this.BASE_URL}/chat.postMessage`,
        {
          channel: notification.channelId,
          text: `Event Notification: ${notification.eventTitle}`,
          blocks: blocks,
          unfurl_links: false,
          unfurl_media: false
        },
        {
          headers: {
            'Authorization': `Bearer ${validTokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      logger.info('Slack event notification sent', {
        integrationId,
        eventId: notification.eventId,
        channel: notification.channelId,
        messageTs: response.data.ts
      });

      return {
        messageTs: response.data.ts,
        channel: response.data.channel,
        permalink: response.data.message?.permalink || ''
      };

    } catch (error: any) {
      logger.error('Error sending Slack event notification', {
        error: error.message,
        integrationId,
        eventId: notification.eventId,
        response: error.response?.data
      });

      if (error.response?.status === 401 || error.response?.data?.error === 'invalid_auth') {
        await this.handleTokenError(integrationId);
        throw new Error('Slack integration token expired. Please reconnect your account.');
      }

      throw new Error(`Failed to send Slack notification: ${error.message}`);
    }
  }

  /**
   * Obtenir la liste des canaux Slack
   */
  static async getChannels(
    integrationId: string,
    options: {
      excludeArchived?: boolean;
      types?: string; // 'public_channel,private_channel,mpim,im'
      limit?: number;
    } = {}
  ): Promise<SlackChannel[]> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No valid tokens found for Slack integration');
      }

      const validTokens = await this.ensureValidTokens(integrationId, tokens);

      const params = new URLSearchParams();
      params.append('exclude_archived', (options.excludeArchived !== false).toString());
      params.append('types', options.types || 'public_channel,private_channel');
      
      if (options.limit) {
        params.append('limit', options.limit.toString());
      }

      const response = await axios.get(
        `${this.BASE_URL}/conversations.list?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${validTokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      logger.info('Retrieved Slack channels', {
        integrationId,
        channelCount: response.data.channels?.length || 0
      });

      return response.data.channels || [];

    } catch (error: any) {
      logger.error('Error retrieving Slack channels', {
        error: error.message,
        integrationId,
        response: error.response?.data
      });

      if (error.response?.status === 401 || error.response?.data?.error === 'invalid_auth') {
        await this.handleTokenError(integrationId);
        throw new Error('Slack integration token expired. Please reconnect your account.');
      }

      throw new Error(`Failed to retrieve Slack channels: ${error.message}`);
    }
  }

  /**
   * Obtenir les informations de l'utilisateur Slack
   */
  static async getUserProfile(integrationId: string): Promise<SlackUser> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No valid tokens found for Slack integration');
      }

      const validTokens = await this.ensureValidTokens(integrationId, tokens);

      const response = await axios.get(
        `${this.BASE_URL}/users.profile.get`,
        {
          headers: {
            'Authorization': `Bearer ${validTokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      // Obtenir aussi les informations de base de l'utilisateur
      const userInfoResponse = await axios.get(
        `${this.BASE_URL}/auth.test`,
        {
          headers: {
            'Authorization': `Bearer ${validTokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!userInfoResponse.data.ok) {
        throw new Error(`Slack API error: ${userInfoResponse.data.error}`);
      }

      const userProfile = {
        id: userInfoResponse.data.user_id,
        team_id: userInfoResponse.data.team_id,
        name: userInfoResponse.data.user,
        deleted: false,
        color: '',
        real_name: response.data.profile?.real_name || userInfoResponse.data.user,
        tz: '',
        tz_label: '',
        tz_offset: 0,
        profile: response.data.profile,
        is_admin: false,
        is_owner: false,
        is_primary_owner: false,
        is_restricted: false,
        is_ultra_restricted: false,
        is_bot: false,
        is_app_user: false,
        updated: Date.now()
      };

      logger.info('Retrieved Slack user profile', {
        integrationId,
        userId: userProfile.id,
        userName: userProfile.name
      });

      return userProfile;

    } catch (error: any) {
      logger.error('Error retrieving Slack user profile', {
        error: error.message,
        integrationId,
        response: error.response?.data
      });

      if (error.response?.status === 401 || error.response?.data?.error === 'invalid_auth') {
        await this.handleTokenError(integrationId);
        throw new Error('Slack integration token expired. Please reconnect your account.');
      }

      throw new Error(`Failed to retrieve Slack user profile: ${error.message}`);
    }
  }

  /**
   * Obtenir les informations du workspace Slack
   */
  static async getWorkspaceInfo(integrationId: string): Promise<SlackWorkspace> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No valid tokens found for Slack integration');
      }

      const validTokens = await this.ensureValidTokens(integrationId, tokens);

      const response = await axios.get(
        `${this.BASE_URL}/team.info`,
        {
          headers: {
            'Authorization': `Bearer ${validTokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      logger.info('Retrieved Slack workspace info', {
        integrationId,
        workspaceId: response.data.team.id,
        workspaceName: response.data.team.name
      });

      return response.data.team;

    } catch (error: any) {
      logger.error('Error retrieving Slack workspace info', {
        error: error.message,
        integrationId,
        response: error.response?.data
      });

      if (error.response?.status === 401 || error.response?.data?.error === 'invalid_auth') {
        await this.handleTokenError(integrationId);
        throw new Error('Slack integration token expired. Please reconnect your account.');
      }

      throw new Error(`Failed to retrieve Slack workspace info: ${error.message}`);
    }
  }

  /**
   * Programmer un rappel d'événement
   */
  static async scheduleEventReminder(
    integrationId: string,
    reminder: {
      eventId: string;
      eventTitle: string;
      eventDate: Date;
      channelId: string;
      reminderMinutes: number;
      userId?: string;
    }
  ): Promise<{
    scheduledMessageId: string;
  }> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No valid tokens found for Slack integration');
      }

      const validTokens = await this.ensureValidTokens(integrationId, tokens);

      const reminderTime = new Date(reminder.eventDate.getTime() - (reminder.reminderMinutes * 60 * 1000));
      const postAt = Math.floor(reminderTime.getTime() / 1000);

      const message = `🔔 Reminder: "${reminder.eventTitle}" starts in ${reminder.reminderMinutes} minutes!`;

      const response = await axios.post(
        `${this.BASE_URL}/chat.scheduleMessage`,
        {
          channel: reminder.channelId,
          text: message,
          post_at: postAt
        },
        {
          headers: {
            'Authorization': `Bearer ${validTokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      logger.info('Slack event reminder scheduled', {
        integrationId,
        eventId: reminder.eventId,
        reminderTime: reminderTime.toISOString(),
        scheduledMessageId: response.data.scheduled_message_id
      });

      return {
        scheduledMessageId: response.data.scheduled_message_id
      };

    } catch (error: any) {
      logger.error('Error scheduling Slack event reminder', {
        error: error.message,
        integrationId,
        eventId: reminder.eventId,
        response: error.response?.data
      });

      if (error.response?.status === 401 || error.response?.data?.error === 'invalid_auth') {
        await this.handleTokenError(integrationId);
        throw new Error('Slack integration token expired. Please reconnect your account.');
      }

      throw new Error(`Failed to schedule Slack reminder: ${error.message}`);
    }
  }

  /**
   * Créer un canal Slack pour un événement
   */
  static async createEventChannel(
    integrationId: string,
    eventData: {
      eventId: string;
      eventTitle: string;
      isPrivate?: boolean;
      userIds?: string[];
    }
  ): Promise<{
    channelId: string;
    channelName: string;
  }> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        throw new Error('No valid tokens found for Slack integration');
      }

      const validTokens = await this.ensureValidTokens(integrationId, tokens);

      // Créer un nom de canal valide (lowercase, no spaces, etc.)
      const channelName = `event-${eventData.eventTitle}`
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 21); // Slack channel name limit

      const response = await axios.post(
        `${this.BASE_URL}/conversations.create`,
        {
          name: channelName,
          is_private: eventData.isPrivate || false
        },
        {
          headers: {
            'Authorization': `Bearer ${validTokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      const channelId = response.data.channel.id;

      // Inviter les utilisateurs si spécifiés
      if (eventData.userIds && eventData.userIds.length > 0) {
        await axios.post(
          `${this.BASE_URL}/conversations.invite`,
          {
            channel: channelId,
            users: eventData.userIds.join(',')
          },
          {
            headers: {
              'Authorization': `Bearer ${validTokens.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      // Envoyer un message de bienvenue
      await axios.post(
        `${this.BASE_URL}/chat.postMessage`,
        {
          channel: channelId,
          text: `Welcome to the event channel for "${eventData.eventTitle}"! 🎉\n\nThis channel has been created to facilitate communication and coordination for this event.`
        },
        {
          headers: {
            'Authorization': `Bearer ${validTokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Slack event channel created', {
        integrationId,
        eventId: eventData.eventId,
        channelId,
        channelName
      });

      return {
        channelId,
        channelName
      };

    } catch (error: any) {
      logger.error('Error creating Slack event channel', {
        error: error.message,
        integrationId,
        eventId: eventData.eventId,
        response: error.response?.data
      });

      if (error.response?.status === 401 || error.response?.data?.error === 'invalid_auth') {
        await this.handleTokenError(integrationId);
        throw new Error('Slack integration token expired. Please reconnect your account.');
      }

      throw new Error(`Failed to create Slack event channel: ${error.message}`);
    }
  }

  /**
   * Tester la connexion Slack
   */
  static async testConnection(integrationId: string): Promise<{
    isValid: boolean;
    userInfo?: SlackUser;
    workspaceInfo?: SlackWorkspace;
    error?: string;
  }> {
    try {
      const [userProfile, workspaceInfo] = await Promise.all([
        this.getUserProfile(integrationId),
        this.getWorkspaceInfo(integrationId)
      ]);

      logger.info('Slack connection test successful', {
        integrationId,
        userId: userProfile.id,
        workspaceId: workspaceInfo.id
      });

      return {
        isValid: true,
        userInfo: userProfile,
        workspaceInfo
      };

    } catch (error: any) {
      logger.error('Slack connection test failed', {
        error: error.message,
        integrationId
      });

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
    // Slack tokens n'expirent généralement pas, mais on peut vérifier leur validité
    try {
      const testResponse = await axios.get(
        `${this.BASE_URL}/auth.test`,
        {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!testResponse.data.ok) {
        throw new Error('Token validation failed');
      }

      return tokens;

    } catch (error) {
      logger.error('Slack token validation failed', {
        error,
        integrationId
      });
      throw new Error('Slack authentication token is invalid');
    }
  }

  /**
   * Gérer les erreurs de token (expiration, révocation)
   */
  private static async handleTokenError(integrationId: string): Promise<void> {
    try {
      const integration = await integrationService.getIntegration(integrationId);
      if (integration) {
        integration.updateStatus(
          IntegrationStatus.ERROR,
          'Authentication token expired or invalid. Please reconnect your Slack account.'
        );
        // Sauvegarder via le service public
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
   * Obtenir les scopes requis pour Slack
   */
  static getRequiredScopes(): string[] {
    return [
      'channels:read',
      'channels:write',
      'chat:write',
      'groups:read',
      'groups:write',
      'im:read',
      'im:write',
      'mpim:read',
      'mpim:write',
      'users:read',
      'users.profile:read',
      'team:read',
      'chat:write.public'
    ];
  }

  /**
   * Valider les permissions de l'intégration Slack
   */
  static async validatePermissions(integrationId: string): Promise<{
    isValid: boolean;
    missingScopes: string[];
  }> {
    try {
      const tokens = await tokenService.getTokens(integrationId);
      if (!tokens) {
        return {
          isValid: false,
          missingScopes: this.getRequiredScopes()
        };
      }

      // Tester les permissions en essayant d'accéder aux différentes API
      const testResults = await Promise.allSettled([
        this.getChannels(integrationId, { limit: 1 }),
        this.getUserProfile(integrationId),
        this.getWorkspaceInfo(integrationId)
      ]);

      const failedTests = testResults.filter(result => result.status === 'rejected');
      
      if (failedTests.length === 0) {
        return {
          isValid: true,
          missingScopes: []
        };
      }

      // En cas d'échec, retourner les scopes requis
      return {
        isValid: false,
        missingScopes: this.getRequiredScopes()
      };

    } catch (error) {
      logger.error('Error validating Slack permissions', {
        error,
        integrationId
      });

      return {
        isValid: false,
        missingScopes: this.getRequiredScopes()
      };
    }
  }
}

export const slackConnectorService = SlackConnectorService; 