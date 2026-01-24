import { Response } from 'express';
import { logger } from 'firebase-functions';
import { asyncAuthHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types';
import { AuthErrorHandler } from '../../utils/auth';
import { ERROR_CODES } from '../../common/constants';
import { connectorManagerService } from '../../services/integrations/connector-manager.service';
import { teamsConnectorService } from '../../services/integrations/teams-connector.service';
import { slackConnectorService } from '../../services/integrations/slack-connector.service';
import { IntegrationProvider } from '../../common/types';

export class ConnectorController {

  /**
   * Créer une réunion pour un événement
   */
  static createEventMeeting = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const {
        eventId,
        eventTitle,
        eventDescription,
        startDateTime,
        endDateTime,
        attendees,
        location,
        timeZone
      } = req.body;

      // Validation des champs requis
      if (!eventId || !eventTitle || !startDateTime || !endDateTime) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Missing required fields: eventId, eventTitle, startDateTime, endDateTime");
      }

      logger.info('🚀 Creating event meeting', {
        userId,
        eventId,
        eventTitle,
        startDateTime,
        endDateTime
      });

      const result = await connectorManagerService.createEventMeeting(userId, {
        eventId,
        eventTitle,
        eventDescription,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        attendees,
        location,
        timeZone
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ Event meeting creation completed in ${duration}ms`, {
        userId,
        eventId,
        success: !!result.meetingUrl,
        provider: result.provider,
        duration
      });

      res.json({
        success: true,
        message: result.meetingUrl ? "Meeting created successfully" : "No meeting providers available",
        data: {
          meetingUrl: result.meetingUrl,
          meetingId: result.meetingId,
          provider: result.provider,
          results: result.results
        }
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error creating event meeting after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create event meeting");
    }
  });

  /**
   * Envoyer des notifications d'événement
   */
  static sendEventNotifications = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const {
        eventId,
        eventTitle,
        eventDate,
        message,
        channelId,
        reminderMinutes
      } = req.body;

      // Validation des champs requis
      if (!eventId || !eventTitle || !eventDate || !message) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Missing required fields: eventId, eventTitle, eventDate, message");
      }

      logger.info('📢 Sending event notifications', {
        userId,
        eventId,
        eventTitle,
        eventDate
      });

      const result = await connectorManagerService.sendEventNotifications(userId, {
        eventId,
        eventTitle,
        eventDate: new Date(eventDate),
        message,
        channelId,
        reminderMinutes
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ Event notifications sent in ${duration}ms`, {
        userId,
        eventId,
        successCount: result.successCount,
        totalAttempts: result.results.length,
        duration
      });

      res.json({
        success: true,
        message: `Notifications sent successfully (${result.successCount}/${result.results.length})`,
        data: {
          successCount: result.successCount,
          results: result.results
        }
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error sending event notifications after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to send event notifications");
    }
  });

  /**
   * Créer des canaux pour un événement
   */
  static createEventChannels = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const {
        eventId,
        eventTitle,
        isPrivate,
        attendeeEmails
      } = req.body;

      // Validation des champs requis
      if (!eventId || !eventTitle) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Missing required fields: eventId, eventTitle");
      }

      logger.info('🏗️ Creating event channels', {
        userId,
        eventId,
        eventTitle,
        isPrivate
      });

      const result = await connectorManagerService.createEventChannels(userId, {
        eventId,
        eventTitle,
        isPrivate,
        attendeeEmails
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ Event channels created in ${duration}ms`, {
        userId,
        eventId,
        channelsCreated: result.channels.length,
        duration
      });

      res.json({
        success: true,
        message: `Event channels created successfully (${result.channels.length})`,
        data: {
          channels: result.channels,
          results: result.results
        }
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error creating event channels after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create event channels");
    }
  });

  /**
   * Programmer des rappels d'événement
   */
  static scheduleEventReminders = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const {
        eventId,
        eventTitle,
        eventDate,
        reminderMinutes,
        channelIds
      } = req.body;

      // Validation des champs requis
      if (!eventId || !eventTitle || !eventDate || !reminderMinutes || !Array.isArray(reminderMinutes)) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Missing required fields: eventId, eventTitle, eventDate, reminderMinutes (array)");
      }

      logger.info('⏰ Scheduling event reminders', {
        userId,
        eventId,
        eventTitle,
        reminderCount: reminderMinutes.length
      });

      const result = await connectorManagerService.scheduleEventReminders(userId, {
        eventId,
        eventTitle,
        eventDate: new Date(eventDate),
        reminderMinutes,
        channelIds
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ Event reminders scheduled in ${duration}ms`, {
        userId,
        eventId,
        scheduledCount: result.scheduledCount,
        duration
      });

      res.json({
        success: true,
        message: `Event reminders scheduled successfully (${result.scheduledCount})`,
        data: {
          scheduledCount: result.scheduledCount,
          results: result.results
        }
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error scheduling event reminders after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to schedule event reminders");
    }
  });

  /**
   * Obtenir le résumé des connecteurs de l'utilisateur
   */
  static getConnectorSummary = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      logger.info('📊 Getting connector summary', { userId });

      const summary = await connectorManagerService.getUserConnectorSummary(userId);

      res.json({
        success: true,
        data: summary
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting connector summary:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get connector summary");
    }
  });

  /**
   * Tester toutes les connexions
   */
  static testAllConnections = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      logger.info('🔍 Testing all connections', { userId });

      const testResults = await connectorManagerService.testAllConnections(userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Connection tests completed in ${duration}ms`, {
        userId,
        overallHealth: testResults.overallHealth,
        totalTests: testResults.results.length,
        duration
      });

      res.json({
        success: true,
        message: `Connection tests completed - Overall health: ${testResults.overallHealth}`,
        data: testResults
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error testing connections after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to test connections");
    }
  });

  /**
   * Obtenir les canaux Slack disponibles
   */
  static getSlackChannels = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.uid;
      const integrationId = req.params.integrationId as string;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!integrationId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Integration ID is required");
      }

      logger.info('📋 Getting Slack channels', { userId, integrationId });

      const channels = await slackConnectorService.getChannels(integrationId, {
        excludeArchived: true,
        types: 'public_channel,private_channel',
        limit: 100
      });

      res.json({
        success: true,
        data: {
          channels: channels.map(channel => ({
            id: channel.id,
            name: channel.name,
            isPrivate: channel.is_private,
            isGeneral: channel.is_general,
            memberCount: channel.num_members,
            topic: channel.topic?.value,
            purpose: channel.purpose?.value
          }))
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting Slack channels:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get Slack channels");
    }
  });

  /**
   * Obtenir les événements du calendrier Teams
   */
  static getTeamsCalendarEvents = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.uid;
      const integrationId = req.params.integrationId as string;
      const { startDate, endDate, maxResults } = req.query;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!integrationId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Integration ID is required");
      }

      logger.info('📅 Getting Teams calendar events', { userId, integrationId });

      const options: any = {};
      
      if (startDate) {
        options.startDate = new Date(startDate as string);
      }
      
      if (endDate) {
        options.endDate = new Date(endDate as string);
      }
      
      if (maxResults) {
        options.maxResults = parseInt(maxResults as string, 10);
      }

      const events = await teamsConnectorService.getCalendarEvents(integrationId, options);

      res.json({
        success: true,
        data: {
          events: events.map(event => ({
            id: event.id,
            subject: event.subject,
            start: event.start,
            end: event.end,
            location: event.location?.displayName,
            attendees: event.attendees?.map(att => ({
              name: att.emailAddress.name,
              email: att.emailAddress.address,
              response: att.status.response
            })),
            organizer: {
              name: event.organizer.emailAddress.name,
              email: event.organizer.emailAddress.address
            },
            isOnlineMeeting: event.isOnlineMeeting,
            meetingUrl: event.onlineMeeting?.joinUrl,
            webLink: event.webLink
          }))
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting Teams calendar events:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get Teams calendar events");
    }
  });

  /**
   * Tester une connexion spécifique
   */
  static testConnection = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.uid;
      const integrationId = req.params.integrationId as string;
      const { provider } = req.query;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!integrationId || !provider) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Integration ID and provider are required");
      }

      logger.info('🔍 Testing specific connection', { userId, integrationId, provider });

      let testResult;

      switch (provider) {
        case IntegrationProvider.MICROSOFT:
          testResult = await teamsConnectorService.testConnection(integrationId);
          break;

        case IntegrationProvider.SLACK:
          testResult = await slackConnectorService.testConnection(integrationId);
          break;

        default:
          const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
          return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, `Provider ${provider} not supported for testing`);
      }

      res.json({
        success: true,
        message: testResult.isValid ? "Connection test successful" : "Connection test failed",
        data: testResult
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error testing connection:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to test connection");
    }
  });
}