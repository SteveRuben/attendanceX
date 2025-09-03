import { 
  RecipientCriteria, 
  EmailRecipient, 
  CampaignRecipientList,
  EmailCampaignErrorCodes,
  CustomFilter
} from '@attendance-x/shared';
import { collections, generateId } from '../config/database';
import { logger } from 'firebase-functions';
import { createError } from '../middleware/errorHandler';

export interface RecipientPreviewResult {
  recipients: EmailRecipient[];
  totalCount: number;
  criteria: RecipientCriteria;
}

export class CampaignRecipientService {

  /**
   * Build recipient list based on criteria
   */
  async buildRecipientList(
    organizationId: string,
    criteria: RecipientCriteria,
    listName?: string
  ): Promise<CampaignRecipientList> {
    try {
      const recipients = await this.selectRecipients(organizationId, criteria);
      
      const recipientList: CampaignRecipientList = {
        id: generateId('recip_'),
        name: listName || `Recipients ${new Date().toISOString()}`,
        criteria,
        recipients,
        totalCount: recipients.length,
        lastUpdated: new Date()
      };

      logger.info(`Built recipient list with ${recipients.length} recipients for organization: ${organizationId}`);
      
      return recipientList;
    } catch (error) {
      logger.error('Error building recipient list:', error);
      throw createError(
        'Failed to build recipient list',
        500,
        EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND,
        { organizationId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Preview recipients based on criteria
   */
  async previewRecipients(
    organizationId: string,
    criteria: RecipientCriteria,
    limit: number = 50,
    offset: number = 0
  ): Promise<RecipientPreviewResult> {
    try {
      const allRecipients = await this.selectRecipients(organizationId, criteria);
      
      const paginatedRecipients = allRecipients.slice(offset, offset + limit);
      
      return {
        recipients: paginatedRecipients,
        totalCount: allRecipients.length,
        criteria
      };
    } catch (error) {
      logger.error('Error previewing recipients:', error);
      throw createError(
        'Failed to preview recipients',
        500,
        EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND,
        { organizationId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get recipients by criteria (simple version)
   */
  async getRecipientsByCriteria(
    organizationId: string,
    criteria: RecipientCriteria,
    limit?: number
  ): Promise<EmailRecipient[]> {
    try {
      const allRecipients = await this.selectRecipients(organizationId, criteria);
      
      if (limit && limit > 0) {
        return allRecipients.slice(0, limit);
      }
      
      return allRecipients;
    } catch (error) {
      logger.error('Error getting recipients by criteria:', error);
      throw createError(
        'Failed to get recipients',
        500,
        EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND,
        { organizationId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Select recipients based on criteria
   */
  private async selectRecipients(
    organizationId: string,
    criteria: RecipientCriteria
  ): Promise<EmailRecipient[]> {
    const recipients: EmailRecipient[] = [];
    const processedEmails = new Set<string>();

    // Get users from teams
    if (criteria.teams && criteria.teams.length > 0) {
      const teamRecipients = await this.getRecipientsFromTeams(organizationId, criteria.teams);
      this.addUniqueRecipients(recipients, teamRecipients, processedEmails);
    }

    // Get users by roles
    if (criteria.roles && criteria.roles.length > 0) {
      const roleRecipients = await this.getRecipientsByRoles(organizationId, criteria.roles);
      this.addUniqueRecipients(recipients, roleRecipients, processedEmails);
    }

    // Get users by departments
    if (criteria.departments && criteria.departments.length > 0) {
      const deptRecipients = await this.getRecipientsByDepartments(organizationId, criteria.departments);
      this.addUniqueRecipients(recipients, deptRecipients, processedEmails);
    }

    // Get event participants
    if (criteria.eventParticipants && criteria.eventParticipants.length > 0) {
      const eventRecipients = await this.getRecipientsFromEvents(organizationId, criteria.eventParticipants);
      this.addUniqueRecipients(recipients, eventRecipients, processedEmails);
    }

    // Apply custom filters
    let filteredRecipients = recipients;
    if (criteria.customFilters && criteria.customFilters.length > 0) {
      filteredRecipients = this.applyCustomFilters(recipients, criteria.customFilters);
    }

    // Filter out unsubscribed users if requested
    if (criteria.excludeUnsubscribed) {
      filteredRecipients = await this.filterUnsubscribed(organizationId, filteredRecipients);
    }

    // Filter inactive users if not included
    if (!criteria.includeInactive) {
      filteredRecipients = filteredRecipients.filter(recipient => 
        !recipient.personalizations?.isInactive
      );
    }

    return filteredRecipients;
  }

  /**
   * Get recipients from teams
   */
  private async getRecipientsFromTeams(
    organizationId: string,
    teamIds: string[]
  ): Promise<EmailRecipient[]> {
    const recipients: EmailRecipient[] = [];

    for (const teamId of teamIds) {
      try {
        // Get team members
        const teamMembersSnapshot = await collections.team_members
          .where('teamId', '==', teamId)
          .where('organizationId', '==', organizationId)
          .get();

        const userIds = teamMembersSnapshot.docs.map(doc => doc.data().userId);

        // Get user details
        for (const userId of userIds) {
          const userDoc = await collections.users.doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData && userData.email) {
              recipients.push(this.createEmailRecipient(userData, { teamId }));
            }
          }
        }
      } catch (error) {
        logger.warn(`Error getting recipients from team ${teamId}:`, error);
      }
    }

    return recipients;
  }

  /**
   * Get recipients by roles
   */
  private async getRecipientsByRoles(
    organizationId: string,
    roles: string[]
  ): Promise<EmailRecipient[]> {
    const recipients: EmailRecipient[] = [];

    try {
      const usersSnapshot = await collections.users
        .where('organizationId', '==', organizationId)
        .where('role', 'in', roles)
        .get();

      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData && userData.email) {
          recipients.push(this.createEmailRecipient(userData, { role: userData.role }));
        }
      });
    } catch (error) {
      logger.error('Error getting recipients by roles:', error);
    }

    return recipients;
  }

  /**
   * Get recipients by departments
   */
  private async getRecipientsByDepartments(
    organizationId: string,
    departments: string[]
  ): Promise<EmailRecipient[]> {
    const recipients: EmailRecipient[] = [];

    try {
      const usersSnapshot = await collections.users
        .where('organizationId', '==', organizationId)
        .where('department', 'in', departments)
        .get();

      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData && userData.email) {
          recipients.push(this.createEmailRecipient(userData, { department: userData.department }));
        }
      });
    } catch (error) {
      logger.error('Error getting recipients by departments:', error);
    }

    return recipients;
  }

  /**
   * Get recipients from events
   */
  private async getRecipientsFromEvents(
    organizationId: string,
    eventIds: string[]
  ): Promise<EmailRecipient[]> {
    const recipients: EmailRecipient[] = [];

    for (const eventId of eventIds) {
      try {
        // Get event participants
        const participantsSnapshot = await collections.event_participants
          .where('eventId', '==', eventId)
          .where('organizationId', '==', organizationId)
          .get();

        const userIds = participantsSnapshot.docs.map(doc => doc.data().userId);

        // Get user details
        for (const userId of userIds) {
          const userDoc = await collections.users.doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData && userData.email) {
              recipients.push(this.createEmailRecipient(userData, { eventId }));
            }
          }
        }
      } catch (error) {
        logger.warn(`Error getting recipients from event ${eventId}:`, error);
      }
    }

    return recipients;
  }

  /**
   * Apply custom filters to recipients
   */
  private applyCustomFilters(
    recipients: EmailRecipient[],
    filters: CustomFilter[]
  ): EmailRecipient[] {
    return recipients.filter(recipient => {
      return filters.every(filter => {
        const fieldValue = this.getFieldValue(recipient, filter.field);
        return this.evaluateFilter(fieldValue, filter.operator, filter.value);
      });
    });
  }

  /**
   * Filter out unsubscribed recipients
   */
  private async filterUnsubscribed(
    organizationId: string,
    recipients: EmailRecipient[]
  ): Promise<EmailRecipient[]> {
    try {
      const emails = recipients.map(r => r.email);
      
      // Get unsubscribed emails
      const unsubscribedSnapshot = await collections.email_unsubscribes
        .where('organizationId', '==', organizationId)
        .where('email', 'in', emails)
        .get();

      const unsubscribedEmails = new Set(
        unsubscribedSnapshot.docs.map(doc => doc.data().email)
      );

      return recipients.filter(recipient => !unsubscribedEmails.has(recipient.email));
    } catch (error) {
      logger.error('Error filtering unsubscribed recipients:', error);
      return recipients; // Return all if filtering fails
    }
  }

  /**
   * Create EmailRecipient from user data
   */
  private createEmailRecipient(userData: any, context: Record<string, any> = {}): EmailRecipient {
    return {
      userId: userData.id || userData.uid,
      email: userData.email,
      firstName: userData.firstName || userData.name?.split(' ')[0] || '',
      lastName: userData.lastName || userData.name?.split(' ').slice(1).join(' ') || '',
      personalizations: {
        ...userData,
        ...context,
        fullName: userData.displayName || userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        isInactive: userData.status === 'inactive'
      },
      unsubscribed: false,
      bounced: false,
      lastEngagement: userData.lastLoginAt ? new Date(userData.lastLoginAt) : undefined
    };
  }

  /**
   * Add unique recipients to list
   */
  private addUniqueRecipients(
    recipients: EmailRecipient[],
    newRecipients: EmailRecipient[],
    processedEmails: Set<string>
  ): void {
    newRecipients.forEach(recipient => {
      if (!processedEmails.has(recipient.email)) {
        recipients.push(recipient);
        processedEmails.add(recipient.email);
      }
    });
  }

  /**
   * Get field value from recipient
   */
  private getFieldValue(recipient: EmailRecipient, field: string): any {
    const parts = field.split('.');
    let value: any = recipient;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Evaluate filter condition
   */
  private evaluateFilter(fieldValue: any, operator: string, filterValue: any): boolean {
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    switch (operator) {
      case 'equals':
        return fieldValue === filterValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'startsWith':
        return String(fieldValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
      case 'endsWith':
        return String(fieldValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(fieldValue);
      case 'notIn':
        return Array.isArray(filterValue) && !filterValue.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Validate recipient list
   */
  async validateRecipientList(recipients: EmailRecipient[]): Promise<{
    valid: EmailRecipient[];
    invalid: { recipient: EmailRecipient; reason: string }[];
  }> {
    const valid: EmailRecipient[] = [];
    const invalid: { recipient: EmailRecipient; reason: string }[] = [];

    for (const recipient of recipients) {
      // Validate email format
      if (!this.isValidEmail(recipient.email)) {
        invalid.push({ recipient, reason: 'Invalid email format' });
        continue;
      }

      // Check if email is bounced
      if (recipient.bounced) {
        invalid.push({ recipient, reason: 'Email previously bounced' });
        continue;
      }

      valid.push(recipient);
    }

    return { valid, invalid };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Deduplicate recipients
   */
  deduplicateRecipients(recipients: EmailRecipient[]): EmailRecipient[] {
    const seen = new Set<string>();
    return recipients.filter(recipient => {
      if (seen.has(recipient.email)) {
        return false;
      }
      seen.add(recipient.email);
      return true;
    });
  }

  /**
   * Get organization users with filters
   */
  async getOrganizationUsers(
    organizationId: string,
    filters?: {
      search?: string;
      team?: string;
      role?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<EmailRecipient[]> {
    try {
      let query = collections.users
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true);

      if (filters?.role) {
        query = query.where('role', '==', filters.role);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.offset(filters.offset);
      }

      const snapshot = await query.get();
      let users = snapshot.docs.map(doc => {
        const user = doc.data();
        return {
          userId: doc.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          personalizations: {
            role: user.role,
            department: user.department,
            team: user.team
          },
          unsubscribed: false,
          bounced: false
        } as EmailRecipient;
      });

      // Apply search filter
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        users = users.filter(user => 
          user.email.toLowerCase().includes(searchTerm) ||
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm)
        );
      }

      // Apply team filter
      if (filters?.team) {
        users = users.filter(user => 
          user.personalizations?.team === filters.team
        );
      }

      return users;
    } catch (error) {
      logger.error('Error getting organization users:', error);
      throw createError(
        'Failed to get organization users',
        500,
        EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND
      );
    }
  }

  /**
   * Get organization teams
   */
  async getOrganizationTeams(organizationId: string): Promise<Array<{
    id: string;
    name: string;
    memberCount: number;
  }>> {
    try {
      const teamsSnapshot = await collections.teams
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true)
        .get();

      const teams = await Promise.all(
        teamsSnapshot.docs.map(async (doc) => {
          const team = doc.data();
          
          // Get member count
          const membersSnapshot = await collections.team_members
            .where('teamId', '==', doc.id)
            .count()
            .get();
          
          return {
            id: doc.id,
            name: team.name,
            memberCount: membersSnapshot.data().count
          };
        })
      );

      return teams;
    } catch (error) {
      logger.error('Error getting organization teams:', error);
      throw createError(
        'Failed to get organization teams',
        500,
        EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND
      );
    }
  }

  /**
   * Get event participants
   */
  async getEventParticipants(
    organizationId: string,
    eventId: string,
    filters?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<EmailRecipient[]> {
    try {
      let query = collections.event_participants
        .where('eventId', '==', eventId)
        .where('organizationId', '==', organizationId);

      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.offset(filters.offset);
      }

      const snapshot = await query.get();
      const participants = snapshot.docs.map(doc => {
        const participant = doc.data();
        return {
          userId: participant.userId,
          email: participant.email,
          firstName: participant.firstName || '',
          lastName: participant.lastName || '',
          personalizations: {
            status: participant.status,
            registeredAt: participant.registeredAt,
            eventId: eventId
          },
          unsubscribed: false,
          bounced: false
        } as EmailRecipient;
      });

      return participants;
    } catch (error) {
      logger.error('Error getting event participants:', error);
      throw createError(
        'Failed to get event participants',
        500,
        EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND
      );
    }
  }

  /**
   * Get recipient statistics for an organization
   */
  async getRecipientStatistics(organizationId: string): Promise<{
    totalUsers: number;
    totalTeams: number;
    totalUnsubscribed: number;
    recentActivity: {
      newUsers: number;
      newUnsubscribes: number;
    };
  }> {
    try {
      // Get total users
      const usersSnapshot = await collections.users
        .where('organizationId', '==', organizationId)
        .count()
        .get();
      const totalUsers = usersSnapshot.data().count;

      // Get total teams
      const teamsSnapshot = await collections.teams
        .where('organizationId', '==', organizationId)
        .count()
        .get();
      const totalTeams = teamsSnapshot.data().count;

      // Get total unsubscribed
      const unsubscribedSnapshot = await collections.campaign_unsubscribes
        .where('organizationId', '==', organizationId)
        .count()
        .get();
      const totalUnsubscribed = unsubscribedSnapshot.data().count;

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newUsersSnapshot = await collections.users
        .where('organizationId', '==', organizationId)
        .where('createdAt', '>=', thirtyDaysAgo)
        .count()
        .get();
      const newUsers = newUsersSnapshot.data().count;

      const newUnsubscribesSnapshot = await collections.campaign_unsubscribes
        .where('organizationId', '==', organizationId)
        .where('unsubscribedAt', '>=', thirtyDaysAgo)
        .count()
        .get();
      const newUnsubscribes = newUnsubscribesSnapshot.data().count;

      return {
        totalUsers,
        totalTeams,
        totalUnsubscribed,
        recentActivity: {
          newUsers,
          newUnsubscribes
        }
      };
    } catch (error) {
      logger.error('Error getting recipient statistics:', error);
      throw createError(
        'Failed to get recipient statistics',
        500,
        EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND
      );
    }
  }
}

export const campaignRecipientService = new CampaignRecipientService();