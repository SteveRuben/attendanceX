
import { collections } from '../../config';
import { logger } from 'firebase-functions';
import { createError } from '../../middleware/errorHandler';
import { CampaignAnalytics, CampaignDelivery, CampaignType, EmailCampaign, EmailCampaignErrorCodes, EmailTracking, TrackingEventType } from '../../common/types';

export interface AnalyticsFilters {
  campaignType?: CampaignType;
  dateFrom?: Date;
  dateTo?: Date;
  campaignIds?: string[];
}

export interface PerformanceMetrics {
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  engagementScore: number;
}

export interface ComparativeAnalytics {
  campaigns: {
    id: string;
    name: string;
    type: CampaignType;
    metrics: PerformanceMetrics;
    sentAt: Date;
  }[];
  averageMetrics: PerformanceMetrics;
  bestPerforming: {
    deliveryRate: string;
    openRate: string;
    clickRate: string;
    engagementScore: string;
  };
}

export interface EngagementInsights {
  bestSendTime: { hour: number; dayOfWeek: number };
  topPerformingSubjects: { subject: string; openRate: number }[];
  audienceSegmentPerformance: { segment: string; metrics: PerformanceMetrics }[];
  contentPerformance: { contentType: string; metrics: PerformanceMetrics }[];
}

export class CampaignAnalyticsService {

  /**
   * Get comprehensive analytics for a campaign
   */
  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    try {
      // Get campaign data
      const campaignDoc = await collections.email_campaigns.doc(campaignId).get();
      
      if (!campaignDoc.exists) {
        throw createError(
          'Campaign not found',
          404,
          EmailCampaignErrorCodes.CAMPAIGN_NOT_FOUND
        );
      }

      const campaign = campaignDoc.data() as EmailCampaign;

      // Get delivery data
      const deliveriesSnapshot = await collections.campaign_deliveries
        .where('campaignId', '==', campaignId)
        .get();

      // Get tracking data
      const trackingSnapshot = await collections.email_tracking
        .where('campaignId', '==', campaignId)
        .get();

      // Calculate basic metrics
      const totalSent = deliveriesSnapshot.size;
      let totalDelivered = 0;
      let totalOpened = 0;
      let totalClicked = 0;
      let totalBounced = 0;
      let totalUnsubscribed = 0;

      const deviceStats: Record<string, number> = {};
      const clientStats: Record<string, number> = {};
      const locationStats: Record<string, number> = {};
      const hourlyStats: Record<string, number> = {};
      const dailyStats: Record<string, number> = {};

      // Process deliveries
      deliveriesSnapshot.docs.forEach(doc => {
        const delivery = doc.data() as CampaignDelivery;
        
        if (delivery.deliveredAt) {totalDelivered++;}
        if (delivery.openedAt) {totalOpened++;}
        if (delivery.clickedAt) {totalClicked++;}
        if (delivery.bouncedAt) {totalBounced++;}
        if (delivery.unsubscribedAt) {totalUnsubscribed++;}
      });

      // Process tracking data for detailed analytics
      trackingSnapshot.docs.forEach(doc => {
        const tracking = doc.data() as EmailTracking;
        
        // Device stats
        if (tracking.userAgent) {
          const device = this.parseDeviceFromUserAgent(tracking.userAgent);
          deviceStats[device] = (deviceStats[device] || 0) + 1;
          
          const client = this.parseClientFromUserAgent(tracking.userAgent);
          clientStats[client] = (clientStats[client] || 0) + 1;
        }

        // Location stats
        if (tracking.location?.country) {
          locationStats[tracking.location.country] = (locationStats[tracking.location.country] || 0) + 1;
        }

        // Time-based stats
        tracking.events.forEach(event => {
          const hour = event.timestamp.getHours();
          const day = event.timestamp.toISOString().split('T')[0];
          
          hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
          dailyStats[day] = (dailyStats[day] || 0) + 1;
        });
      });

      // Calculate rates
      const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
      const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
      const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
      const unsubscribeRate = totalSent > 0 ? (totalUnsubscribed / totalSent) * 100 : 0;

      // Calculate engagement score
      const metrics = {
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate,
        clickRate,
        bounceRate,
        unsubscribeRate,
        engagementScore: 0 // Will be calculated
      };
      const engagementScore = this.calculateEngagementScore(metrics);

      const analytics: CampaignAnalytics = {
        campaignId,
        organizationId: campaign.organizationId,
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalUnsubscribed,
        openRate,
        clickRate,
        bounceRate,
        unsubscribeRate,
        engagementScore,
        hourlyStats,
        dailyStats,
        deviceStats,
        clientStats,
        locationStats
      };

      return analytics;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Campaign not found')) {
        throw error;
      }
      
