import { collections, db, generateId } from '../../config';
import { logger } from 'firebase-functions';
import { createError } from '../../middleware/errorHandler';
import { campaignRecipientService } from './campaign-recipient.service';
import { CampaignRecipientList, EmailCampaignErrorCodes, EmailRecipient, EmailUnsubscribe, UnsubscribeRequest } from '../../common/types';

export interface ImportRecipientsRequest {
  recipients: {
    email: string;
    firstName?: string;
    lastName?: string;
    customData?: Record<string, any>;
  }[];
  listName: string;
  organizationId: string;
  validateEmails?: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: { email: string; reason: string }[];
  recipientList: CampaignRecipientList;
}

export class RecipientListManagementService {

  /**
   * Save recipient list to database
   */
  async saveRecipientList(
    organizationId: string,
    recipientList: CampaignRecipientList
  ): Promise<void> {
    try {
      await collections.campaign_recipient_lists.doc(recipientList.id).set({
        ...recipientList,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      logger.info(`Recipient list saved: ${recipientList.id} with ${recipientList.totalCount} recipients`);
    } catch (error) {
      logger.error('Error saving recipient list:', error);
      throw createError(
        'Failed to save recipient list',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { recipientListId: recipientList.id, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get recipient list by ID
   */
  async getRecipientList(
    listId: string,
    organizationId: string
  ): Promise<CampaignRecipientList | null> {
    try {
      const doc = await collections.campaign_recipient_lists.doc(listId).get();

      if (!doc.exists) {
        return null;
      }

      const listData = doc.data() as any;

      // Verify organization access
      if (listData.organizationId !== organizationId) {
        throw createError(
          'Recipient list not found',
          404,
          EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND
        );
      }

      return listData as CampaignRecipientList;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Recipient list not found')) {
        throw error;
      }

      logger.error('Error getting recipient list:', error);
      throw createError(
        'Failed to get recipient list',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { listId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Import external recipients
   */
  async importRecipients(request: ImportRecipientsRequest): Promise<ImportResult> {
    try {
      const imported: EmailRecipient[] = [];
      const errors: { email: string; reason: string }[] = [];
      let skipped = 0;

      // Process each recipient
      for (const recipientData of request.recipients) {
        try {
          // Validate email (if enabled)
          if (request.validateEmails !== false && !this.isValidEmail(recipientData.email)) {
            errors.push({ email: recipientData.email, reason: 'Invalid email format' });
            continue;
          }

          // Check if already unsubscribed
          const isUnsubscribed = await this.isEmailUnsubscribed(
            request.organizationId,
            recipientData.email
          );

          if (isUnsubscribed) {
            skipped++;
            continue;
          }

          // Create recipient
          const recipient: EmailRecipient = {
            email: recipientData.email,
            firstName: recipientData.firstName || '',
            lastName: recipientData.lastName || '',
            personalizations: {
              ...recipientData.customData,
              source: 'import',
              importedAt: new Date()
            },
            unsubscribed: false,
            bounced: false
          };

          imported.push(recipient);
        } catch (error) {
          errors.push({
            email: recipientData.email,
            reason: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Deduplicate recipients
      const deduplicatedRecipients = campaignRecipientService.deduplicateRecipients(imported);

      // Create recipient list
      const recipientList: CampaignRecipientList = {
        id: generateId('recip_'),
        name: request.listName,
        criteria: {
          excludeUnsubscribed: true,
          customFilters: [{ field: 'source', operator: 'equals', value: 'import' }]
        },
        recipients: deduplicatedRecipients,
        totalCount: deduplicatedRecipients.length,
        lastUpdated: new Date()
      };

      // Save to database
      await this.saveRecipientList(request.organizationId, recipientList);

      const result: ImportResult = {
        imported: deduplicatedRecipients.length,
        skipped,
        errors,
        recipientList
      };

      logger.info(`Imported ${result.imported} recipients, skipped ${result.skipped}, errors: ${result.errors.length}`);

      return result;
    } catch (error) {
      logger.error('Error importing recipients:', error);
      throw createError(
        'Failed to import recipients',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Handle unsubscribe request
   */
  async handleUnsubscribe(request: UnsubscribeRequest): Promise<void> {
    try {
      // Validate and decode unsubscribe token
      const tokenData = await this.validateUnsubscribeToken(request.token);

      if (!tokenData) {
        throw createError(
          'Invalid unsubscribe token',
          400,
          EmailCampaignErrorCodes.UNSUBSCRIBE_TOKEN_INVALID
        );
      }

      // Check if already unsubscribed
      const existingUnsubscribe = await collections.email_unsubscribes
        .where('organizationId', '==', tokenData.organizationId)
        .where('email', '==', tokenData.email)
        .limit(1)
        .get();

      if (!existingUnsubscribe.empty) {
        // Already unsubscribed, just return success
        return;
      }

      // Create unsubscribe record
      const unsubscribe: EmailUnsubscribe = {
        id: generateId('unsub_'),
        organizationId: tokenData.organizationId,
        email: tokenData.email,
        userId: tokenData.userId,
        reason: request.reason,
        unsubscribedAt: new Date(),
        campaignId: tokenData.campaignId,
        ipAddress: tokenData.ipAddress,
        userAgent: tokenData.userAgent
      };

      await collections.email_unsubscribes.doc(unsubscribe.id).set(unsubscribe);

      logger.info(`Email unsubscribed: ${tokenData.email} from organization: ${tokenData.organizationId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid unsubscribe token')) {
        throw error;
      }

      logger.error('Error handling unsubscribe:', error);
      throw createError(
        'Failed to process unsubscribe request',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Generate unsubscribe token
   */
  async generateUnsubscribeToken(
    organizationId: string,
    email: string,
    campaignId?: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    try {
      const tokenData = {
        organizationId,
        email,
        campaignId,
        userId,
        ipAddress,
        userAgent,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      };

      // Store token data
      const tokenId = generateId('token_');
      await collections.unsubscribe_tokens.doc(tokenId).set(tokenData);

      // Return base64 encoded token ID
      return Buffer.from(tokenId).toString('base64');
    } catch (error) {
      logger.error('Error generating unsubscribe token:', error);
      throw createError(
        'Failed to generate unsubscribe token',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { email, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Validate unsubscribe token
   */
  private async validateUnsubscribeToken(token: string): Promise<any | null> {
    try {
      // Decode token
      const tokenId = Buffer.from(token, 'base64').toString();

      // Get token data
      const doc = await collections.unsubscribe_tokens.doc(tokenId).get();

      if (!doc.exists) {
        return null;
      }

      const tokenData = doc.data();

      // Check if token is expired
      if (tokenData && tokenData.expiresAt && new Date() > tokenData.expiresAt.toDate()) {
        return null;
      }

      return tokenData;
    } catch (error) {
      logger.error('Error validating unsubscribe token:', error);
      return null;
    }
  }

  /**
   * Check if email is unsubscribed
   */
  async isEmailUnsubscribed(organizationId: string, email: string): Promise<boolean> {
    try {
      const snapshot = await collections.email_unsubscribes
        .where('organizationId', '==', organizationId)
        .where('email', '==', email)
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      logger.error('Error checking unsubscribe status:', error);
      return false; // Default to not unsubscribed if check fails
    }
  }

  /**
   * Get unsubscribed emails for organization
   */
  async getUnsubscribedEmails(
    organizationId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ unsubscribes: EmailUnsubscribe[]; total: number }> {
    try {
      const query = collections.email_unsubscribes
        .where('organizationId', '==', organizationId)
        .orderBy('unsubscribedAt', 'desc')
        .offset(offset)
        .limit(limit);

      const snapshot = await query.get();
      const unsubscribes = snapshot.docs.map(doc => doc.data() as EmailUnsubscribe);

      // Get total count
      const countQuery = collections.email_unsubscribes
        .where('organizationId', '==', organizationId);
      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;

      return { unsubscribes, total };
    } catch (error) {
      logger.error('Error getting unsubscribed emails:', error);
      throw createError(
        'Failed to get unsubscribed emails',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { organizationId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Resubscribe email (GDPR compliance)
   */
  async resubscribeEmail(organizationId: string, email: string): Promise<void> {
    try {
      const snapshot = await collections.email_unsubscribes
        .where('organizationId', '==', organizationId)
        .where('email', '==', email)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logger.info(`Email resubscribed: ${email} for organization: ${organizationId}`);
    } catch (error) {
      logger.error('Error resubscribing email:', error);
      throw createError(
        'Failed to resubscribe email',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { organizationId, email, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Delete all data for email (GDPR compliance)
   */
  async deleteEmailData(organizationId: string, email: string): Promise<void> {
    try {
      const batch = db.batch();

      // Delete from unsubscribes
      const unsubscribesSnapshot = await collections.email_unsubscribes
        .where('organizationId', '==', organizationId)
        .where('email', '==', email)
        .get();

      unsubscribesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete from campaign deliveries
      const deliveriesSnapshot = await collections.campaign_deliveries
        .where('organizationId', '==', organizationId)
        .where('recipientEmail', '==', email)
        .get();

      deliveriesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Anonymize in recipient lists
      const recipientListsSnapshot = await collections.campaign_recipient_lists
        .where('organizationId', '==', organizationId)
        .get();

      recipientListsSnapshot.docs.forEach(doc => {
        const listData = doc.data() as any;
        if (listData.recipients) {
          const updatedRecipients = listData.recipients.map((recipient: EmailRecipient) => {
            if (recipient.email === email) {
              return {
                ...recipient,
                email: `anonymized_${Date.now()}@deleted.local`,
                firstName: '[DELETED]',
                lastName: '[DELETED]',
                personalizations: { deleted: true }
              };
            }
            return recipient;
          });

          batch.update(doc.ref, { recipients: updatedRecipients });
        }
      });

      await batch.commit();

      logger.info(`Email data deleted: ${email} for organization: ${organizationId}`);
    } catch (error) {
      logger.error('Error deleting email data:', error);
      throw createError(
        'Failed to delete email data',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { organizationId, email, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Update recipient list
   */
  async updateRecipientList(
    listId: string,
    organizationId: string,
    updates: Partial<CampaignRecipientList>
  ): Promise<CampaignRecipientList> {
    try {
      const existingList = await this.getRecipientList(listId, organizationId);

      if (!existingList) {
        throw createError(
          'Recipient list not found',
          404,
          EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND
        );
      }

      const updateData = {
        ...updates,
        lastUpdated: new Date(),
        updatedAt: new Date()
      };

      await collections.campaign_recipient_lists.doc(listId).update(updateData);

      // Get updated list
      const updatedList = await this.getRecipientList(listId, organizationId);

      logger.info(`Recipient list updated: ${listId}`);

      return updatedList!;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Recipient list not found')) {
        throw error;
      }

      logger.error('Error updating recipient list:', error);
      throw createError(
        'Failed to update recipient list',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { listId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Resubscribe a recipient
   */
  async resubscribeRecipient(
    organizationId: string,
    email: string,
    userId: string
  ): Promise<void> {
    try {
      // Remove from unsubscribe list
      const unsubscribeQuery = await collections.campaign_unsubscribes
        .where('organizationId', '==', organizationId)
        .where('email', '==', email)
        .get();

      const batch = db.batch();
      unsubscribeQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`Recipient resubscribed: ${email}`);
    } catch (error) {
      logger.error('Error resubscribing recipient:', error);
      throw new Error('Failed to resubscribe recipient');
    }
  }

  /**
   * Delete recipient list
   */
  async deleteRecipientList(listId: string, organizationId: string): Promise<void> {
    try {
      const existingList = await this.getRecipientList(listId, organizationId);

      if (!existingList) {
        throw createError(
          'Recipient list not found',
          404,
          EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND
        );
      }

      await collections.campaign_recipient_lists.doc(listId).delete();

      logger.info(`Recipient list deleted: ${listId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Recipient list not found')) {
        throw error;
      }

      logger.error('Error deleting recipient list:', error);
      throw createError(
        'Failed to delete recipient list',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { listId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
}

export const recipientListManagementService = new RecipientListManagementService();