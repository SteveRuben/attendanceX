import { FormSubmission, FormSubmissionStatus } from "../../common/types/form-builder.types";
import { EventTicket, CreateTicketRequest, TicketEmailOptions } from "../../common/types/ticket.types";
import { ticketService } from "../ticket/ticket.service";
import { ticketGeneratorService } from "../ticket/ticket-generator.service";
import { tenantEventService } from "../event/tenant-event.service";
import { logger } from "firebase-functions";
import { NotFoundError } from "../../utils/common/errors";

export interface RegistrationProcessResult {
  success: boolean;
  ticket?: EventTicket;
  emailSent: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface AutoRegistrationConfig {
  eventId: string;
  tenantId: string;
  autoGenerateTicket: boolean;
  autoSendEmail: boolean;
  ticketTemplateId?: string;
  emailOptions?: TicketEmailOptions;
  requireApproval?: boolean;
  customFieldMapping?: Record<string, string>;
}

export class EventRegistrationService {

  /**
   * Traiter une inscription d'événement avec génération automatique de billet
   */
  async processEventRegistration(
    formSubmission: FormSubmission,
    config: AutoRegistrationConfig,
    userId: string
  ): Promise<RegistrationProcessResult> {
    const result: RegistrationProcessResult = {
      success: false,
      emailSent: false,
      errors: [],
      warnings: []
    };

    try {
      logger.info(`🎫 Processing event registration`, {
        submissionId: formSubmission.id,
        eventId: config.eventId,
        tenantId: config.tenantId,
        autoGenerateTicket: config.autoGenerateTicket,
        autoSendEmail: config.autoSendEmail
      });

      // 1. Valider la soumission du formulaire
      const validationResult = this.validateRegistrationSubmission(formSubmission);
      if (!validationResult.isValid) {
        result.errors = validationResult.errors;
        return result;
      }

      // 2. Vérifier que l'événement existe
      const event = await tenantEventService.getEventById(config.tenantId, config.eventId);
      if (!event) {
        result.errors = ['Event not found'];
        return result;
      }

      // 3. Extraire les informations du participant depuis le formulaire
      const participantInfo = this.extractParticipantInfo(formSubmission, config.customFieldMapping);

      // 4. Vérifier si une inscription existe déjà
      const existingTicket = await ticketService.getTicketByParticipant(
        config.eventId,
        participantInfo.participantId,
        config.tenantId
      );

      if (existingTicket) {
        result.warnings = ['Participant already registered for this event'];
        result.ticket = existingTicket;
        result.success = true;
        return result;
      }

      // 5. Générer le billet si configuré
      if (config.autoGenerateTicket) {
        const ticketRequest: CreateTicketRequest = {
          eventId: config.eventId,
          participantId: participantInfo.participantId,
          participantName: participantInfo.participantName,
          participantEmail: participantInfo.participantEmail,
          participantPhone: participantInfo.participantPhone,
          templateId: config.ticketTemplateId,
          registrationData: formSubmission.data,
          specialRequirements: participantInfo.specialRequirements
        };

        const ticket = await ticketService.createTicket(ticketRequest, config.tenantId, userId);
        result.ticket = ticket;

        logger.info(`✅ Ticket generated for registration`, {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          participantEmail: ticket.participantEmail
        });

        // 6. Envoyer le billet par email si configuré
        if (config.autoSendEmail) {
          try {
            const emailSent = await ticketGeneratorService.sendTicketByEmail(
              ticket,
              config.emailOptions || {},
              config.tenantId
            );

            result.emailSent = emailSent;

            if (emailSent) {
              logger.info(`📧 Ticket email sent successfully`, {
                ticketId: ticket.id,
                recipientEmail: ticket.participantEmail
              });
            } else {
              result.warnings = result.warnings || [];
              result.warnings.push('Ticket generated but email failed to send');
            }
          } catch (emailError: any) {
            result.warnings = result.warnings || [];
            result.warnings.push(`Email sending failed: ${emailError.message}`);
            logger.warn(`⚠️ Failed to send ticket email`, {
              ticketId: ticket.id,
              error: emailError.message
            });
          }
        }
      }

      // 7. Enregistrer les données d'inscription supplémentaires si nécessaire
      await this.saveRegistrationData(formSubmission, config, result.ticket);

      result.success = true;

      logger.info(`🎉 Event registration processed successfully`, {
        submissionId: formSubmission.id,
        eventId: config.eventId,
        ticketGenerated: !!result.ticket,
        emailSent: result.emailSent,
        warningsCount: result.warnings?.length || 0
      });

      return result;

    } catch (error: any) {
      logger.error(`❌ Error processing event registration`, {
        submissionId: formSubmission.id,
        eventId: config.eventId,
        tenantId: config.tenantId,
        error: error.message
      });

      result.errors = result.errors || [];
      result.errors.push(`Registration processing failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Traiter plusieurs inscriptions en lot
   */
  async processBulkRegistrations(
    formSubmissions: FormSubmission[],
    config: AutoRegistrationConfig,
    userId: string
  ): Promise<{
    successful: RegistrationProcessResult[];
    failed: Array<{ submission: FormSubmission; error: string }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      ticketsGenerated: number;
      emailsSent: number;
    };
  }> {
    const successful: RegistrationProcessResult[] = [];
    const failed: Array<{ submission: FormSubmission; error: string }> = [];

    logger.info(`📋 Processing bulk event registrations`, {
      submissionsCount: formSubmissions.length,
      eventId: config.eventId,
      tenantId: config.tenantId
    });

    for (const submission of formSubmissions) {
      try {
        const result = await this.processEventRegistration(submission, config, userId);
        
        if (result.success) {
          successful.push(result);
        } else {
          failed.push({
            submission,
            error: result.errors?.join(', ') || 'Unknown error'
          });
        }
      } catch (error: any) {
        failed.push({
          submission,
          error: error.message
        });
      }
    }

    const summary = {
      total: formSubmissions.length,
      successful: successful.length,
      failed: failed.length,
      ticketsGenerated: successful.filter(r => r.ticket).length,
      emailsSent: successful.filter(r => r.emailSent).length
    };

    logger.info(`📊 Bulk registration processing completed`, summary);

    return { successful, failed, summary };
  }

  /**
   * Renvoyer un billet par email
   */
  async resendTicketEmail(
    ticketId: string,
    tenantId: string,
    emailOptions?: TicketEmailOptions
  ): Promise<boolean> {
    try {
      const ticket = await ticketService.getTicketById(ticketId, tenantId);
      if (!ticket) {
        throw new NotFoundError('Ticket not found');
      }

      const emailSent = await ticketGeneratorService.sendTicketByEmail(
        ticket,
        emailOptions || {},
        tenantId
      );

      logger.info(`📧 Ticket email resent`, {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        recipientEmail: ticket.participantEmail,
        success: emailSent
      });

      return emailSent;
    } catch (error: any) {
      logger.error(`❌ Error resending ticket email`, {
        ticketId,
        tenantId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Obtenir le statut d'une inscription
   */
  async getRegistrationStatus(
    eventId: string,
    participantEmail: string,
    tenantId: string
  ): Promise<{
    isRegistered: boolean;
    ticket?: EventTicket;
    registrationDate?: Date;
    status?: string;
  }> {
    try {
      // Chercher par email (on pourrait améliorer avec un index)
      const ticketsResult = await ticketService.getTicketsByEvent(eventId, tenantId);
      const ticket = ticketsResult.tickets.find(t => t.participantEmail.toLowerCase() === participantEmail.toLowerCase());

      if (ticket) {
        return {
          isRegistered: true,
          ticket,
          registrationDate: ticket.createdAt,
          status: ticket.status
        };
      }

      return { isRegistered: false };
    } catch (error: any) {
      logger.error(`Error checking registration status`, {
        eventId,
        participantEmail,
        tenantId,
        error: error.message
      });
      return { isRegistered: false };
    }
  }

  // Méthodes privées

  private validateRegistrationSubmission(submission: FormSubmission): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Vérifier que la soumission est complète
    if (submission.status !== FormSubmissionStatus.PROCESSED && submission.status !== FormSubmissionStatus.PENDING) {
      errors.push('Form submission is not in a valid state for processing');
    }

    // Vérifier les champs requis de base
    const requiredFields = ['firstName', 'lastName', 'email'];
    for (const field of requiredFields) {
      if (!submission.data[field] || !submission.data[field].toString().trim()) {
        errors.push(`Required field missing: ${field}`);
      }
    }

    // Valider l'email
    const email = submission.data.email;
    if (email && !this.isValidEmail(email.toString())) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private extractParticipantInfo(
    submission: FormSubmission,
    customFieldMapping?: Record<string, string>
  ): {
    participantId: string;
    participantName: string;
    participantEmail: string;
    participantPhone?: string;
    specialRequirements?: string;
  } {
    const data = submission.data;
    const mapping = customFieldMapping || {};

    // Utiliser le mapping personnalisé ou les noms de champs par défaut
    const firstName = data[mapping.firstName || 'firstName'] || '';
    const lastName = data[mapping.lastName || 'lastName'] || '';
    const email = data[mapping.email || 'email'] || '';
    const phone = data[mapping.phone || 'phone'] || '';
    const requirements = data[mapping.specialRequirements || 'specialRequirements'] || '';

    return {
      participantId: submission.submittedBy || email.toString(), // Utiliser l'ID utilisateur ou l'email
      participantName: `${firstName} ${lastName}`.trim(),
      participantEmail: email.toString(),
      participantPhone: phone ? phone.toString() : undefined,
      specialRequirements: requirements ? requirements.toString() : undefined
    };
  }

  private async saveRegistrationData(
    submission: FormSubmission,
    config: AutoRegistrationConfig,
    ticket?: EventTicket
  ): Promise<void> {
    try {
      // Ici, vous pourriez sauvegarder des données d'inscription supplémentaires
      // dans une collection dédiée si nécessaire
      logger.info('Registration data saved', {
        submissionId: submission.id,
        eventId: config.eventId,
        ticketId: ticket?.id
      });
    } catch (error) {
      logger.warn('Failed to save additional registration data', {
        submissionId: submission.id,
        error
      });
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const eventRegistrationService = new EventRegistrationService();