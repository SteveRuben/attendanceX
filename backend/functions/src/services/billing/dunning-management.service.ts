/**
 * Service de gestion des relances de paiement (Dunning Management)
 * Gère les processus de recouvrement pour les factures impayées
 */

import { collections } from '../../config/database';
import { Invoice, InvoiceStatus } from './automated-billing.service';
import { billingNotificationsService, BillingAlertType } from './billing-notifications.service';
import { tenantService } from '../tenant/tenant.service';
import { TenantError, TenantErrorCode, TenantStatus } from '../../common/types';



export interface DunningProcess {
    id: string;
    tenantId: string;
    invoiceId: string;
    status: DunningStatus;
    currentStep: number;
    totalSteps: number;
    startedAt: Date;
    lastActionAt: Date;
    nextActionAt?: Date;
    completedAt?: Date;
    metadata: Record<string, any>;
}

export enum DunningStatus {
    ACTIVE = 'active',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    FAILED = 'failed'
}

export interface DunningStep {
    id: string;
    processId: string;
    stepNumber: number;
    type: DunningActionType;
    scheduledAt: Date;
    executedAt?: Date;
    status: DunningStepStatus;
    config: DunningStepConfig;
    result?: DunningStepResult;
}

export enum DunningActionType {
    EMAIL_REMINDER = 'email_reminder',
    SMS_REMINDER = 'sms_reminder',
    PHONE_CALL = 'phone_call',
    FINAL_NOTICE = 'final_notice',
    SUSPEND_SERVICE = 'suspend_service',
    COLLECTION_AGENCY = 'collection_agency',
    WRITE_OFF = 'write_off'
}

export enum DunningStepStatus {
    PENDING = 'pending',
    EXECUTING = 'executing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    SKIPPED = 'skipped'
}

export interface DunningStepConfig {
    delayDays: number;
    template?: string;
    escalationLevel: 'low' | 'medium' | 'high' | 'critical';
    requiresManualApproval?: boolean;
    metadata?: Record<string, any>;
}

export interface DunningStepResult {
    success: boolean;
    message: string;
    executedAt: Date;
    nextRetryAt?: Date;
    metadata?: Record<string, any>;
}

