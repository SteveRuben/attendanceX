/**
 * Service de notifications pour les approbations
 */

import { collections } from '../../config/database';
import { ApprovalWorkflowModel } from '../../models/approval-workflow.model';
import { ValidationError } from '../../models/base.model';
import { EmailService } from '../notification/EmailService';

// Types pour les notifications
export interface NotificationTemplate {
  id?: string;
  tenantId: string;

  // Identification
  type: 'submission' | 'approval_request' | 'approved' | 'rejected' | 'escalated' | 'reminder' | 'delegation';
  name: string;
  description: string;

  // Contenu
  subject: string;
  bodyHtml: string;
  bodyText: string;

  // Configuration
  isActive: boolean;
  language: string;

  // Variables disponibles
  availableVariables: string[];

  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface NotificationRecipient {
  userId: string;
  name: string;
  email: string;
  role: 'employee' | 'approver' | 'manager' | 'admin';
}

export interface NotificationContext {
  workflow: ApprovalWorkflowModel;
  employee: NotificationRecipient;
  approver?: NotificationRecipient;
  previousApprover?: NotificationRecipient;
  nextApprover?: NotificationRecipient;
  additionalData?: Record<string, any>;
}

export class ApprovalNotificationsService {
  private templatesCollection = collections.notification_templates;
  private notificationLogsCollection = collections.notification_logs;
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // ==================== Gestion des templates ====================

