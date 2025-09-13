/**
 * Jobs automatisés pour le traitement des relances de paiement
 * Exécute les processus de dunning selon les planifications
 */

import { dunningManagementService } from '../services/billing/dunning-management.service';
import { Invoice, InvoiceStatus } from '../services/billing/automated-billing.service';
import { collections } from '../config/database';

export class DunningProcessingJobs {

  /**
   * Job principal pour traiter toutes les relances dues
   * À exécuter quotidiennement
   */
  static async processDueDunningActions(): Promise<void> {
    try {
      console.log('Starting dunning processing job...');

      // Traiter les processus de relance actifs
      await dunningManagementService.processDueDunningActions();

      // Créer de nouveaux processus pour les factures en retard
      await DunningProcessingJobs.createDunningForOverdueInvoices();

      console.log('Dunning processing job completed successfully');
    } catch (error) {
      console.error('Error in dunning processing job:', error);
      throw error;
    }
  }

  /**
   * Créer des processus de relance pour les factures en retard
   */
  static async createDunningForOverdueInvoices(): Promise<void> {
    try {
      console.log('Checking for overdue invoices...');

      const now = new Date();

      // Obtenir toutes les factures ouvertes en retard
      const overdueInvoicesSnapshot = await collections.invoices
        .where('status', '==', InvoiceStatus.OPEN)
        .where('dueDate', '<', now)
        .get();

      console.log(`Found ${overdueInvoicesSnapshot.size} overdue invoices`);

      for (const invoiceDoc of overdueInvoicesSnapshot.docs) {
        const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice;

        try {
          // Vérifier si un processus de relance existe déjà
          const existingProcessSnapshot = await collections.dunning_processes
            .where('invoiceId', '==', invoice.id)
            .where('status', 'in', ['active', 'paused'])
            .limit(1)
            .get();

          if (!existingProcessSnapshot.empty) {
            console.log(`Dunning process already exists for invoice ${invoice.id}`);
            continue;
          }

          // Créer un nouveau processus de relance
          await dunningManagementService.createDunningProcess({
            tenantId: invoice.tenantId,
            invoiceId: invoice.id
          });

          console.log(`Created dunning process for invoice ${invoice.id}`);
        } catch (error) {
          console.error(`Error creating dunning process for invoice ${invoice.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error creating dunning for overdue invoices:', error);
      throw error;
    }
  }

  /**
   * Job pour nettoyer les anciens processus de relance
   * À exécuter hebdomadairement
   */
  static async cleanupOldDunningProcesses(): Promise<void> {
    try {
      console.log('Starting dunning cleanup job...');

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Supprimer les processus terminés depuis plus de 6 mois
      const oldProcessesSnapshot = await collections.dunning_processes
        .where('status', 'in', ['completed', 'cancelled', 'failed'])
        .where('completedAt', '<', sixMonthsAgo)
        .get();

      console.log(`Found ${oldProcessesSnapshot.size} old dunning processes to cleanup`);

      for (const processDoc of oldProcessesSnapshot.docs) {
        try {
          // Supprimer les étapes associées
          const stepsSnapshot = await collections.dunning_steps
            .where('processId', '==', processDoc.id)
            .get();

          for (const stepDoc of stepsSnapshot.docs) {
            await stepDoc.ref.delete();
          }

          // Supprimer le processus
          await processDoc.ref.delete();

          console.log(`Cleaned up dunning process ${processDoc.id}`);
        } catch (error) {
          console.error(`Error cleaning up dunning process ${processDoc.id}:`, error);
        }
      }

      console.log('Dunning cleanup job completed successfully');
    } catch (error) {
      console.error('Error in dunning cleanup job:', error);
      throw error;
    }
  }

  /**
   * Job pour générer des rapports de relance
   * À exécuter mensuellement
   */
  static async generateDunningReports(): Promise<void> {
    try {
      console.log('Generating dunning reports...');

      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Statistiques des processus de relance du mois dernier
      const processesSnapshot = await collections.dunning_processes
        .where('startedAt', '>=', lastMonth)
        .where('startedAt', '<', thisMonth)
        .get();

      const stats = {
        totalProcesses: processesSnapshot.size,
        completedProcesses: 0,
        activeProcesses: 0,
        cancelledProcesses: 0,
        failedProcesses: 0,
        totalRecovered: 0,
        totalWrittenOff: 0
      };

      for (const processDoc of processesSnapshot.docs) {
        const process = processDoc.data();

        switch (process.status) {
          case 'completed':
            stats.completedProcesses++;
            break;
          case 'active':
          case 'paused':
            stats.activeProcesses++;
            break;
          case 'cancelled':
            stats.cancelledProcesses++;
            break;
          case 'failed':
            stats.failedProcesses++;
            break;
        }

        // Calculer les montants récupérés et passés en perte
        if (process.metadata?.invoiceAmount) {
          if (process.status === 'completed') {
            // Vérifier si la facture a été payée ou passée en perte
            const invoice = await collections.invoices.doc(process.invoiceId).get();
            if (invoice.exists) {
              const invoiceData = invoice.data();
              if (invoiceData.status === 'paid') {
                stats.totalRecovered += invoiceData.amount;
              } else if (invoiceData.status === 'uncollectible') {
                stats.totalWrittenOff += invoiceData.amount;
              }
            }
          }
        }
      }

      // Sauvegarder le rapport
      const reportData = {
        period: {
          start: lastMonth,
          end: thisMonth
        },
        stats,
        generatedAt: now
      };

      await collections.dunning_reports.add(reportData);

      console.log('Dunning report generated:', stats);
    } catch (error) {
      console.error('Error generating dunning reports:', error);
      throw error;
    }
  }

  /**
   * Job pour envoyer des notifications de relance en attente
   */
  static async sendDunningNotifications(): Promise<void> {
    try {
      console.log('Sending dunning notifications...');

      // Obtenir les processus avec des étapes en attente d'approbation manuelle
      const pendingApprovalSnapshot = await collections.dunning_steps
        .where('status', '==', 'pending')
        .where('config.requiresManualApproval', '==', true)
        .get();

      for (const stepDoc of pendingApprovalSnapshot.docs) {
        const step = stepDoc.data();

        try {
          // Obtenir le processus associé
          const processDoc = await collections.dunning_processes.doc(step.processId).get();
          if (!processDoc.exists) {continue;}

          // @ts-ignore
          const process = processDoc.data();

          // TODO: Envoyer une notification aux administrateurs
          console.log(`Manual approval needed for dunning step ${stepDoc.id} (process ${step.processId})`);

          // Créer une alerte pour l'approbation manuelle
          // Cette logique pourrait être étendue pour envoyer des emails aux administrateurs

        } catch (error) {
          console.error(`Error processing approval notification for step ${stepDoc.id}:`, error);
        }
      }

      console.log('Dunning notifications sent successfully');
    } catch (error) {
      console.error('Error sending dunning notifications:', error);
      throw error;
    }
  }

  /**
   * Job pour vérifier la cohérence des données de relance
   */
  static async validateDunningData(): Promise<void> {
    try {
      console.log('Validating dunning data consistency...');

      const issues: string[] = [];

      // Vérifier les processus orphelins (sans facture associée)
      const processesSnapshot = await collections.dunning_processes.get();

      for (const processDoc of processesSnapshot.docs) {
        const process = processDoc.data();

        // Vérifier que la facture existe
        const invoiceDoc = await collections.invoices.doc(process.invoiceId).get();
        if (!invoiceDoc.exists) {
          issues.push(`Orphaned dunning process ${processDoc.id}: invoice ${process.invoiceId} not found`);

          // Marquer le processus comme échoué
          await processDoc.ref.update({
            status: 'failed',
            completedAt: new Date(),
            metadata: {
              ...process.metadata,
              failureReason: 'Associated invoice not found',
              validationFailed: true
            }
          });
        }
      }

      // Vérifier les étapes orphelines (sans processus associé)
      const stepsSnapshot = await collections.dunning_steps.get();

      for (const stepDoc of stepsSnapshot.docs) {
        const step = stepDoc.data();

        const processDoc = await collections.dunning_processes.doc(step.processId).get();
        if (!processDoc.exists) {
          issues.push(`Orphaned dunning step ${stepDoc.id}: process ${step.processId} not found`);

          // Supprimer l'étape orpheline
          await stepDoc.ref.delete();
        }
      }

      if (issues.length > 0) {
        console.warn('Dunning data validation issues found:', issues);
      } else {
        console.log('Dunning data validation completed successfully - no issues found');
      }
    } catch (error) {
      console.error('Error validating dunning data:', error);
      throw error;
    }
  }
}

// Ajouter les collections manquantes
declare module '../config/database' {
  interface Collections {
    dunning_reports: any;
  }
}

export default DunningProcessingJobs;