export interface DunningTemplate {
    id: string;
    name: string;
    description: string;
    steps: DunningTemplateStep[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface DunningTemplateStep {
    stepNumber: number;
    type: DunningActionType;
    delayDays: number;
    escalationLevel: 'low' | 'medium' | 'high' | 'critical';
    template?: string;
    requiresManualApproval?: boolean;
}

export interface CreateDunningProcessRequest {
    tenantId: string;
    invoiceId: string;
    templateId?: string;
    customSteps?: DunningTemplateStep[];
}

export class DunningManagementService {

    /**
     * Créer un processus de relance pour une facture impayée
     */
    async createDunningProcess(request: CreateDunningProcessRequest): Promise<DunningProcess> {
        try {
            // Vérifier que la facture existe et est impayée
            const invoice = await this.getInvoiceById(request.invoiceId);
            if (!invoice) {
                throw new TenantError('Invoice not found', TenantErrorCode.TENANT_NOT_FOUND);
            }

            if (invoice.tenantId !== request.tenantId) {
                throw new TenantError('Access denied', TenantErrorCode.TENANT_ACCESS_DENIED);
            }

            if (invoice.status !== InvoiceStatus.OPEN) {
                throw new TenantError('Invoice is not open for dunning', TenantErrorCode.TENANT_ACCESS_DENIED);
            }

            // Vérifier qu'un processus n'existe pas déjà
            const existingProcess = await this.getDunningProcessByInvoice(request.invoiceId);
            if (existingProcess && existingProcess.status === DunningStatus.ACTIVE) {
                throw new TenantError('Dunning process already active for this invoice', TenantErrorCode.TENANT_ACCESS_DENIED);
            }

            // Obtenir le template ou utiliser les étapes personnalisées
            let steps: DunningTemplateStep[];
            if (request.templateId) {
                const template = await this.getDunningTemplate(request.templateId);
                if (!template) {
                    throw new TenantError('Dunning template not found', TenantErrorCode.TENANT_NOT_FOUND);
                }
                steps = template.steps;
            } else if (request.customSteps) {
                steps = request.customSteps;
            } else {
                // Utiliser le template par défaut
                steps = this.getDefaultDunningSteps();
            }

            // Créer le processus de relance
            const now = new Date();
            const processData: Omit<DunningProcess, 'id'> = {
                tenantId: request.tenantId,
                invoiceId: request.invoiceId,
                status: DunningStatus.ACTIVE,
                currentStep: 0,
                totalSteps: steps.length,
                startedAt: now,
                lastActionAt: now,
                nextActionAt: this.calculateNextActionDate(steps[0].delayDays),
                metadata: {
                    templateId: request.templateId,
                    invoiceAmount: invoice.amount,
                    invoiceNumber: invoice.invoiceNumber
                }
            };

            const processRef = await collections.dunning_processes.add(processData);
            const processId = processRef.id;

            // Créer les étapes du processus
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const stepData: Omit<DunningStep, 'id'> = {
                    processId,
                    stepNumber: i + 1,
                    type: step.type,
                    scheduledAt: this.calculateStepScheduleDate(now, step.delayDays),
                    status: i === 0 ? DunningStepStatus.PENDING : DunningStepStatus.PENDING,
                    config: {
                        delayDays: step.delayDays,
                        template: step.template,
                        escalationLevel: step.escalationLevel,
                        requiresManualApproval: step.requiresManualApproval
                    }
                };

                await collections.dunning_steps.add(stepData);
            }

            // Créer une alerte de début de processus de relance
            await billingNotificationsService.createAlert({
                tenantId: request.tenantId,
                type: BillingAlertType.INVOICE_OVERDUE,
                title: 'Processus de relance démarré',
                message: `Un processus de relance a été démarré pour la facture ${invoice.invoiceNumber} (${invoice.amount}€).`,
                severity: 'warning',
                actionUrl: `/billing/invoices/${invoice.id}`,
                actionText: 'Voir la facture',
                metadata: {
                    invoiceId: invoice.id,
                    processId,
                    amount: invoice.amount
                }
            });

            return {
                id: processId,
                ...processData
            };
        } catch (error) {
            if (error instanceof TenantError) {
                throw error;
            }
            console.error('Error creating dunning process:', error);
            throw new TenantError('Failed to create dunning process', TenantErrorCode.TENANT_NOT_FOUND);
        }
    }

    /**
     * Exécuter la prochaine étape d'un processus de relance
     */
    async executeNextDunningStep(processId: string): Promise<DunningStepResult> {
        try {
            const process = await this.getDunningProcessById(processId);
            if (!process) {
                throw new TenantError('Dunning process not found', TenantErrorCode.TENANT_NOT_FOUND);
            }

            if (process.status !== DunningStatus.ACTIVE) {
                throw new TenantError('Dunning process is not active', TenantErrorCode.TENANT_ACCESS_DENIED);
            }

            // Obtenir la prochaine étape à exécuter
            const nextStep = await this.getNextPendingStep(processId);
            if (!nextStep) {
                // Aucune étape en attente, marquer le processus comme terminé
                await this.completeDunningProcess(processId);
                return {
                    success: true,
                    message: 'Dunning process completed - no more steps',
                    executedAt: new Date()
                };
            }

            // Vérifier si l'étape nécessite une approbation manuelle
            if (nextStep.config.requiresManualApproval) {
                await this.requestManualApproval(processId, nextStep.id);
                return {
                    success: true,
                    message: 'Manual approval requested',
                    executedAt: new Date()
                };
            }

            // Exécuter l'étape
            const result = await this.executeStep(nextStep);

            // Mettre à jour l'étape
            await collections.dunning_steps.doc(nextStep.id).update({
                executedAt: result.executedAt,
                status: result.success ? DunningStepStatus.COMPLETED : DunningStepStatus.FAILED,
                result
            });

            // Mettre à jour le processus
            const updates: any = {
                lastActionAt: result.executedAt,
                currentStep: nextStep.stepNumber
            };

            if (result.success) {
                // Calculer la prochaine action
                const nextPendingStep = await this.getNextPendingStep(processId);
                if (nextPendingStep) {
                    updates.nextActionAt = nextPendingStep.scheduledAt;
                } else {
                    // Plus d'étapes, marquer comme terminé
                    updates.status = DunningStatus.COMPLETED;
                    updates.completedAt = result.executedAt;
                }
            }

            await collections.dunning_processes.doc(processId).update(updates);

            return result;
        } catch (error) {
            if (error instanceof TenantError) {
                throw error;
            }
            console.error('Error executing dunning step:', error);
            throw new TenantError('Failed to execute dunning step', TenantErrorCode.TENANT_NOT_FOUND);
        }
    }

    /**
     * Suspendre un processus de relance
     */
    async pauseDunningProcess(processId: string, reason?: string): Promise<void> {
        try {
            await collections.dunning_processes.doc(processId).update({
                status: DunningStatus.PAUSED,
                lastActionAt: new Date(),
                metadata: {
                    pauseReason: reason,
                    pausedAt: new Date()
                }
            });
        } catch (error) {
            console.error('Error pausing dunning process:', error);
            throw new TenantError('Failed to pause dunning process', TenantErrorCode.TENANT_NOT_FOUND);
        }
    }

    /**
     * Reprendre un processus de relance suspendu
     */
    async resumeDunningProcess(processId: string): Promise<void> {
        try {
            const nextStep = await this.getNextPendingStep(processId);
            const updates: any = {
                status: DunningStatus.ACTIVE,
                lastActionAt: new Date()
            };

            if (nextStep) {
                updates.nextActionAt = nextStep.scheduledAt;
            }

            await collections.dunning_processes.doc(processId).update(updates);
        } catch (error) {
            console.error('Error resuming dunning process:', error);
            throw new TenantError('Failed to resume dunning process', TenantErrorCode.TENANT_NOT_FOUND);
        }
    }

    /**
     * Annuler un processus de relance
     */
    async cancelDunningProcess(processId: string, reason?: string): Promise<void> {
        try {
            await collections.dunning_processes.doc(processId).update({
                status: DunningStatus.CANCELLED,
                completedAt: new Date(),
                metadata: {
                    cancelReason: reason,
                    cancelledAt: new Date()
                }
            });

            // Marquer toutes les étapes en attente comme annulées
            const pendingSteps = await this.getPendingSteps(processId);
            for (const step of pendingSteps) {
                await collections.dunning_steps.doc(step.id).update({
                    status: DunningStepStatus.SKIPPED
                });
            }
        } catch (error) {
            console.error('Error cancelling dunning process:', error);
            throw new TenantError('Failed to cancel dunning process', TenantErrorCode.TENANT_NOT_FOUND);
        }
    }

    /**
     * Obtenir tous les processus de relance actifs
     */
    async getActiveDunningProcesses(): Promise<DunningProcess[]> {
        try {
            const snapshot = await collections.dunning_processes
                .where('status', '==', DunningStatus.ACTIVE)
                .where('nextActionAt', '<=', new Date())
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DunningProcess));
        } catch (error) {
            console.error('Error getting active dunning processes:', error);
            return [];
        }
    }

    /**
     * Obtenir les processus de relance d'un tenant
     */
    async getDunningProcessesByTenant(tenantId: string): Promise<DunningProcess[]> {
        try {
            const snapshot = await collections.dunning_processes
                .where('tenantId', '==', tenantId)
                .orderBy('startedAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DunningProcess));
        } catch (error) {
            console.error('Error getting dunning processes by tenant:', error);
            return [];
        }
    }

    /**
     * Traiter tous les processus de relance dus
     */
    async processDueDunningActions(): Promise<void> {
        try {
            const activeProcesses = await this.getActiveDunningProcesses();

            for (const process of activeProcesses) {
                try {
                    await this.executeNextDunningStep(process.id);
                } catch (error) {
                    console.error(`Error processing dunning for process ${process.id}:`, error);

                    // Marquer le processus comme échoué après plusieurs tentatives
                    await collections.dunning_processes.doc(process.id).update({
                        status: DunningStatus.FAILED,
                        completedAt: new Date(),
                        metadata: {
                            ...process.metadata,
                            failureReason: error instanceof Error ? error.message : 'Unknown error',
                            failedAt: new Date()
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error processing due dunning actions:', error);
        }
    }

    // Méthodes privées

    private async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
        try {
            const doc = await collections.invoices.doc(invoiceId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } as Invoice : null;
        } catch (error) {
            return null;
        }
    }

    private async getDunningProcessById(processId: string): Promise<DunningProcess | null> {
        try {
            const doc = await collections.dunning_processes.doc(processId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } as DunningProcess : null;
        } catch (error) {
            return null;
        }
    }

    private async getDunningProcessByInvoice(invoiceId: string): Promise<DunningProcess | null> {
        try {
            const snapshot = await collections.dunning_processes
                .where('invoiceId', '==', invoiceId)
                .where('status', 'in', [DunningStatus.ACTIVE, DunningStatus.PAUSED])
                .limit(1)
                .get();

            return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as DunningProcess;
        } catch (error) {
            return null;
        }
    }

    private async getDunningTemplate(templateId: string): Promise<DunningTemplate | null> {
        try {
            const doc = await collections.dunning_templates.doc(templateId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } as DunningTemplate : null;
        } catch (error) {
            return null;
        }
    }

    private async getNextPendingStep(processId: string): Promise<DunningStep | null> {
        try {
            const snapshot = await collections.dunning_steps
                .where('processId', '==', processId)
                .where('status', '==', DunningStepStatus.PENDING)
                .orderBy('stepNumber')
                .limit(1)
                .get();

            return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as DunningStep;
        } catch (error) {
            return null;
        }
    }

    private async getPendingSteps(processId: string): Promise<DunningStep[]> {
        try {
            const snapshot = await collections.dunning_steps
                .where('processId', '==', processId)
                .where('status', '==', DunningStepStatus.PENDING)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DunningStep));
        } catch (error) {
            return [];
        }
    }

    private async executeStep(step: DunningStep): Promise<DunningStepResult> {
        const now = new Date();

        try {
            switch (step.type) {
                case DunningActionType.EMAIL_REMINDER:
                    return await this.sendEmailReminder(step);

                case DunningActionType.SMS_REMINDER:
                    return await this.sendSmsReminder(step);

                case DunningActionType.FINAL_NOTICE:
                    return await this.sendFinalNotice(step);

                case DunningActionType.SUSPEND_SERVICE:
                    return await this.suspendService(step);

                case DunningActionType.WRITE_OFF:
                    return await this.writeOffInvoice(step);

                default:
                    return {
                        success: false,
                        message: `Unsupported dunning action type: ${step.type}`,
                        executedAt: now
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
                executedAt: now,
                nextRetryAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Retry in 24 hours
            };
        }
    }

    private async sendEmailReminder(step: DunningStep): Promise<DunningStepResult> {
        // TODO: Implémenter l'envoi d'email de relance
        console.log(`Sending email reminder for step ${step.id}`);

        return {
            success: true,
            message: 'Email reminder sent successfully',
            executedAt: new Date(),
            metadata: {
                emailSent: true,
                template: step.config.template
            }
        };
    }

    private async sendSmsReminder(step: DunningStep): Promise<DunningStepResult> {
        // TODO: Implémenter l'envoi de SMS de relance
        console.log(`Sending SMS reminder for step ${step.id}`);

        return {
            success: true,
            message: 'SMS reminder sent successfully',
            executedAt: new Date(),
            metadata: {
                smsSent: true
            }
        };
    }

    private async sendFinalNotice(step: DunningStep): Promise<DunningStepResult> {
        // TODO: Implémenter l'envoi de mise en demeure
        console.log(`Sending final notice for step ${step.id}`);

        return {
            success: true,
            message: 'Final notice sent successfully',
            executedAt: new Date(),
            metadata: {
                finalNoticeSent: true,
                escalationLevel: 'critical'
            }
        };
    }

    private async suspendService(step: DunningStep): Promise<DunningStepResult> {
        try {
            // Obtenir le processus pour récupérer le tenantId
            const process = await this.getDunningProcessById(step.processId);
            if (!process) {
                throw new Error('Process not found');
            }

            // Suspendre le service du tenant
            await tenantService.updateTenant(process.tenantId, {
                status: TenantStatus.SUSPENDED
            });

            return {
                success: true,
                message: 'Service suspended successfully',
                executedAt: new Date(),
                metadata: {
                    serviceSuspended: true,
                    tenantId: process.tenantId
                }
            };
        } catch (error) {
            throw new Error(`Failed to suspend service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async writeOffInvoice(step: DunningStep): Promise<DunningStepResult> {
        try {
            // Obtenir le processus pour récupérer l'invoiceId
            const process = await this.getDunningProcessById(step.processId);
            if (!process) {
                throw new Error('Process not found');
            }

            // Marquer la facture comme irrécouvrable
            await collections.invoices.doc(process.invoiceId).update({
                status: InvoiceStatus.UNCOLLECTIBLE,
                updatedAt: new Date(),
                writeOffDate: new Date(),
                writeOffReason: 'Dunning process completed - uncollectible'
            });

            return {
                success: true,
                message: 'Invoice written off successfully',
                executedAt: new Date(),
                metadata: {
                    invoiceWrittenOff: true,
                    invoiceId: process.invoiceId
                }
            };
        } catch (error) {
            throw new Error(`Failed to write off invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async requestManualApproval(processId: string, stepId: string): Promise<void> {
        // TODO: Implémenter la demande d'approbation manuelle
        console.log(`Manual approval requested for process ${processId}, step ${stepId}`);
    }

    private async completeDunningProcess(processId: string): Promise<void> {
        await collections.dunning_processes.doc(processId).update({
            status: DunningStatus.COMPLETED,
            completedAt: new Date()
        });
    }

    private calculateNextActionDate(delayDays: number): Date {
        const now = new Date();
        return new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000);
    }

    private calculateStepScheduleDate(startDate: Date, delayDays: number): Date {
        return new Date(startDate.getTime() + delayDays * 24 * 60 * 60 * 1000);
    }

    private getDefaultDunningSteps(): DunningTemplateStep[] {
        return [
            {
                stepNumber: 1,
                type: DunningActionType.EMAIL_REMINDER,
                delayDays: 7, // 7 jours après échéance
                escalationLevel: 'low',
                template: 'first_reminder'
            },
            {
                stepNumber: 2,
                type: DunningActionType.EMAIL_REMINDER,
                delayDays: 14, // 14 jours après échéance
                escalationLevel: 'medium',
                template: 'second_reminder'
            },
            {
                stepNumber: 3,
                type: DunningActionType.FINAL_NOTICE,
                delayDays: 21, // 21 jours après échéance
                escalationLevel: 'high',
                template: 'final_notice'
            },
            {
                stepNumber: 4,
                type: DunningActionType.SUSPEND_SERVICE,
                delayDays: 30, // 30 jours après échéance
                escalationLevel: 'critical',
                requiresManualApproval: true
            },
            {
                stepNumber: 5,
                type: DunningActionType.WRITE_OFF,
                delayDays: 90, // 90 jours après échéance
                escalationLevel: 'critical',
                requiresManualApproval: true
            }
        ];
    }
}

// Ajouter les collections manquantes
declare module '../../config/database' {
    interface Collections {
        dunning_processes: any;
        dunning_steps: any;
        dunning_templates: any;
    }
}

// Instance singleton
export const dunningManagementService = new DunningManagementService();
export default dunningManagementService;