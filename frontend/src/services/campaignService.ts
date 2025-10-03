import { apiService, API_BASE_URL } from './api';
import { Campaign, CampaignFilters } from '../components/campaigns/CampaignDashboard';

export interface CreateCampaignRequest {
  name: string;
  subject: string;
  type: Campaign['type'];
  templateId?: string;
  content: {
    htmlContent?: string;
    textContent?: string;
    templateData?: Record<string, any>;
  };
  recipients: {
    criteria?: {
      teams?: string[];
      roles?: string[];
      departments?: string[];
      eventParticipants?: string[];
      customFilters?: any[];
      excludeUnsubscribed: boolean;
    };
    recipientListId?: string;
    externalRecipients?: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      personalizations?: Record<string, any>;
    }>;
  };
  scheduledAt?: string;
  tags?: string[];
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  id: string;
}

export interface CampaignAnalytics {
  campaignId: string;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  deliveryRate: number;
  engagementScore: number;
  timeline: Array<{
    timestamp: string;
    opens: number;
    clicks: number;
    bounces: number;
    unsubscribes: number;
  }>;
  topLinks: Array<{
    url: string;
    clicks: number;
    clickRate: number;
  }>;
  deviceStats: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  locationStats: Array<{
    country: string;
    opens: number;
    clicks: number;
  }>;
}

export interface CampaignPreview {
  htmlContent: string;
  textContent: string;
  subject: string;
  previewText?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: 'newsletter' | 'announcement' | 'event' | 'hr' | 'custom';
  type: 'system' | 'custom';
  htmlContent: string;
  textContent: string;
  thumbnailUrl?: string;
  variables: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  usageCount: number;
}

export interface MockRecipient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  team?: string;
  department?: string;
}

const MOCK_STORAGE_KEY = 'attendanceX_mock_campaigns';
const MOCK_TEMPLATES_KEY = 'attendanceX_mock_templates';

const buildMockTemplates = (): EmailTemplate[] => {
  const now = Date.now();
  return [
    {
      id: 'template-1',
      name: 'Newsletter Moderne',
      description: 'Template moderne pour newsletters mensuelles',
      category: 'newsletter',
      type: 'system',
      htmlContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #333;">{{title}}</h1><p>Bonjour {{firstName}},</p><p>{{content}}</p><div style="margin-top: 30px; padding: 20px; background: #f5f5f5;"><p style="margin: 0;">Cordialement,<br>{{organizationName}}</p></div></div>',
      textContent: 'Bonjour {{firstName}},\n\n{{content}}\n\nCordialement,\n{{organizationName}}',
      thumbnailUrl: '',
      variables: ['title', 'firstName', 'content', 'organizationName'],
      isPublic: true,
      createdAt: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'system',
      usageCount: 45
    },
    {
      id: 'template-2',
      name: 'Annonce Importante',
      description: 'Template pour annonces urgentes',
      category: 'announcement',
      type: 'system',
      htmlContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 3px solid #e74c3c;"><div style="background: #e74c3c; color: white; padding: 20px;"><h1 style="margin: 0;">⚠️ {{title}}</h1></div><div style="padding: 20px;"><p>Bonjour {{firstName}},</p><p style="font-size: 16px; line-height: 1.6;">{{content}}</p></div></div>',
      textContent: '{{title}}\n\nBonjour {{firstName}},\n\n{{content}}',
      variables: ['title', 'firstName', 'content'],
      isPublic: true,
      createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'system',
      usageCount: 23
    },
    {
      id: 'template-3',
      name: 'Rappel Événement',
      description: 'Template pour rappels d\'événements',
      category: 'event',
      type: 'system',
      htmlContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;"><h1 style="margin: 0;">📅 {{eventName}}</h1><p style="font-size: 18px; margin: 10px 0 0 0;">{{eventDate}}</p></div><div style="padding: 20px;"><p>Bonjour {{firstName}},</p><p>{{content}}</p><div style="text-align: center; margin: 30px 0;"><a href="{{eventLink}}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Confirmer ma présence</a></div></div></div>',
      textContent: '{{eventName}}\n{{eventDate}}\n\nBonjour {{firstName}},\n\n{{content}}\n\nLien: {{eventLink}}',
      variables: ['eventName', 'eventDate', 'firstName', 'content', 'eventLink'],
      isPublic: true,
      createdAt: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'system',
      usageCount: 67
    },
    {
      id: 'template-4',
      name: 'Communication RH',
      description: 'Template pour communications RH officielles',
      category: 'hr',
      type: 'system',
      htmlContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd;"><div style="background: #2c3e50; color: white; padding: 20px;"><h2 style="margin: 0;">{{organizationName}} - RH</h2></div><div style="padding: 20px;"><p>Bonjour {{firstName}} {{lastName}},</p><div style="background: #ecf0f1; padding: 15px; margin: 20px 0; border-left: 4px solid #3498db;"><h3 style="margin: 0 0 10px 0;">{{subject}}</h3><p style="margin: 0;">{{content}}</p></div><p>Pour toute question, contactez le service RH.</p></div></div>',
      textContent: '{{organizationName}} - RH\n\nBonjour {{firstName}} {{lastName}},\n\n{{subject}}\n\n{{content}}\n\nPour toute question, contactez le service RH.',
      variables: ['organizationName', 'firstName', 'lastName', 'subject', 'content'],
      isPublic: true,
      createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'system',
      usageCount: 34
    }
  ];
};