  /**
   * Créer un template de notification
   */
  async createNotificationTemplate(
    tenantId: string,
    template: Omit<NotificationTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<NotificationTemplate> {
    try {
      const templateData: NotificationTemplate = {
        ...template,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy
      };

      const docRef = await this.templatesCollection.add(templateData);

      return {
        ...templateData,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to create notification template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir un template de notification
   */
  async getNotificationTemplate(
    tenantId: string,
    type: NotificationTemplate['type'],
    language: string = 'fr'
  ): Promise<NotificationTemplate | null> {
    try {
      const query = await this.templatesCollection
        .where('tenantId', '==', tenantId)
        .where('type', '==', type)
        .where('language', '==', language)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (query.empty) {
        // Essayer avec la langue par défaut
        const defaultQuery = await this.templatesCollection
          .where('tenantId', '==', tenantId)
          .where('type', '==', type)
          .where('language', '==', 'fr')
          .where('isActive', '==', true)
          .limit(1)
          .get();

        if (defaultQuery.empty) {
          return this.getDefaultTemplate(type, language);
        }

        return {
          id: defaultQuery.docs[0].id,
          ...defaultQuery.docs[0].data()
        } as NotificationTemplate;
      }

      return {
        id: query.docs[0].id,
        ...query.docs[0].data()
      } as NotificationTemplate;
    } catch (error) {
      return this.getDefaultTemplate(type, language);
    }
  }

  // ==================== Envoi de notifications ====================

  /**
   * Notifier la soumission d'une feuille de temps
   */
  async notifySubmission(
    tenantId: string,
    context: NotificationContext
  ): Promise<void> {
    try {
      const template = await this.getNotificationTemplate(tenantId, 'submission');
      if (!template) {
        throw new ValidationError('Submission notification template not found');
      }

      // Notifier l'employé
      await this.sendNotification(tenantId, template, context, context.employee);

      // Notifier l'approbateur
      if (context.approver) {
        const approvalTemplate = await this.getNotificationTemplate(tenantId, 'approval_request');
        if (approvalTemplate) {
          await this.sendNotification(tenantId, approvalTemplate, context, context.approver);
        }
      }

      // Log de la notification
      await this.logNotification(tenantId, 'submission', context.workflow.id!, [
        context.employee.userId,
        ...(context.approver ? [context.approver.userId] : [])
      ]);
    } catch (error) {
      console.error('Failed to notify submission:', error);
    }
  }

  /**
   * Notifier l'approbation d'une feuille de temps
   */
  async notifyApproval(
    tenantId: string,
    context: NotificationContext
  ): Promise<void> {
    try {
      const template = await this.getNotificationTemplate(tenantId, 'approved');
      if (!template) {
        return;
      }

      // Notifier l'employé
      await this.sendNotification(tenantId, template, context, context.employee);

      // Si ce n'est pas le dernier niveau, notifier le prochain approbateur
      if (context.nextApprover) {
        const approvalTemplate = await this.getNotificationTemplate(tenantId, 'approval_request');
        if (approvalTemplate) {
          await this.sendNotification(tenantId, approvalTemplate, context, context.nextApprover);
        }
      }

      // Log de la notification
      await this.logNotification(tenantId, 'approved', context.workflow.id!, [
        context.employee.userId,
        ...(context.nextApprover ? [context.nextApprover.userId] : [])
      ]);
    } catch (error) {
      console.error('Failed to notify approval:', error);
    }
  }

  /**
   * Notifier le rejet d'une feuille de temps
   */
  async notifyRejection(
    tenantId: string,
    context: NotificationContext,
    reason: string,
    comments?: string
  ): Promise<void> {
    try {
      const template = await this.getNotificationTemplate(tenantId, 'rejected');
      if (!template) {
        return;
      }

      // Ajouter les informations de rejet au contexte
      const rejectionContext = {
        ...context,
        additionalData: {
          ...context.additionalData,
          rejectionReason: reason,
          rejectionComments: comments
        }
      };

      // Notifier l'employé
      await this.sendNotification(tenantId, template, rejectionContext, context.employee);

      // Log de la notification
      await this.logNotification(tenantId, 'rejected', context.workflow.id!, [context.employee.userId]);
    } catch (error) {
      console.error('Failed to notify rejection:', error);
    }
  }

  /**
   * Notifier une escalation
   */
  async notifyEscalation(
    tenantId: string,
    context: NotificationContext,
    escalatedTo: NotificationRecipient,
    reason?: string
  ): Promise<void> {
    try {
      const template = await this.getNotificationTemplate(tenantId, 'escalated');
      if (!template) {
        return;
      }

      // Ajouter les informations d'escalation au contexte
      const escalationContext = {
        ...context,
        additionalData: {
          ...context.additionalData,
          escalationReason: reason,
          escalatedTo: escalatedTo.name
        }
      };

      // Notifier la personne vers qui l'escalation est faite
      await this.sendNotification(tenantId, template, escalationContext, escalatedTo);

      // Notifier l'employé de l'escalation
      await this.sendNotification(tenantId, template, escalationContext, context.employee);

      // Log de la notification
      await this.logNotification(tenantId, 'escalated', context.workflow.id!, [
        escalatedTo.userId,
        context.employee.userId
      ]);
    } catch (error) {
      console.error('Failed to notify escalation:', error);
    }
  }

  /**
   * Notifier une délégation
   */
  async notifyDelegation(
    tenantId: string,
    context: NotificationContext,
    delegatedTo: NotificationRecipient,
    originalApprover: NotificationRecipient,
    comments?: string
  ): Promise<void> {
    try {
      const template = await this.getNotificationTemplate(tenantId, 'delegation');
      if (!template) {
        return;
      }

      // Ajouter les informations de délégation au contexte
      const delegationContext = {
        ...context,
        additionalData: {
          ...context.additionalData,
          originalApprover: originalApprover.name,
          delegatedTo: delegatedTo.name,
          delegationComments: comments
        }
      };

      // Notifier le délégué
      await this.sendNotification(tenantId, template, delegationContext, delegatedTo);

      // Log de la notification
      await this.logNotification(tenantId, 'delegation', context.workflow.id!, [delegatedTo.userId]);
    } catch (error) {
      console.error('Failed to notify delegation:', error);
    }
  }

  // ==================== Rappels automatiques ====================

  /**
   * Envoyer des rappels pour les approbations en attente
   */
  async sendPendingApprovalReminders(tenantId: string): Promise<number> {
    try {
      // TODO: Intégrer avec le service d'approbation pour obtenir les workflows en attente
      // Pour l'instant, retourner 0
      return 0;
    } catch (error) {
      console.error('Failed to send pending approval reminders:', error);
      return 0;
    }
  }

  /**
   * Envoyer un rappel pour une approbation spécifique
   */
  async sendApprovalReminder(
    tenantId: string,
    context: NotificationContext
  ): Promise<void> {
    try {
      const template = await this.getNotificationTemplate(tenantId, 'reminder');
      if (!template || !context.approver) {
        return;
      }

      // Calculer le nombre de jours en attente
      const daysPending = Math.floor(
        (Date.now() - context.workflow.getData().submittedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const reminderContext = {
        ...context,
        additionalData: {
          ...context.additionalData,
          daysPending
        }
      };

      await this.sendNotification(tenantId, template, reminderContext, context.approver);

      // Log de la notification
      await this.logNotification(tenantId, 'reminder', context.workflow.id!, [context.approver.userId]);
    } catch (error) {
      console.error('Failed to send approval reminder:', error);
    }
  }

  // ==================== Méthodes utilitaires ====================

  /**
   * Envoyer une notification
   */
  private async sendNotification(
    tenantId: string,
    template: NotificationTemplate,
    context: NotificationContext,
    recipient: NotificationRecipient
  ): Promise<void> {
    try {
      // Remplacer les variables dans le template
      const subject = this.replaceVariables(template.subject, context, recipient);
      const bodyHtml = this.replaceVariables(template.bodyHtml, context, recipient);
      const bodyText = this.replaceVariables(template.bodyText, context, recipient);

      // Envoyer l'email via le service d'email
      const result = await this.emailService.sendEmail(
        recipient.email,
        subject,
        {
          html: bodyHtml,
          text: bodyText
        },
        {
          trackingId: `approval-${template.type}-${context.workflow.id}-${Date.now()}`,
          userId: recipient.userId,
          categories: ['approval', template.type],
          priority: this.getEmailPriority(template.type)
        }
      );

      if (!result.success) {
        throw new Error(`Email delivery failed: ${result.messageId || 'Unknown error'}`);
      }

      console.log(`Notification sent successfully to ${recipient.email}`, {
        messageId: result.messageId,
        subject,
        type: template.type,
        workflowId: context.workflow.id
      });

    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error; // Re-throw pour permettre la gestion d'erreur en amont
    }
  }

  /**
   * Remplacer les variables dans un template
   */
  private replaceVariables(
    template: string,
    context: NotificationContext,
    recipient: NotificationRecipient
  ): string {
    let result = template;

    // Variables du workflow
    const workflow = context.workflow.getData();
    result = result.replace(/\{\{workflow\.id\}\}/g, context.workflow.id || '');
    result = result.replace(/\{\{workflow\.status\}\}/g, workflow.status);
    result = result.replace(/\{\{workflow\.currentLevel\}\}/g, workflow.currentLevel.toString());
    result = result.replace(/\{\{workflow\.totalLevels\}\}/g, workflow.totalLevels.toString());

    // Variables de l'employé
    result = result.replace(/\{\{employee\.name\}\}/g, context.employee.name);
    result = result.replace(/\{\{employee\.email\}\}/g, context.employee.email);

    // Variables de l'approbateur
    if (context.approver) {
      result = result.replace(/\{\{approver\.name\}\}/g, context.approver.name);
      result = result.replace(/\{\{approver\.email\}\}/g, context.approver.email);
    }

    // Variables du destinataire
    result = result.replace(/\{\{recipient\.name\}\}/g, recipient.name);
    result = result.replace(/\{\{recipient\.email\}\}/g, recipient.email);

    // Variables de la feuille de temps
    const timesheetData = workflow.timesheetData;
    result = result.replace(/\{\{timesheet\.totalHours\}\}/g, timesheetData.totalHours.toString());
    result = result.replace(/\{\{timesheet\.totalCost\}\}/g, timesheetData.totalCost.toString());
    result = result.replace(/\{\{timesheet\.billableHours\}\}/g, timesheetData.billableHours.toString());
    result = result.replace(/\{\{timesheet\.billableCost\}\}/g, timesheetData.billableCost.toString());

    // Variables de période
    result = result.replace(/\{\{period\.start\}\}/g, workflow.periodStart.toLocaleDateString('fr-FR'));
    result = result.replace(/\{\{period\.end\}\}/g, workflow.periodEnd.toLocaleDateString('fr-FR'));

    // Variables de dates
    result = result.replace(/\{\{submittedAt\}\}/g, workflow.submittedAt.toLocaleDateString('fr-FR'));

    if (workflow.completedAt) {
      result = result.replace(/\{\{completedAt\}\}/g, workflow.completedAt.toLocaleDateString('fr-FR'));
    }

    // Variables additionnelles
    if (context.additionalData) {
      Object.entries(context.additionalData).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, String(value));
      });
    }

    return result;
  }

  /**
   * Logger une notification
   */
  private async logNotification(
    tenantId: string,
    type: string,
    workflowId: string,
    recipients: string[]
  ): Promise<void> {
    try {
      const logEntry = {
        tenantId,
        type,
        workflowId,
        recipients,
        sentAt: new Date(),
        status: 'sent'
      };

      await this.notificationLogsCollection.add(logEntry);
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  /**
   * Obtenir un template par défaut
   */
  private getDefaultTemplate(type: NotificationTemplate['type'], language: string): NotificationTemplate {
    const defaultTemplates: Record<string, Partial<NotificationTemplate>> = {
      submission: {
        subject: 'Feuille de temps soumise pour approbation',
        bodyText: 'Bonjour {{recipient.name}},\n\nVotre feuille de temps pour la période du {{period.start}} au {{period.end}} a été soumise pour approbation.\n\nTotal des heures: {{timesheet.totalHours}}h\nHeures facturables: {{timesheet.billableHours}}h\n\nCordialement',
        bodyHtml: '<p>Bonjour {{recipient.name}},</p><p>Votre feuille de temps pour la période du {{period.start}} au {{period.end}} a été soumise pour approbation.</p><p><strong>Total des heures:</strong> {{timesheet.totalHours}}h<br><strong>Heures facturables:</strong> {{timesheet.billableHours}}h</p><p>Cordialement</p>'
      },
      approval_request: {
        subject: 'Demande d\'approbation de feuille de temps - {{employee.name}}',
        bodyText: 'Bonjour {{recipient.name}},\n\nUne feuille de temps nécessite votre approbation.\n\nEmployé: {{employee.name}}\nPériode: {{period.start}} au {{period.end}}\nTotal des heures: {{timesheet.totalHours}}h\n\nVeuillez vous connecter pour approuver ou rejeter cette demande.\n\nCordialement',
        bodyHtml: '<p>Bonjour {{recipient.name}},</p><p>Une feuille de temps nécessite votre approbation.</p><p><strong>Employé:</strong> {{employee.name}}<br><strong>Période:</strong> {{period.start}} au {{period.end}}<br><strong>Total des heures:</strong> {{timesheet.totalHours}}h</p><p>Veuillez vous connecter pour approuver ou rejeter cette demande.</p><p>Cordialement</p>'
      },
      approved: {
        subject: 'Feuille de temps approuvée',
        bodyText: 'Bonjour {{recipient.name}},\n\nVotre feuille de temps pour la période du {{period.start}} au {{period.end}} a été approuvée.\n\nCordialement',
        bodyHtml: '<p>Bonjour {{recipient.name}},</p><p>Votre feuille de temps pour la période du {{period.start}} au {{period.end}} a été approuvée.</p><p>Cordialement</p>'
      },
      rejected: {
        subject: 'Feuille de temps rejetée',
        bodyText: 'Bonjour {{recipient.name}},\n\nVotre feuille de temps pour la période du {{period.start}} au {{period.end}} a été rejetée.\n\nRaison: {{rejectionReason}}\n{{rejectionComments}}\n\nVeuillez corriger et soumettre à nouveau.\n\nCordialement',
        bodyHtml: '<p>Bonjour {{recipient.name}},</p><p>Votre feuille de temps pour la période du {{period.start}} au {{period.end}} a été rejetée.</p><p><strong>Raison:</strong> {{rejectionReason}}</p><p>{{rejectionComments}}</p><p>Veuillez corriger et soumettre à nouveau.</p><p>Cordialement</p>'
      },
      escalated: {
        subject: 'Escalation de feuille de temps - {{employee.name}}',
        bodyText: 'Bonjour {{recipient.name}},\n\nUne feuille de temps a été escalée vers vous pour approbation.\n\nEmployé: {{employee.name}}\nPériode: {{period.start}} au {{period.end}}\nRaison de l\'escalation: {{escalationReason}}\n\nCordialement',
        bodyHtml: '<p>Bonjour {{recipient.name}},</p><p>Une feuille de temps a été escalée vers vous pour approbation.</p><p><strong>Employé:</strong> {{employee.name}}<br><strong>Période:</strong> {{period.start}} au {{period.end}}<br><strong>Raison de l\'escalation:</strong> {{escalationReason}}</p><p>Cordialement</p>'
      },
      reminder: {
        subject: 'Rappel: Approbation de feuille de temps en attente',
        bodyText: 'Bonjour {{recipient.name}},\n\nUne feuille de temps est en attente de votre approbation depuis {{daysPending}} jour(s).\n\nEmployé: {{employee.name}}\nPériode: {{period.start}} au {{period.end}}\n\nVeuillez vous connecter pour traiter cette demande.\n\nCordialement',
        bodyHtml: '<p>Bonjour {{recipient.name}},</p><p>Une feuille de temps est en attente de votre approbation depuis {{daysPending}} jour(s).</p><p><strong>Employé:</strong> {{employee.name}}<br><strong>Période:</strong> {{period.start}} au {{period.end}}</p><p>Veuillez vous connecter pour traiter cette demande.</p><p>Cordialement</p>'
      },
      delegation: {
        subject: 'Délégation d\'approbation de feuille de temps',
        bodyText: 'Bonjour {{recipient.name}},\n\n{{originalApprover}} vous a délégué l\'approbation d\'une feuille de temps.\n\nEmployé: {{employee.name}}\nPériode: {{period.start}} au {{period.end}}\nCommentaires: {{delegationComments}}\n\nCordialement',
        bodyHtml: '<p>Bonjour {{recipient.name}},</p><p>{{originalApprover}} vous a délégué l\'approbation d\'une feuille de temps.</p><p><strong>Employé:</strong> {{employee.name}}<br><strong>Période:</strong> {{period.start}} au {{period.end}}<br><strong>Commentaires:</strong> {{delegationComments}}</p><p>Cordialement</p>'
      }
    };

    const template = defaultTemplates[type];
    if (!template) {
      throw new ValidationError(`No default template found for type: ${type}`);
    }

    return {
      tenantId: '',
      type,
      name: `Default ${type} template`,
      description: `Default template for ${type} notifications`,
      subject: template.subject || '',
      bodyHtml: template.bodyHtml || '',
      bodyText: template.bodyText || '',
      isActive: true,
      language,
      availableVariables: this.getAvailableVariables(type),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  /**
   * Obtenir les variables disponibles pour un type de template
   */
  private getAvailableVariables(type: NotificationTemplate['type']): string[] {
    const baseVariables = [
      'recipient.name',
      'recipient.email',
      'employee.name',
      'employee.email',
      'workflow.id',
      'workflow.status',
      'workflow.currentLevel',
      'workflow.totalLevels',
      'timesheet.totalHours',
      'timesheet.totalCost',
      'timesheet.billableHours',
      'timesheet.billableCost',
      'period.start',
      'period.end',
      'submittedAt'
    ];

    const typeSpecificVariables: Record<string, string[]> = {
      approval_request: ['approver.name', 'approver.email'],
      rejected: ['rejectionReason', 'rejectionComments'],
      escalated: ['escalationReason', 'escalatedTo'],
      reminder: ['daysPending'],
      delegation: ['originalApprover', 'delegatedTo', 'delegationComments']
    };

    return [...baseVariables, ...(typeSpecificVariables[type] || [])];
  }

  /**
   * Obtenir la priorité d'email selon le type de notification
   */
  private getEmailPriority(type: NotificationTemplate['type']): number {
    const priorityMap: Record<NotificationTemplate['type'], number> = {
      submission: 3,        // Normal
      approval_request: 2,  // Élevée
      approved: 3,          // Normal
      rejected: 2,          // Élevée
      escalated: 1,         // Critique
      reminder: 4,          // Faible
      delegation: 2         // Élevée
    };

    return priorityMap[type] || 3;
  }

  // ==================== Méthodes d'administration ====================

  /**
   * Lister tous les templates pour un tenant
   */
  async listNotificationTemplates(tenantId: string): Promise<NotificationTemplate[]> {
    try {
      const query = await this.templatesCollection
        .where('tenantId', '==', tenantId)
        .orderBy('type')
        .orderBy('language')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as NotificationTemplate));
    } catch (error) {
      throw new Error(`Failed to list notification templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques de notifications
   */
  async getNotificationStatistics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSent: number;
    byType: Record<string, number>;
    deliveryRate: number;
    averageResponseTime: number;
  }> {
    try {
      let query = this.notificationLogsCollection
        .where('tenantId', '==', tenantId);

      if (startDate) {
        query = query.where('sentAt', '>=', startDate);
      }

      if (endDate) {
        query = query.where('sentAt', '<=', endDate);
      }

      const result = await query.get();
      const logs = result.docs.map(doc => doc.data());

      const stats = {
        totalSent: logs.length,
        byType: {} as Record<string, number>,
        deliveryRate: 100, // Assumé 100% pour l'instant
        averageResponseTime: 0 // À calculer avec les données d'approbation
      };

      logs.forEach(log => {
        stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get notification statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const approvalNotificationsService = new ApprovalNotificationsService();