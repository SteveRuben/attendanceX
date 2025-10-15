import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/badge';
import {
    BarChart3,
    TrendingUp,
    Users,
    Calendar,
    Clock,
    Target,
    Download,
    Filter,
    RefreshCw,
    PieChart,
    Activity
} from 'lucide-react';
import { analyticsService, eventService, organizationService } from '../services';
import { toast } from 'react-toastify';

interface AnalyticsCenterProps {
    organizationId: string;
}

interface AnalyticsData {
    totalEvents: number;
    totalParticipants: number;
    averageAttendanceRate: number;
    totalHours: number;
    monthlyTrend: Array<{
        month: string;
        events: number;
        attendance: number;
    }>;
    eventTypeBreakdown: Array<{
        type: string;
        count: number;
        percentage: number;
    }>;
    topPerformingEvents: Array<{
        id: string;
        title: string;
        attendanceRate: number;
        participants: number;
    }>;
}

export const AnalyticsCenter: React.FC<AnalyticsCenterProps> = ({ organizationId }) => {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadAnalytics();
    }, [organizationId, timeRange]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);

            // Charger les données d'analytics
            const [eventsResponse, statsResponse] = await Promise.allSettled([
                eventService.getEvents({ organizerId: organizationId }),
                organizationService.getOrganizationStats(organizationId)
            ]);

            // Simuler des données d'analytics pour la démonstration
            const mockAnalytics: AnalyticsData = {
                totalEvents: 24,
                totalParticipants: 1250,
                averageAttendanceRate: 78.5,
                totalHours: 156,
                monthlyTrend: [
                    { month: 'Jan', events: 8, attendance: 82 },
                    { month: 'Fév', events: 12, attendance: 75 },
                    { month: 'Mar', events: 15, attendance: 88 },
                    { month: 'Avr', events: 10, attendance: 72 },
                    { month: 'Mai', events: 18, attendance: 85 },
                    { month: 'Jun', events: 14, attendance: 79 }
                ],
                eventTypeBreakdown: [
                    { type: 'Réunions', count: 45, percentage: 42 },
                    { type: 'Formations', count: 28, percentage: 26 },
                    { type: 'Conférences', count: 20, percentage: 19 },
                    { type: 'Ateliers', count: 14, percentage: 13 }
                ],
                topPerformingEvents: [
                    { id: '1', title: 'Formation Sécurité Q2', attendanceRate: 95, participants: 85 },
                    { id: '2', title: 'Réunion Équipe Dev', attendanceRate: 92, participants: 12 },
                    { id: '3', title: 'Conférence Innovation', attendanceRate: 88, participants: 150 },
                    { id: '4', title: 'Atelier Design Thinking', attendanceRate: 85, participants: 25 }
                ]
            };

            setAnalytics(mockAnalytics);
        } catch (error) {
            console.error('Error loading analytics:', error);
            toast.error('Erreur lors du chargement des analytics');
        } finally {
            setLoading(false);
        }
    };

    const refreshAnalytics = async () => {
        setRefreshing(true);
        await loadAnalytics();
        setRefreshing(false);
        toast.success('Analytics mis à jour');
    };

    const exportReport = () => {
        toast.info('Export en cours...');
        // Ici, on implémenterait l'export réel
    };

    const getTimeRangeLabel = (range: string) => {
        const labels = {
            '7d': '7 derniers jours',
            '30d': '30 derniers jours',
            '90d': '3 derniers mois',
            '1y': 'Dernière année'
        };
        return labels[range as keyof typeof labels];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Impossible de charger les analytics</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics & Rapports</h1>
                    <p className="text-gray-600">
                        Analysez les performances de vos événements et équipes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="7d">7 derniers jours</option>
                        <option value="30d">30 derniers jours</option>
                        <option value="90d">3 derniers mois</option>
                        <option value="1y">Dernière année</option>
                    </select>
                    <Button
                        variant="outline"
                        onClick={refreshAnalytics}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Actualiser
                    </Button>
                    <Button onClick={exportReport}>
                        <Download className="h-4 w-4 mr-2" />
                        Exporter
                    </Button>
                </div>
            </div>

            {/* Métriques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Événements</p>
                            <p className="text-2xl font-bold text-gray-900">{analytics.totalEvents}</p>
                            <p className="text-xs text-green-600 flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +12% vs période précédente
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Participants</p>
                            <p className="text-2xl font-bold text-gray-900">{analytics.totalParticipants.toLocaleString()}</p>
                            <p className="text-xs text-green-600 flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +8% vs période précédente
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Users className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Taux de Présence</p>
                            <p className="text-2xl font-bold text-gray-900">{analytics.averageAttendanceRate}%</p>
                            <p className="text-xs text-green-600 flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +3% vs période précédente
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Target className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Heures Totales</p>
                            <p className="text-2xl font-bold text-gray-900">{analytics.totalHours}h</p>
                            <p className="text-xs text-green-600 flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +15% vs période précédente
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tendance mensuelle */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Tendance Mensuelle
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.monthlyTrend.map((month, index) => (
                                <div key={month.month} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-900 w-8">
                                            {month.month}
                                        </span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <span>{month.events} événements</span>
                                                <span>•</span>
                                                <span>{month.attendance}% présence</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{ width: `${month.attendance}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Répartition par type d'événement */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5" />
                            Types d'Événements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.eventTypeBreakdown.map((type, index) => (
                                <div key={type.type} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{
                                                backgroundColor: [
                                                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444'
                                                ][index % 4]
                                            }}
                                        ></div>
                                        <span className="text-sm font-medium text-gray-900">
                                            {type.type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">{type.count}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {type.percentage}%
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Événements les plus performants */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Événements les Plus Performants
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {analytics.topPerformingEvents.map((event, index) => (
                            <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-semibold text-sm">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                                        <p className="text-sm text-gray-600">
                                            {event.participants} participants
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                            {event.attendanceRate}%
                                        </p>
                                        <p className="text-xs text-gray-600">Taux de présence</p>
                                    </div>
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-600 h-2 rounded-full"
                                            style={{ width: `${event.attendanceRate}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                        <Download className="h-6 w-6" />
                        <span>Rapport Détaillé</span>
                    </Button>
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                        <BarChart3 className="h-6 w-6" />
                        <span>Analytics Avancées</span>
                    </Button>
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                        <Users className="h-6 w-6" />
                        <span>Rapport Équipes</span>
                    </Button>
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                        <Calendar className="h-6 w-6" />
                        <span>Planification</span>
                    </Button>
                </div>
            </Card>
        </div>
    );
};