const buildMockRecipients = (): MockRecipient[] => {
  return [
    { id: 'u1', email: 'jean.dupont@example.com', firstName: 'Jean', lastName: 'Dupont', role: 'Manager', team: 'Ventes', department: 'Commercial' },
    { id: 'u2', email: 'marie.martin@example.com', firstName: 'Marie', lastName: 'Martin', role: 'Développeur', team: 'Tech', department: 'IT' },
    { id: 'u3', email: 'pierre.bernard@example.com', firstName: 'Pierre', lastName: 'Bernard', role: 'Designer', team: 'Produit', department: 'Produit' },
    { id: 'u4', email: 'sophie.petit@example.com', firstName: 'Sophie', lastName: 'Petit', role: 'RH', team: 'RH', department: 'Administration' },
    { id: 'u5', email: 'luc.robert@example.com', firstName: 'Luc', lastName: 'Robert', role: 'Commercial', team: 'Ventes', department: 'Commercial' },
    { id: 'u6', email: 'emma.richard@example.com', firstName: 'Emma', lastName: 'Richard', role: 'Marketing', team: 'Marketing', department: 'Marketing' },
    { id: 'u7', email: 'thomas.durand@example.com', firstName: 'Thomas', lastName: 'Durand', role: 'Développeur', team: 'Tech', department: 'IT' },
    { id: 'u8', email: 'julie.moreau@example.com', firstName: 'Julie', lastName: 'Moreau', role: 'Support', team: 'Support', department: 'Service Client' },
  ];
};

const buildMockCampaigns = (): Campaign[] => {
  const now = Date.now();
  return [
    {
      id: 'cmp_1',
      name: 'Newsletter Janvier 2024',
      subject: 'Actualités de votre organisation',
      type: 'newsletter',
      status: 'sent',
      recipients: 1250,
      deliveredCount: 1196,
      openedCount: 755,
      clickedCount: 300,
      bouncedCount: 54,
      unsubscribedCount: 13,
      openRate: 63.1,
      clickRate: 25.1,
      bounceRate: 4.2,
      unsubscribeRate: 1.1,
      createdAt: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
      sentAt: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'mock-user',
      templateId: 'template-1',
      tags: ['newsletter', 'janvier']
    },
    {
      id: 'cmp_2',
      name: 'Communication RH: Mise à jour des congés',
      subject: 'Nouvelles règles de congés 2024',
      type: 'hr_communication',
      status: 'scheduled',
      recipients: 800,
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bouncedCount: 0,
      unsubscribedCount: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0,
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      scheduledAt: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'mock-user',
      templateId: 'template-4',
      tags: ['RH']
    },
    {
      id: 'cmp_3',
      name: 'Rappel Événement: Meetup Produit',
      subject: "On se voit demain au meetup ?",
      type: 'event_reminder',
      status: 'draft',
      recipients: 0,
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bouncedCount: 0,
      unsubscribedCount: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0,
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'mock-user',
      templateId: 'template-3',
      tags: ['événement']
    },
    {
      id: 'cmp_4',
      name: 'Annonce: Nouvelle politique télétravail',
      subject: 'Mise à jour importante - Télétravail',
      type: 'announcement',
      status: 'sent',
      recipients: 950,
      deliveredCount: 945,
      openedCount: 823,
      clickedCount: 412,
      bouncedCount: 5,
      unsubscribedCount: 2,
      openRate: 87.1,
      clickRate: 43.5,
      bounceRate: 0.5,
      unsubscribeRate: 0.2,
      createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      sentAt: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'mock-user',
      templateId: 'template-2',
      tags: ['annonce', 'télétravail']
    },
    {
      id: 'cmp_5',
      name: 'Newsletter Février 2024',
      subject: 'Les nouveautés du mois',
      type: 'newsletter',
      status: 'sending',
      recipients: 1300,
      deliveredCount: 650,
      openedCount: 245,
      clickedCount: 89,
      bouncedCount: 12,
      unsubscribedCount: 3,
      openRate: 37.7,
      clickRate: 13.7,
      bounceRate: 1.8,
      unsubscribeRate: 0.5,
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      createdBy: 'mock-user',
      templateId: 'template-1',
      tags: ['newsletter', 'février']
    }
  ];
};

