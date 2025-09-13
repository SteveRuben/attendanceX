/**
 * Contrôleur pour les API de gestion de présence
 */

import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import { 
  PresenceAlert,
  PresenceStatusResponse,
  ClockInRequestSchema,
  ClockOutRequestSchema,
  PresenceQueryParamsSchema
} from '../../shared';
import { presenceNotificationService, presenceService } from '../../services';
import { AuthenticatedRequest } from '../../types';


export class PresenceController {
  /**
   * Pointer l'arrivée d'un employé
   */
  async clockIn(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = req.params.employeeId;
      const requestData = ClockInRequestSchema.parse(req.body);

      logger.info('Clock in request', { employeeId, hasLocation: !!requestData.location });

      const presenceEntry = await presenceService.clockIn(employeeId, requestData);

      res.status(200).json({
        success: true,
        data: presenceEntry,
        message: 'Clock in successful'
      });

    } catch (error) {
      logger.error('Clock in failed', { error, employeeId: req.params.employeeId });
      
      const statusCode = error instanceof Error && error.message.includes('already clocked in') ? 409 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Clock in failed',
        code: 'CLOCK_IN_FAILED'
      });
    }
  }

  /**
   * Pointer la sortie d'un employé
   */
  async clockOut(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = req.params.employeeId;
      const requestData = ClockOutRequestSchema.parse(req.body);

      logger.info('Clock out request', { employeeId, hasLocation: !!requestData.location });

      const presenceEntry = await presenceService.clockOut(employeeId, requestData);

      res.status(200).json({
        success: true,
        data: presenceEntry,
        message: 'Clock out successful'
      });

    } catch (error) {
      logger.error('Clock out failed', { error, employeeId: req.params.employeeId });
      
      const statusCode = error instanceof Error && error.message.includes('must clock in first') ? 409 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Clock out failed',
        code: 'CLOCK_OUT_FAILED'
      });
    }
  }

  /**
   * Commencer une pause
   */
  async startBreak(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = req.params.employeeId;
      const { type, location } = req.body;

      if (!type || !['lunch', 'coffee', 'personal', 'other'].includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid break type',
          code: 'INVALID_BREAK_TYPE'
        });
        return;
      }

      const result = await presenceService.startBreak(employeeId, type, location);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Break started successfully'
      });

    } catch (error) {
      logger.error('Start break failed', { error, employeeId: req.params.employeeId });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Start break failed',
        code: 'START_BREAK_FAILED'
      });
    }
  }

  /**
   * Terminer une pause
   */
  async endBreak(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = req.params.employeeId;
      const { breakId, location } = req.body;

      if (!breakId) {
        res.status(400).json({
          success: false,
          error: 'Break ID is required',
          code: 'MISSING_BREAK_ID'
        });
        return;
      }

      const presenceEntry = await presenceService.endBreak(employeeId, breakId, location);

      res.status(200).json({
        success: true,
        data: presenceEntry,
        message: 'Break ended successfully'
      });

    } catch (error) {
      logger.error('End break failed', { error, employeeId: req.params.employeeId });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'End break failed',
        code: 'END_BREAK_FAILED'
      });
    }
  }

  /**
   * Obtenir le statut de présence actuel d'un employé
   */
  async getPresenceStatus(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = req.params.employeeId;

      const status: PresenceStatusResponse = await presenceService.getPresenceStatus(employeeId);

      res.status(200).json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Get presence status failed', { error, employeeId: req.params.employeeId });
      
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get presence status',
        code: 'GET_STATUS_FAILED'
      });
    }
  }

  /**
   * Lister les entrées de présence avec filtres et pagination
   */
  async listPresenceEntries(req: Request, res: Response): Promise<void> {
    try {
      const queryParams = PresenceQueryParamsSchema.parse(req.query);

      const result = await presenceService.listPresenceEntries(queryParams);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('List presence entries failed', { error, query: req.query });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list presence entries',
        code: 'LIST_ENTRIES_FAILED'
      });
    }
  }

  /**
   * Mettre à jour une entrée de présence
   */
  async updatePresenceEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const entryId = req.params.entryId;
      const updates = req.body;
      const updatedBy = req.user?.uid || 'system';

      const presenceEntry = await presenceService.updatePresenceEntry(entryId, updates, updatedBy);

      res.status(200).json({
        success: true,
        data: presenceEntry,
        message: 'Presence entry updated successfully'
      });

    } catch (error) {
      logger.error('Update presence entry failed', { error, entryId: req.params.entryId });
      
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update presence entry',
        code: 'UPDATE_ENTRY_FAILED'
      });
    }
  }

  /**
   * Valider une entrée de présence (manager)
   */
  async validatePresenceEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const entryId = req.params.entryId;
      const { managerNotes } = req.body;
      const validatedBy = req.user?.uid || 'system';

      if (!managerNotes) {
        res.status(400).json({
          success: false,
          error: 'Manager notes are required',
          code: 'MISSING_MANAGER_NOTES'
        });
        return;
      }

      const presenceEntry = await presenceService.validatePresenceEntry(
        entryId,
        managerNotes,
        validatedBy
      );

      res.status(200).json({
        success: true,
        data: presenceEntry,
        message: 'Presence entry validated successfully'
      });

    } catch (error) {
      logger.error('Validate presence entry failed', { error, entryId: req.params.entryId });
      
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate presence entry',
        code: 'VALIDATE_ENTRY_FAILED'
      });
    }
  }

  /**
   * Détecter les anomalies de présence
   */
  async detectAnomalies(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const { date } = req.query;

      const anomalies: PresenceAlert[] = await presenceService.detectAnomalies(
        organizationId,
        date as string
      );

      res.status(200).json({
        success: true,
        data: anomalies,
        count: anomalies.length
      });

    } catch (error) {
      logger.error('Detect anomalies failed', { error, organizationId: req.params.organizationId });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect anomalies',
        code: 'DETECT_ANOMALIES_FAILED'
      });
    }
  }

  /**
   * Obtenir les statistiques de présence
   */
  async getPresenceStats(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required',
          code: 'MISSING_DATE_RANGE'
        });
        return;
      }

      const stats = await presenceService.getPresenceStats(
        organizationId,
        startDate as string,
        endDate as string
      );

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Get presence stats failed', { error, organizationId: req.params.organizationId });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get presence stats',
        code: 'GET_STATS_FAILED'
      });
    }
  }

  /**
   * Obtenir le résumé de présence d'équipe
   */
  async getTeamPresenceSummary(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const { departmentId, date } = req.query;

      const summary = await presenceService.getTeamPresenceSummary(
        organizationId,
        departmentId as string,
        date as string
      );

      res.status(200).json({
        success: true,
        data: summary
      });

    } catch (error) {
      logger.error('Get team presence summary failed', { 
        error, 
        organizationId: req.params.organizationId 
      });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get team presence summary',
        code: 'GET_TEAM_SUMMARY_FAILED'
      });
    }
  }

  /**
   * Corriger une entrée de présence
   */
  async correctPresenceEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const entryId = req.params.entryId;
      const { corrections, reason } = req.body;
      const correctedBy = req.user?.uid || 'system';

      if (!corrections || !reason) {
        res.status(400).json({
          success: false,
          error: 'Corrections and reason are required',
          code: 'MISSING_CORRECTION_DATA'
        });
        return;
      }

      const presenceEntry = await presenceService.correctPresenceEntry(
        entryId,
        corrections,
        correctedBy,
        reason
      );

      res.status(200).json({
        success: true,
        data: presenceEntry,
        message: 'Presence entry corrected successfully'
      });

    } catch (error) {
      logger.error('Correct presence entry failed', { error, entryId: req.params.entryId });
      
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to correct presence entry',
        code: 'CORRECT_ENTRY_FAILED'
      });
    }
  }

  /**
   * Obtenir les employés actuellement présents
   */
  async getCurrentlyPresentEmployees(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;

      const presentEmployees = await presenceService.getCurrentlyPresentEmployees(organizationId);

      res.status(200).json({
        success: true,
        data: presentEmployees,
        count: presentEmployees.length
      });

    } catch (error) {
      logger.error('Get currently present employees failed', { 
        error, 
        organizationId: req.params.organizationId 
      });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get currently present employees',
        code: 'GET_PRESENT_EMPLOYEES_FAILED'
      });
    }
  }

  /**
   * Traitement de fin de journée
   */
  async processEndOfDay(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const { date } = req.body;

      const result = await presenceService.processEndOfDayEntries(organizationId, date);

      res.status(200).json({
        success: true,
        data: result,
        message: 'End of day processing completed'
      });

    } catch (error) {
      logger.error('Process end of day failed', { 
        error, 
        organizationId: req.params.organizationId 
      });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process end of day',
        code: 'PROCESS_END_OF_DAY_FAILED'
      });
    }
  }

  /**
   * Traitement des notifications quotidiennes
   */
  async processDailyNotifications(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;

      const result = await presenceNotificationService.processDailyNotifications(organizationId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Daily notifications processed'
      });

    } catch (error) {
      logger.error('Process daily notifications failed', { 
        error, 
        organizationId: req.params.organizationId 
      });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process daily notifications',
        code: 'PROCESS_NOTIFICATIONS_FAILED'
      });
    }
  }
}

export const presenceController = new PresenceController();