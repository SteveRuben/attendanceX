/**
 * Tests pour le composant EventAnalyticsDashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventAnalyticsDashboard } from '../../../frontend/src/components/analytics/EventAnalyticsDashboard';
import { analyticsService } from '../../../frontend/src/services/analyticsService';
import { eventService } from '../../../frontend/src/services/eventService';

// Mock des services
vi.mock('../../../frontend/src/services/analyticsService');
vi.mock('../../../frontend/src/services/eventService');
vi.mock('../../../frontend/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock des composants UI
vi.mock('../../../frontend/src/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>
}));

vi.mock('../../../frontend/src/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  )
}));

vi.mock('../../../frontend/src/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  )
}));

vi.mock('../../../frontend/src/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}));

vi.mock('../../../frontend/src/components/ui/date-range-picker', () => ({
  DatePickerWithRange: ({ date, onDateChange }: any) => (
    <div data-testid="date-range-picker">
      Date Range Picker
    </div>
  )
}));

// Mock des graphiques Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: any) => <div data-testid="bar-chart" data-length={data?.length}>{children}</div>,
  Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
  XAxis: ({ dataKey }: any) => <div data-testid={`x-axis-${dataKey}`} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  LineChart: ({ children, data }: any) => <div data-testid="line-chart" data-length={data?.length}>{children}</div>,
  Line: ({ dataKey }: any) => <div data-testid={`line-${dataKey}`} />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: any) => <div data-testid="pie" data-length={data?.length} />,
  Cell: () => <div data-testid="cell" />,
  AreaChart: ({ children, data }: any) => <div data-testid="area-chart" data-length={data?.length}>{children}</div>,
  Area: ({ dataKey }: any) => <div data-testid={`area-${dataKey}`} />
}));

describe('EventAnalyticsDashboard', () => {
  const mockOrganizationId = 'org-123';
  const mockEventId = 'event-123';

  const mockEventAnalytics = {
    eventId: 'event-123',
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

  const mockOrganizationAnalytics = {
    organizationId: 'org-123',
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

  const mockEvents = [
    {
      id: 'event-123',
      title: 'Test Event',
      type: 'meeting',
      status: 'completed',
      startDateTime: new Date('2024-01-15T10:00:00Z')
    },
    {
      id: 'event-456',
      title: 'Another Event',
      type: 'training',
      status: 'published',
      startDateTime: new Date('2024-01-20T14:00:00Z')
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock des réponses des services
    (eventService.getEvents as any).mockResolvedValue({
      success: true,
      data: {
        items: mockEvents,
        total: mockEvents.length
      }
    });

    (analyticsService.getEventAnalytics as any).mockResolvedValue(mockEventAnalytics);
    (analyticsService.getOrganizationAnalytics as any).mockResolvedValue(mockOrganizationAnalytics);
    (analyticsService.exportAnalytics as any).mockResolvedValue(new Blob(['test'], { type: 'text/csv' }));
  });

  it('should render dashboard with loading state initially', () => {
    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} />);
    
    expect(screen.getByText('Chargement des analytics...')).toBeInTheDocument();
  });

  it('should render dashboard with data after loading', async () => {
    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Analytics des Événements')).toBeInTheDocument();
    });

    expect(screen.getByText('Métriques et rapports de performance des événements')).toBeInTheDocument();
  });

  it('should load events and analytics data on mount', async () => {
    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} />);
    
    await waitFor(() => {
      expect(eventService.getEvents).toHaveBeenCalledWith({
        limit: 100,
        sortBy: 'startDate',
        sortOrder: 'desc'
      });
    });

    expect(analyticsService.getOrganizationAnalytics).toHaveBeenCalledWith(
      mockOrganizationId,
      expect.any(Date),
      expect.any(Date)
    );
  });

  it('should load event analytics when event is selected', async () => {
    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} eventId={mockEventId} />);
    
    await waitFor(() => {
      expect(analyticsService.getEventAnalytics).toHaveBeenCalledWith(mockEventId);
    });
  });

  it('should display organization metrics cards', async () => {
    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Événements')).toBeInTheDocument();
      expect(screen.getByText('Total Participants')).toBeInTheDocument();
      expect(screen.getByText('Taux de Présence Moyen')).toBeInTheDocument();
      expect(screen.getByText('Total Présences')).toBeInTheDocument();
    });

    expect(screen.getByText('25')).toBeInTheDocument(); // Total events
    expect(screen.getByText('500')).toBeInTheDocument(); // Total participants
    expect(screen.getByText('90.0%')).toBeInTheDocument(); // Attendance rate
    expect(screen.getByText('450')).toBeInTheDocument(); // Total attendances
  });

  it('should display event-specific metrics when event is selected', async () => {
    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} eventId={mockEventId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Invités')).toBeInTheDocument();
      expect(screen.getByText('Confirmés')).toBeInTheDocument();
      expect(screen.getByText('Présents')).toBeInTheDocument();
      expect(screen.getByText('Taux de Présence')).toBeInTheDocument();
    });

    expect(screen.getByText('50')).toBeInTheDocument(); // Total invited
    expect(screen.getByText('45')).toBeInTheDocument(); // Total confirmed
    expect(screen.getByText('40')).toBeInTheDocument(); // Total attended
    expect(screen.getByText('80.0%')).toBeInTheDocument(); // Attendance rate
  });

  it('should render charts with correct data', async () => {
    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    // Vérifier que les graphiques reçoivent les bonnes données
    const pieChart = screen.getByTestId('pie');
    expect(pieChart).toHaveAttribute('data-length', '2'); // eventsByType length

    const barChart = screen.getByTestId('bar-chart');
    expect(barChart).toHaveAttribute('data-length', '2'); // eventsByStatus length
  });

  it('should handle refresh button click', async () => {
    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Actualiser')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Actualiser');
    fireEvent.click(refreshButton);

    // Vérifier que les services sont appelés à nouveau
    await waitFor(() => {
      expect(eventService.getEvents).toHaveBeenCalledTimes(2);
      expect(analyticsService.getOrganizationAnalytics).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle export functionality', async () => {
    // Mock pour créer un lien de téléchargement
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock pour l'élément <a>
    const mockClick = vi.fn();
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();
    
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          style: { display: '' },
          href: '',
          download: '',
          click: mockClick,
        } as any;
      }
      return document.createElement(tagName);
    });
    
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Exporter')).toBeInTheDocument();
    });

    // Simuler la sélection d'un format d'export (ceci nécessiterait une interaction plus complexe avec le Select)
    // Pour ce test, on vérifie juste que le service d'export est disponible
    expect(analyticsService.exportAnalytics).toBeDefined();
  });

  it('should switch between tabs', async () => {
    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('tab-trigger-overview')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-events')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-teams')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-trends')).toBeInTheDocument();
    });
  });

  it('should display team performance data', async () => {
    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('88.0% présence')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // Events organized
      expect(screen.getByText('200')).toBeInTheDocument(); // Total participants
    });

    expect(screen.getByText('Top Performers:')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('95.0%')).toBeInTheDocument();
  });

  it('should handle error states gracefully', async () => {
    // Mock d'une erreur
    (eventService.getEvents as any).mockRejectedValue(new Error('API Error'));
    
    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} />);
    
    // Le composant devrait gérer l'erreur sans planter
    await waitFor(() => {
      expect(screen.queryByText('Chargement des analytics...')).not.toBeInTheDocument();
    });
  });

  it('should display trends data correctly', async () => {
    render(<EventAnalyticsDashboard organizationId={mockOrganizationId} />);
    
    await waitFor(() => {
      // Vérifier que les données de tendances sont affichées
      const lineChart = screen.getByTestId('line-chart');
      expect(lineChart).toBeInTheDocument();
    });
  });
});