const buildMockAnalytics = (campaignId: string): CampaignAnalytics => {
  const now = Date.now();
  const campaign = buildMockCampaigns().find(c => c.id === campaignId);

  if (!campaign || campaign.status === 'draft') {
    return {
      campaignId,
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalBounced: 0,
      totalUnsubscribed: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0,
      deliveryRate: 0,
      engagementScore: 0,
      timeline: [],
      topLinks: [],
      deviceStats: { desktop: 0, mobile: 0, tablet: 0 },
      locationStats: []
    };
  }

  const timeline = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now - (23 - i) * 60 * 60 * 1000);
    return {
      timestamp: hour.toISOString(),
      opens: Math.floor(Math.random() * (campaign.openedCount / 10)),
      clicks: Math.floor(Math.random() * (campaign.clickedCount / 10)),
      bounces: Math.floor(Math.random() * 3),
      unsubscribes: Math.floor(Math.random() * 2)
    };
  });

  return {
    campaignId,
    totalSent: campaign.recipients,
    totalDelivered: campaign.deliveredCount,
    totalOpened: campaign.openedCount,
    totalClicked: campaign.clickedCount,
    totalBounced: campaign.bouncedCount,
    totalUnsubscribed: campaign.unsubscribedCount,
    openRate: campaign.openRate,
    clickRate: campaign.clickRate,
    bounceRate: campaign.bounceRate,
    unsubscribeRate: campaign.unsubscribeRate,
    deliveryRate: (campaign.deliveredCount / campaign.recipients) * 100,
    engagementScore: (campaign.openRate + campaign.clickRate) / 2,
    timeline,
    topLinks: [
      { url: 'https://example.com/page1', clicks: Math.floor(campaign.clickedCount * 0.4), clickRate: 40 },
      { url: 'https://example.com/page2', clicks: Math.floor(campaign.clickedCount * 0.3), clickRate: 30 },
      { url: 'https://example.com/page3', clicks: Math.floor(campaign.clickedCount * 0.2), clickRate: 20 },
      { url: 'https://example.com/page4', clicks: Math.floor(campaign.clickedCount * 0.1), clickRate: 10 }
    ],
    deviceStats: {
      desktop: Math.floor(campaign.openedCount * 0.55),
      mobile: Math.floor(campaign.openedCount * 0.35),
      tablet: Math.floor(campaign.openedCount * 0.10)
    },
    locationStats: [
      { country: 'France', opens: Math.floor(campaign.openedCount * 0.65), clicks: Math.floor(campaign.clickedCount * 0.60) },
      { country: 'Belgique', opens: Math.floor(campaign.openedCount * 0.15), clicks: Math.floor(campaign.clickedCount * 0.18) },
      { country: 'Suisse', opens: Math.floor(campaign.openedCount * 0.12), clicks: Math.floor(campaign.clickedCount * 0.14) },
      { country: 'Canada', opens: Math.floor(campaign.openedCount * 0.08), clicks: Math.floor(campaign.clickedCount * 0.08) }
    ]
  };
};

class CampaignService {
  private baseUrl = '/api/email-campaigns';