      logger.error('Error getting campaign analytics:', error);
      throw createError(
        'Failed to get campaign analytics',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { campaignId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get comparative analytics for multiple campaigns
   */
  async getComparativeAnalytics(
    organizationId: string,
    filters: AnalyticsFilters = {}
  ): Promise<ComparativeAnalytics> {
    try {
      // Build query for campaigns
      let query = collections.email_campaigns
        .where('organizationId', '==', organizationId);

      if (filters.campaignType) {
        query = query.where('type', '==', filters.campaignType);
      }

      if (filters.dateFrom) {
        query = query.where('createdAt', '>=', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.where('createdAt', '<=', filters.dateTo);
      }

      const campaignsSnapshot = await query.get();
      let campaigns = campaignsSnapshot.docs.map(doc => doc.data() as EmailCampaign);

      // Filter by campaign IDs if specified
      if (filters.campaignIds && filters.campaignIds.length > 0) {
        campaigns = campaigns.filter(campaign => filters.campaignIds!.includes(campaign.id));
      }

      // Get analytics for each campaign
      const campaignAnalytics = await Promise.all(
        campaigns.map(async (campaign) => {
          const analytics = await this.getCampaignAnalytics(campaign.id);
          
          return {
            id: campaign.id,
            name: campaign.name,
            type: campaign.type,
            metrics: {
              deliveryRate: analytics.totalSent > 0 ? (analytics.totalDelivered / analytics.totalSent) * 100 : 0,
              openRate: analytics.openRate,
              clickRate: analytics.clickRate,
              bounceRate: analytics.bounceRate,
              unsubscribeRate: analytics.unsubscribeRate,
              engagementScore: analytics.engagementScore
            },
            sentAt: campaign.createdAt
          };
        })
      );

      // Calculate average metrics
      const averageMetrics = this.calculateAverageMetrics(campaignAnalytics.map(c => c.metrics));

      // Find best performing campaigns
      const bestPerforming = {
        deliveryRate: this.findBestPerforming(campaignAnalytics, 'deliveryRate'),
        openRate: this.findBestPerforming(campaignAnalytics, 'openRate'),
        clickRate: this.findBestPerforming(campaignAnalytics, 'clickRate'),
        engagementScore: this.findBestPerforming(campaignAnalytics, 'engagementScore')
      };

      return {
        campaigns: campaignAnalytics,
        averageMetrics,
        bestPerforming
      };
    } catch (error) {
      logger.error('Error getting comparative analytics:', error);
      throw createError(
        'Failed to get comparative analytics',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { organizationId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Generate engagement insights and recommendations
   */
  async getEngagementInsights(
    organizationId: string,
    filters: AnalyticsFilters = {}
  ): Promise<EngagementInsights> {
    try {
      // Get campaigns for analysis
      let query = collections.email_campaigns
        .where('organizationId', '==', organizationId);

      if (filters.dateFrom) {
        query = query.where('createdAt', '>=', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.where('createdAt', '<=', filters.dateTo);
      }

      const campaignsSnapshot = await query.get();
      const campaigns = campaignsSnapshot.docs.map(doc => doc.data() as EmailCampaign);

      // Analyze send times
      const bestSendTime = await this.analyzeBestSendTime(campaigns);

      // Analyze subject line performance
      const topPerformingSubjects = await this.analyzeSubjectPerformance(campaigns);

      // Analyze audience segment performance
      const audienceSegmentPerformance = await this.analyzeAudienceSegments(organizationId, campaigns);

      // Analyze content performance
      const contentPerformance = await this.analyzeContentPerformance(campaigns);

      return {
        bestSendTime,
        topPerformingSubjects,
        audienceSegmentPerformance,
        contentPerformance
      };
    } catch (error) {
      logger.error('Error getting engagement insights:', error);
      throw createError(
        'Failed to get engagement insights',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { organizationId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get real-time campaign performance
   */
  async getRealTimePerformance(campaignId: string): Promise<{
    currentStats: CampaignAnalytics;
    recentActivity: { timestamp: Date; eventType: TrackingEventType; count: number }[];
    progressPercentage: number;
  }> {
    try {
      const analytics = await this.getCampaignAnalytics(campaignId);

      // Get recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentTrackingSnapshot = await collections.email_tracking
        .where('campaignId', '==', campaignId)
        .where('updatedAt', '>=', yesterday)
        .orderBy('updatedAt', 'desc')
        .limit(100)
        .get();

      // Process recent activity
      const activityMap = new Map<string, { [key in TrackingEventType]?: number }>();

      recentTrackingSnapshot.docs.forEach(doc => {
        const tracking = doc.data() as EmailTracking;
        
        tracking.events.forEach(event => {
          if (event.timestamp >= yesterday) {
            const hourKey = event.timestamp.toISOString().substring(0, 13); // Group by hour
            
            if (!activityMap.has(hourKey)) {
              activityMap.set(hourKey, {});
            }
            
            const hourData = activityMap.get(hourKey)!;
            hourData[event.type] = (hourData[event.type] || 0) + 1;
          }
        });
      });

      const recentActivity = Array.from(activityMap.entries())
        .map(([hour, events]) => ({
          timestamp: new Date(hour + ':00:00Z'),
          eventType: TrackingEventType.OPENED, // Default, will be aggregated
          count: Object.values(events).reduce((sum, count) => sum + (count || 0), 0)
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Calculate progress percentage
      const campaign = await collections.email_campaigns.doc(campaignId).get();
      const campaignData = campaign.data() as EmailCampaign;
      const progressPercentage = campaignData.deliveryStats.totalRecipients > 0
        ? (analytics.totalSent / campaignData.deliveryStats.totalRecipients) * 100
        : 0;

      return {
        currentStats: analytics,
        recentActivity,
        progressPercentage
      };
    } catch (error) {
      logger.error('Error getting real-time performance:', error);
      throw createError(
        'Failed to get real-time performance',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { campaignId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(metrics: PerformanceMetrics): number {
    // Weighted scoring system
    const weights = {
      deliveryRate: 0.2,
      openRate: 0.3,
      clickRate: 0.4,
      bounceRate: -0.05, // Negative impact
      unsubscribeRate: -0.05 // Negative impact
    };

    const score = (
      (metrics.deliveryRate * weights.deliveryRate) +
      (metrics.openRate * weights.openRate) +
      (metrics.clickRate * weights.clickRate) +
      (metrics.bounceRate * weights.bounceRate) +
      (metrics.unsubscribeRate * weights.unsubscribeRate)
    );

    return Math.max(0, Math.min(100, score)); // Clamp between 0-100
  }

  /**
   * Calculate average metrics
   */
  private calculateAverageMetrics(metricsArray: PerformanceMetrics[]): PerformanceMetrics {
    if (metricsArray.length === 0) {
      return {
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        engagementScore: 0
      };
    }

    const sum = metricsArray.reduce((acc, metrics) => ({
      deliveryRate: acc.deliveryRate + metrics.deliveryRate,
      openRate: acc.openRate + metrics.openRate,
      clickRate: acc.clickRate + metrics.clickRate,
      bounceRate: acc.bounceRate + metrics.bounceRate,
      unsubscribeRate: acc.unsubscribeRate + metrics.unsubscribeRate,
      engagementScore: acc.engagementScore + metrics.engagementScore
    }), {
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0,
      engagementScore: 0
    });

    const count = metricsArray.length;

    return {
      deliveryRate: sum.deliveryRate / count,
      openRate: sum.openRate / count,
      clickRate: sum.clickRate / count,
      bounceRate: sum.bounceRate / count,
      unsubscribeRate: sum.unsubscribeRate / count,
      engagementScore: sum.engagementScore / count
    };
  }

  /**
   * Find best performing campaign for a metric
   */
  private findBestPerforming(
    campaigns: { id: string; name: string; metrics: PerformanceMetrics }[],
    metric: keyof PerformanceMetrics
  ): string {
    if (campaigns.length === 0) {return 'N/A';}

    const best = campaigns.reduce((best, current) => 
      current.metrics[metric] > best.metrics[metric] ? current : best
    );

    return best.name;
  }

  /**
   * Analyze best send time
   */
  private async analyzeBestSendTime(campaigns: EmailCampaign[]): Promise<{ hour: number; dayOfWeek: number }> {
    // Analyze when campaigns with highest open rates were sent
    const sendTimeAnalysis = new Map<string, { openRate: number; count: number }>();

    for (const campaign of campaigns) {
      if (campaign.deliveryStats.openRate > 0) {
        const sentDate = campaign.createdAt;
        const hour = sentDate.getHours();
        const dayOfWeek = sentDate.getDay();
        const key = `${dayOfWeek}-${hour}`;

        const existing = sendTimeAnalysis.get(key) || { openRate: 0, count: 0 };
        sendTimeAnalysis.set(key, {
          openRate: existing.openRate + campaign.deliveryStats.openRate,
          count: existing.count + 1
        });
      }
    }

    // Find the time slot with highest average open rate
    let bestTime = { hour: 10, dayOfWeek: 2 }; // Default: Tuesday 10 AM
    let bestOpenRate = 0;

    sendTimeAnalysis.forEach((data, key) => {
      const avgOpenRate = data.openRate / data.count;
      if (avgOpenRate > bestOpenRate) {
        bestOpenRate = avgOpenRate;
        const [dayOfWeek, hour] = key.split('-').map(Number);
        bestTime = { hour, dayOfWeek };
      }
    });

    return bestTime;
  }

  /**
   * Analyze subject line performance
   */
  private async analyzeSubjectPerformance(campaigns: EmailCampaign[]): Promise<{ subject: string; openRate: number }[]> {
    const subjectPerformance = campaigns
      .filter(campaign => campaign.deliveryStats.openRate > 0)
      .map(campaign => ({
        subject: campaign.subject,
        openRate: campaign.deliveryStats.openRate
      }))
      .sort((a, b) => b.openRate - a.openRate)
      .slice(0, 10); // Top 10

    return subjectPerformance;
  }

  /**
   * Analyze audience segment performance
   */
  private async analyzeAudienceSegments(
    organizationId: string,
    campaigns: EmailCampaign[]
  ): Promise<{ segment: string; metrics: PerformanceMetrics }[]> {
    // Group campaigns by recipient criteria to identify segments
    const segmentMap = new Map<string, { campaigns: EmailCampaign[]; metrics: PerformanceMetrics[] }>();

    campaigns.forEach(campaign => {
      const criteria = campaign.recipients.criteria;
      let segmentKey = 'All Users';

      if (criteria.roles && criteria.roles.length > 0) {
        segmentKey = `Roles: ${criteria.roles.join(', ')}`;
      } else if (criteria.teams && criteria.teams.length > 0) {
        segmentKey = `Teams: ${criteria.teams.length} teams`;
      } else if (criteria.departments && criteria.departments.length > 0) {
        segmentKey = `Departments: ${criteria.departments.join(', ')}`;
      }

      if (!segmentMap.has(segmentKey)) {
        segmentMap.set(segmentKey, { campaigns: [], metrics: [] });
      }

      const segment = segmentMap.get(segmentKey)!;
      segment.campaigns.push(campaign);
      segment.metrics.push({
        deliveryRate: campaign.deliveryStats.deliveryRate,
        openRate: campaign.deliveryStats.openRate,
        clickRate: campaign.deliveryStats.clickRate,
        bounceRate: campaign.deliveryStats.bounceRate,
        unsubscribeRate: campaign.deliveryStats.unsubscribeRate,
        engagementScore: this.calculateEngagementScore(campaign.deliveryStats)
      });
    });

    // Calculate average metrics for each segment
    const segmentPerformance = Array.from(segmentMap.entries()).map(([segment, data]) => ({
      segment,
      metrics: this.calculateAverageMetrics(data.metrics)
    }));

    return segmentPerformance;
  }

  /**
   * Analyze content performance
   */
  private async analyzeContentPerformance(campaigns: EmailCampaign[]): Promise<{ contentType: string; metrics: PerformanceMetrics }[]> {
    // Group campaigns by type to analyze content performance
    const contentMap = new Map<string, PerformanceMetrics[]>();

    campaigns.forEach(campaign => {
      const contentType = campaign.type;

      if (!contentMap.has(contentType)) {
        contentMap.set(contentType, []);
      }

      contentMap.get(contentType)!.push({
        deliveryRate: campaign.deliveryStats.deliveryRate,
        openRate: campaign.deliveryStats.openRate,
        clickRate: campaign.deliveryStats.clickRate,
        bounceRate: campaign.deliveryStats.bounceRate,
        unsubscribeRate: campaign.deliveryStats.unsubscribeRate,
        engagementScore: this.calculateEngagementScore(campaign.deliveryStats)
      });
    });

    // Calculate average metrics for each content type
    const contentPerformance = Array.from(contentMap.entries()).map(([contentType, metrics]) => ({
      contentType,
      metrics: this.calculateAverageMetrics(metrics)
    }));

    return contentPerformance;
  }

  /**
   * Parse device from user agent
   */
  private parseDeviceFromUserAgent(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }

  /**
   * Parse email client from user agent
   */
  private parseClientFromUserAgent(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('outlook')) {return 'Outlook';}
    if (ua.includes('gmail')) {return 'Gmail';}
    if (ua.includes('apple mail')) {return 'Apple Mail';}
    if (ua.includes('thunderbird')) {return 'Thunderbird';}
    if (ua.includes('yahoo')) {return 'Yahoo Mail';}
    
    return 'Other';
  }
}

export const campaignAnalyticsService = new CampaignAnalyticsService();