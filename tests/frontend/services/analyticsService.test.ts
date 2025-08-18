/**
 * Tests pour le service d'analytics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from '../../../frontend/src/services/analyticsService';
import { apiService } from '../../../frontend/src/services/apiService';

// Mock du service API
vi.mock('../../../frontend/src/services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
  }
}));

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEventAnalytics', () => {
    it('should fetch event analytics data', async () => {
      const mockEventAnalytics = {
        eventId: 'event-1',
        eventTitle: 'Test Event',
        eventType: 'meeting',
        eventStatus: 'completed',
        startDateTime: new Date('2024-01-15T10:00:00Z'),
        endDateTime: new Date('2024-01-15T12:00:00Z'),
        totalInvited: 50,
        totalConfirmed: 45,
        totalAttended: 40,
        totalAbsent: 5,
        totalLate: 3,
        attendanceRate: 80,
        confirmationRate: 90,
        punctualityRate: 92.5,
        averageCheckInTime: 5,
        peakCheckInHour: 10,
        teamBreakdown: [
          {
            teamId: 'team-1',
            teamName: 'Development',
            invited: 20,
            attended: 18,
            attendanceRate: 90
          }
        ],
        hourlyAttendance: [
          { hour: 10, checkIns: 25, cumulative: 25 },
          { hour: 11, checkIns: 15, cumulative: 40 }
        ]
      };

      (apiService.get as any).mockResolvedValue({ data: mockEventAnalytics });

      const result = await analyticsService.getEventAnalytics('event-1');

      expect(apiService.get).toHaveBeenCalledWith('/api/analytics/events/event-1');
      expect(result).toEqual(mockEventAnalytics);
    });

    it('should handle API errors', async () => {
      (apiService.get as any).mockRejectedValue(new Error('API Error'));

      await expect(analyticsService.getEventAnalytics('event-1')).rejects.toThrow('API Error');
    });
  });

  describe('getOrganizationAnalytics', () => {
    it('should fetch organization analytics with date range', async () => {
      const mockOrgAnalytics = {
        organizationId: 'org-1',
        organizationName: 'Test Organization',
        period: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        totalEvents: 25,
        totalParticipants: 500,
        totalAttendances: 450,
        averageAttendanceRate: 90,
        eventsByType: [
          { type: 'meeting', count: 15, attendanceRate: 85 },
          { type: 'training', count: 10, attendanceRate: 95 }
        ],
        eventsByStatus: [
          { status: 'completed', count: 20, percentage: 80 },
          { status: 'cancelled', count: 5, percentage: 20 }
        ],
        teamPerformance: [
          {
            teamId: 'team-1',
            teamName: 'Development',
            eventsOrganized: 10,
            totalParticipants: 200,
            averageAttendanceRate: 88,
            topPerformers: [
              { userId: 'user-1', userName: 'John Doe', attendanceRate: 95 }
            ]
          }
        ],
        trends: {
          daily: [
            { date: '2024-01-01', events: 2, attendances: 45, rate: 90 }
          ],
          weekly: [
            { week: '2024-W01', events: 5, attendances: 200, rate: 88 }
          ],
          monthly: [
            { month: '2024-01', events: 25, attendances: 450, rate: 90 }
          ]
        }
      };

      (apiService.get as any).mockResolvedValue({ data: mockOrgAnalytics });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await analyticsService.getOrganizationAnalytics('org-1', startDate, endDate);

      expect(apiService.get).toHaveBeenCalledWith(
        '/api/analytics/organizations/org-1',
        {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        }
      );
      expect(result).toEqual(mockOrgAnalytics);
    });
  });

  describe('getAttendanceValidationReport', () => {
    it('should fetch attendance validation report', async () => {
      const mockValidationReport = {
        organizationId: 'org-1',
        period: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        totalValidations: 450,
        validatedByTeam: [
          {
            teamId: 'team-1',
            teamName: 'Development',
            validations: 200,
            validators: [
              { userId: 'user-1', userName: 'John Doe', validationCount: 50 }
            ]
          }
        ],
        validationMethods: [
          { method: 'qr_code', count: 300, percentage: 66.7 },
          { method: 'manual', count: 150, percentage: 33.3 }
        ],
        validationTimes: {
          average: 2.5,
          median: 2.0,
          distribution: [
            { timeRange: '0-1min', count: 200 },
            { timeRange: '1-5min', count: 200 },
            { timeRange: '5+min', count: 50 }
          ]
        },
        issues: [
          {
            type: 'late_validation',
            count: 10,
            events: [
              {
                eventId: 'event-1',
                eventTitle: 'Test Event',
                issueDetails: 'Validation effectuée 30 minutes après l\'événement'
              }
            ]
          }
        ]
      };

      (apiService.get as any).mockResolvedValue({ data: mockValidationReport });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await analyticsService.getAttendanceValidationReport('org-1', startDate, endDate);

      expect(apiService.get).toHaveBeenCalledWith(
        '/api/analytics/organizations/org-1/attendance-validation',
        {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        }
      );
      expect(result).toEqual(mockValidationReport);
    });
  });

  describe('getRealtimeEventMetrics', () => {
    it('should fetch realtime event metrics', async () => {
      const mockRealtimeMetrics = {
        eventId: 'event-1',
        currentAttendees: 35,
        expectedAttendees: 50,
        attendanceRate: 70,
        recentCheckIns: [
          { userId: 'user-1', userName: 'John Doe', checkInTime: '10:05', method: 'qr_code' }
        ]
      };

      (apiService.get as any).mockResolvedValue({ data: mockRealtimeMetrics });

      const result = await analyticsService.getRealtimeEventMetrics('event-1');

      expect(apiService.get).toHaveBeenCalledWith('/api/analytics/events/event-1/realtime');
      expect(result).toEqual(mockRealtimeMetrics);
    });
  });

  describe('compareEvents', () => {
    it('should compare multiple events', async () => {
      const mockComparison = {
        events: [
          { eventId: 'event-1', title: 'Event 1', attendanceRate: 85 },
          { eventId: 'event-2', title: 'Event 2', attendanceRate: 92 }
        ],
        comparison: {
          bestPerforming: 'event-2',
          averageAttendance: 88.5,
          insights: ['Event 2 had better timing', 'Event 1 had technical issues']
        }
      };

      (apiService.post as any).mockResolvedValue({ data: mockComparison });

      const result = await analyticsService.compareEvents(['event-1', 'event-2']);

      expect(apiService.post).toHaveBeenCalledWith('/api/analytics/events/compare', {
        eventIds: ['event-1', 'event-2']
      });
      expect(result).toEqual(mockComparison);
    });
  });

  describe('getTeamParticipationTrends', () => {
    it('should fetch team participation trends', async () => {
      const mockTrends = [
        {
          teamId: 'team-1',
          teamName: 'Development',
          trends: [
            {
              date: '2024-01-01',
              events: 2,
              participants: 20,
              attendanceRate: 90,
              averageEngagement: 85
            }
          ],
          summary: {
            totalEvents: 10,
            totalParticipants: 200,
            averageAttendanceRate: 88,
            bestMonth: '2024-01',
            improvement: 5.2
          }
        }
      ];

      (apiService.post as any).mockResolvedValue({ data: mockTrends });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await analyticsService.getTeamParticipationTrends(
        'org-1',
        ['team-1'],
        startDate,
        endDate
      );

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/analytics/organizations/org-1/team-trends',
        {
          teamIds: ['team-1'],
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      );
      expect(result).toEqual(mockTrends);
    });
  });

  describe('exportAnalytics', () => {
    it('should export analytics data as blob', async () => {
      const mockBlob = new Blob(['test data'], { type: 'application/vnd.ms-excel' });
      (apiService.post as any).mockResolvedValue({ data: mockBlob });

      const exportOptions = {
        format: 'excel' as const,
        includeCharts: true,
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        filters: {
          eventTypes: ['meeting'],
          teams: ['team-1']
        }
      };

      const result = await analyticsService.exportAnalytics('org-1', 'events', exportOptions);

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/analytics/organizations/org-1/export/events',
        exportOptions,
        { responseType: 'blob' }
      );
      expect(result).toEqual(mockBlob);
    });
  });

  describe('getInsights', () => {
    it('should fetch automated insights', async () => {
      const mockInsights = {
        period: 'month',
        insights: [
          {
            type: 'attendance_trend',
            title: 'Amélioration de la présence',
            description: 'Le taux de présence a augmenté de 5% ce mois-ci',
            impact: 'positive',
            confidence: 0.85
          }
        ],
        recommendations: [
          'Continuez à organiser des événements le mardi matin',
          'Considérez des rappels 24h avant les événements'
        ]
      };

      (apiService.get as any).mockResolvedValue({ data: mockInsights });

      const result = await analyticsService.getInsights('org-1', 'month');

      expect(apiService.get).toHaveBeenCalledWith(
        '/api/analytics/organizations/org-1/insights',
        { params: { period: 'month' } }
      );
      expect(result).toEqual(mockInsights);
    });
  });

  describe('getRecommendations', () => {
    it('should fetch improvement recommendations', async () => {
      const mockRecommendations = {
        recommendations: [
          {
            category: 'timing',
            title: 'Optimiser les créneaux horaires',
            description: 'Les événements de 10h-12h ont un meilleur taux de présence',
            priority: 'high',
            expectedImpact: '+8% attendance'
          }
        ],
        actionItems: [
          'Programmer plus d\'événements le matin',
          'Éviter les créneaux après 16h'
        ]
      };

      (apiService.get as any).mockResolvedValue({ data: mockRecommendations });

      const result = await analyticsService.getRecommendations('org-1');

      expect(apiService.get).toHaveBeenCalledWith(
        '/api/analytics/organizations/org-1/recommendations'
      );
      expect(result).toEqual(mockRecommendations);
    });
  });

  describe('getPerformanceAlerts', () => {
    it('should fetch performance alerts', async () => {
      const mockAlerts = {
        alerts: [
          {
            type: 'low_attendance',
            severity: 'warning',
            title: 'Baisse de présence détectée',
            description: 'Le taux de présence a chuté de 15% cette semaine',
            affectedEvents: ['event-1', 'event-2'],
            suggestedActions: ['Vérifier les rappels', 'Analyser les créneaux']
          }
        ],
        summary: {
          total: 1,
          critical: 0,
          warning: 1,
          info: 0
        }
      };

      (apiService.get as any).mockResolvedValue({ data: mockAlerts });

      const result = await analyticsService.getPerformanceAlerts('org-1');

      expect(apiService.get).toHaveBeenCalledWith(
        '/api/analytics/organizations/org-1/alerts'
      );
      expect(result).toEqual(mockAlerts);
    });
  });
});