  getTemplates(): EmailTemplate[] {
    try {
      const stored = localStorage.getItem(MOCK_TEMPLATES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load templates from localStorage', e);
    }
    return buildMockTemplates();
  }

  saveTemplate(template: EmailTemplate): void {
    const templates = this.getTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    if (index >= 0) {
      templates[index] = template;
    } else {
      templates.push(template);
    }
    localStorage.setItem(MOCK_TEMPLATES_KEY, JSON.stringify(templates));
  }

  deleteTemplate(templateId: string): void {
    const templates = this.getTemplates().filter(t => t.id !== templateId);
    localStorage.setItem(MOCK_TEMPLATES_KEY, JSON.stringify(templates));
  }

  getRecipients(): MockRecipient[] {
    return buildMockRecipients();
  }

  async getCampaigns(filters?: Partial<CampaignFilters>): Promise<Campaign[]> {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters?.dateRange && filters.dateRange !== 'all') params.append('dateRange', filters.dateRange);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    if (!API_BASE_URL) {
      try {
        const stored = localStorage.getItem(MOCK_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Failed to load campaigns from localStorage', e);
      }
      return buildMockCampaigns();
    }

    try {
      const response = await apiService.get(`${this.baseUrl}?${params.toString()}`);
      return (response as any).data ?? (response as any);
    } catch (e) {
      try {
        const stored = localStorage.getItem(MOCK_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (storageError) {
        console.warn('Failed to load campaigns from localStorage', storageError);
      }
      return buildMockCampaigns();
    }
  }

  async getCampaign(id: string): Promise<Campaign> {
    if (!API_BASE_URL) {
      const campaigns = await this.getCampaigns();
      const campaign = campaigns.find(c => c.id === id);
      if (!campaign) throw new Error('Campaign not found');
      return campaign;
    }

    try {
      const response = await apiService.get(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (e) {
      const campaigns = await this.getCampaigns();
      const campaign = campaigns.find(c => c.id === id);
      if (!campaign) throw new Error('Campaign not found');
      return campaign;
    }
  }

  async createCampaign(data: CreateCampaignRequest): Promise<Campaign> {
    if (!API_BASE_URL) {
      const newCampaign: any = {
        id: `cmp_${Date.now()}`,
        name: data.name,
        subject: data.subject,
        type: data.type,
        status: 'draft',
        recipients: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        bouncedCount: 0,
        unsubscribedCount: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        createdAt: new Date().toISOString(),
        createdBy: 'current-user',
        templateId: data.templateId,
        tags: data.tags || [],
        content: data.content,
        recipients_data: data.recipients,
        scheduledAt: data.scheduledAt
      };

      const campaigns = await this.getCampaigns();
      campaigns.push(newCampaign);
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(campaigns));
      return newCampaign;
    }

    try {
      const response = await apiService.post(this.baseUrl, data);
      return response.data;
    } catch (e) {
      const newCampaign: any = {
        id: `cmp_${Date.now()}`,
        name: data.name,
        subject: data.subject,
        type: data.type,
        status: 'draft',
        recipients: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        bouncedCount: 0,
        unsubscribedCount: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        createdAt: new Date().toISOString(),
        createdBy: 'current-user',
        templateId: data.templateId,
        tags: data.tags || [],
        content: data.content,
        recipients_data: data.recipients,
        scheduledAt: data.scheduledAt
      };

      const campaigns = await this.getCampaigns();
      campaigns.push(newCampaign);
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(campaigns));
      return newCampaign;
    }
  }

  async updateCampaign(data: UpdateCampaignRequest): Promise<Campaign> {
    const { id, recipients, ...updateData } = data;

    if (!API_BASE_URL) {
      const campaigns = await this.getCampaigns();
      const index = campaigns.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Campaign not found');

      const updatedCampaign: any = {
        ...campaigns[index],
        ...updateData,
        content: data.content || (campaigns[index] as any).content,
        recipients_data: recipients || (campaigns[index] as any).recipients_data
      };

      campaigns[index] = updatedCampaign;
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(campaigns));
      return updatedCampaign;
    }

    try {
      const response = await apiService.put(`${this.baseUrl}/${id}`, updateData);
      return response.data;
    } catch (e) {
      const campaigns = await this.getCampaigns();
      const index = campaigns.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Campaign not found');

      const updatedCampaign: any = {
        ...campaigns[index],
        ...updateData,
        content: data.content || (campaigns[index] as any).content,
        recipients_data: recipients || (campaigns[index] as any).recipients_data
      };

      campaigns[index] = updatedCampaign;
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(campaigns));
      return updatedCampaign;
    }
  }

  async deleteCampaign(id: string): Promise<void> {
    if (!API_BASE_URL) {
      const campaigns = await this.getCampaigns();
      const filtered = campaigns.filter(c => c.id !== id);
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(filtered));
      return;
    }

    try {
      await apiService.delete(`${this.baseUrl}/${id}`);
    } catch (e) {
      const campaigns = await this.getCampaigns();
      const filtered = campaigns.filter(c => c.id !== id);
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(filtered));
    }
  }

  async duplicateCampaign(id: string, newName?: string): Promise<Campaign> {
    if (!API_BASE_URL) {
      const original = await this.getCampaign(id);
      const duplicate: Campaign = {
        ...original,
        id: `cmp_${Date.now()}`,
        name: newName || `${original.name} (copie)`,
        status: 'draft',
        createdAt: new Date().toISOString(),
        sentAt: undefined,
        scheduledAt: undefined,
        recipients: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        bouncedCount: 0,
        unsubscribedCount: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0
      };

      const campaigns = await this.getCampaigns();
      campaigns.push(duplicate);
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(campaigns));
      return duplicate;
    }

    try {
      const response = await apiService.post(`${this.baseUrl}/${id}/duplicate`, { name: newName });
      return response.data;
    } catch (e) {
      const original = await this.getCampaign(id);
      const duplicate: Campaign = {
        ...original,
        id: `cmp_${Date.now()}`,
        name: newName || `${original.name} (copie)`,
        status: 'draft',
        createdAt: new Date().toISOString(),
        sentAt: undefined,
        scheduledAt: undefined,
        recipients: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        bouncedCount: 0,
        unsubscribedCount: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0
      };

      const campaigns = await this.getCampaigns();
      campaigns.push(duplicate);
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(campaigns));
      return duplicate;
    }
  }

  /**
   * Envoyer une campagne immédiatement
   */
  async sendCampaign(id: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${id}/send`);
  }

  /**
   * Programmer une campagne
   */
  async scheduleCampaign(id: string, scheduledAt: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${id}/schedule`, { scheduledAt });
  }

  /**
   * Mettre en pause une campagne
   */
  async pauseCampaign(id: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${id}/pause`);
  }

  /**
   * Reprendre une campagne
   */
  async resumeCampaign(id: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${id}/resume`);
  }

  /**
   * Annuler une campagne
   */
  async cancelCampaign(id: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${id}/cancel`);
  }

  async previewCampaign(id: string, recipientEmail?: string): Promise<CampaignPreview> {
    if (!API_BASE_URL) {
      const campaign = await this.getCampaign(id);
      const template = campaign.templateId ? this.getTemplates().find(t => t.id === campaign.templateId) : null;

      return {
        subject: campaign.subject,
        htmlContent: template?.htmlContent || '<p>Contenu de la campagne</p>',
        textContent: template?.textContent || 'Contenu de la campagne',
        previewText: campaign.subject
      };
    }

    try {
      const params = recipientEmail ? `?recipientEmail=${recipientEmail}` : '';
      const response = await apiService.get(`${this.baseUrl}/${id}/preview${params}`);
      return response.data;
    } catch (e) {
      const campaign = await this.getCampaign(id);
      const template = campaign.templateId ? this.getTemplates().find(t => t.id === campaign.templateId) : null;

      return {
        subject: campaign.subject,
        htmlContent: template?.htmlContent || '<p>Contenu de la campagne</p>',
        textContent: template?.textContent || 'Contenu de la campagne',
        previewText: campaign.subject
      };
    }
  }

  async sendTestCampaign(id: string, testEmails: string[]): Promise<void> {
    if (!API_BASE_URL) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    }

    try {
      await apiService.post(`${this.baseUrl}/${id}/test`, { testEmails });
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async getCampaignAnalytics(id: string): Promise<CampaignAnalytics> {
    if (!API_BASE_URL) {
      return buildMockAnalytics(id);
    }

    try {
      const response = await apiService.get(`${this.baseUrl}/${id}/analytics`);
      return response.data;
    } catch (e) {
      return buildMockAnalytics(id);
    }
  }

  /**
   * Récupérer les statistiques globales des campagnes
   */
  async getCampaignStats(): Promise<{
    totalCampaigns: number;
    sentCampaigns: number;
    activeCampaigns: number;
    draftCampaigns: number;
    totalRecipients: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    avgOpenRate: number;
    avgClickRate: number;
    avgBounceRate: number;
    deliveryRate: number;
  }> {
    const response = await apiService.get(`${this.baseUrl}/stats`);
    return response.data;
  }

  /**
   * Exporter les données d'une campagne
   */
  async exportCampaignData(id: string, format: 'csv' | 'excel' | 'pdf' = 'csv'): Promise<Blob> {
    const response = await apiService.get(`${this.baseUrl}/${id}/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Récupérer l'historique des actions d'une campagne
   */
  async getCampaignHistory(id: string): Promise<Array<{
    id: string;
    action: string;
    timestamp: string;
    userId: string;
    userName: string;
    details?: Record<string, any>;
  }>> {
    const response = await apiService.get(`${this.baseUrl}/${id}/history`);
    return response.data;
  }

  /**
   * Comparer plusieurs campagnes
   */
  async compareCampaigns(campaignIds: string[]): Promise<{
    campaigns: Campaign[];
    comparison: {
      metrics: Array<{
        name: string;
        values: Record<string, number>;
      }>;
      insights: string[];
    };
  }> {
    const response = await apiService.post(`${this.baseUrl}/compare`, { campaignIds });
    return response.data;
  }
}

export const campaignService = new CampaignService();