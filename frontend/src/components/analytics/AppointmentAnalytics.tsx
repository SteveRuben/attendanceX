// src/components/analytics/AppointmentAnalytics.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DatePickerWithRange } from '../components/ui/date-range-picker';
import { Alert, AlertDescription } from '../components/ui/alert';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AppointmentStats {
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  attendanceRate: number;
  cancellationRate: number;
  averageDuration: number;
  totalRevenue: number;
}

interface TimeSlotData {
  hour: string;
  appointments: number;
  revenue: number;
}

interface DailyData {
  date: string;
  appointments: number;
  confirmed: number;
  cancelled: number;
  noShow: number;
  revenue: number;
}

interface ServiceData {
  name: string;
  appointments: number;
  revenue: number;
  color: string;
}

interface PractitionerData {
  name: string;
  appointments: number;
  attendanceRate: number;
  revenue: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const AppointmentAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedPractitioner, setSelectedPractitioner] = useState<string>('all');

  const [stats, setStats] = useState<AppointmentStats>({
    totalAppointments: 0,
    confirmedAppointments: 0,
    cancelledAppointments: 0,
    noShowAppointments: 0,
    attendanceRate: 0,
    cancellationRate: 0,
    averageDuration: 0,
    totalRevenue: 0
  });

  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [timeSlotData, setTimeSlotData] = useState<TimeSlotData[]>([]);
  const [serviceData, setServiceData] = useState<ServiceData[]>([]);
  const [practitionerData, setPractitionerData] = useState<PractitionerData[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, selectedService, selectedPractitioner]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      // TODO: Replace with actual API calls
      // const response = await analyticsService.getAppointmentAnalytics({
      //   startDate: dateRange?.from,
      //   endDate: dateRange?.to,
      //   serviceId: selectedService !== 'all' ? selectedService : undefined,
      //   practitionerId: selectedPractitioner !== 'all' ? selectedPractitioner : undefined
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data
      const mockStats: AppointmentStats = {
        totalAppointments: 245,
        confirmedAppointments: 198,
        cancelledAppointments: 32,
        noShowAppointments: 15,
        attendanceRate: 80.8,
        cancellationRate: 13.1,
        averageDuration: 35,
        totalRevenue: 12250
      };

      const mockDailyData: DailyData[] = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return {
          date: format(date, 'yyyy-MM-dd'),
          appointments: Math.floor(Math.random() * 15) + 5,
          confirmed: Math.floor(Math.random() * 12) + 4,
          cancelled: Math.floor(Math.random() * 3),
          noShow: Math.floor(Math.random() * 2),
          revenue: Math.floor(Math.random() * 800) + 200
        };
      });

      const mockTimeSlotData: TimeSlotData[] = [
        { hour: '08:00', appointments: 12, revenue: 600 },
        { hour: '09:00', appointments: 18, revenue: 900 },
        { hour: '10:00', appointments: 22, revenue: 1100 },
        { hour: '11:00', appointments: 25, revenue: 1250 },
        { hour: '12:00', appointments: 8, revenue: 400 },
        { hour: '13:00', appointments: 5, revenue: 250 },
        { hour: '14:00', appointments: 28, revenue: 1400 },
        { hour: '15:00', appointments: 32, revenue: 1600 },
        { hour: '16:00', appointments: 26, revenue: 1300 },
        { hour: '17:00', appointments: 20, revenue: 1000 },
        { hour: '18:00', appointments: 15, revenue: 750 }
      ];

      const mockServiceData: ServiceData[] = [
        { name: 'Consultation générale', appointments: 98, revenue: 4900, color: COLORS[0] },
        { name: 'Consultation spécialisée', appointments: 65, revenue: 4550, color: COLORS[1] },
        { name: 'Suivi', appointments: 45, revenue: 1800, color: COLORS[2] },
        { name: 'Urgence', appointments: 25, revenue: 1500, color: COLORS[3] },
        { name: 'Téléconsultation', appointments: 12, revenue: 480, color: COLORS[4] }
      ];

      const mockPractitionerData: PractitionerData[] = [
        { name: 'Dr. Martin', appointments: 85, attendanceRate: 88.2, revenue: 4250 },
        { name: 'Dr. Dubois', appointments: 72, attendanceRate: 81.9, revenue: 3600 },
        { name: 'Dr. Leroy', appointments: 58, attendanceRate: 75.9, revenue: 2900 },
        { name: 'Dr. Bernard', appointments: 30, attendanceRate: 83.3, revenue: 1500 }
      ];

      setStats(mockStats);
      setDailyData(mockDailyData);
      setTimeSlotData(mockTimeSlotData);
      setServiceData(mockServiceData);
      setPractitionerData(mockPractitionerData);

    } catch (err: any) {
      setError('Erreur lors du chargement des données analytiques');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    let from: Date;

    switch (period) {
      case '7d':
        from = subDays(now, 7);
        break;
      case '30d':
        from = subDays(now, 30);
        break;
      case '90d':
        from = subDays(now, 90);
        break;
      case '1y':
        from = subDays(now, 365);
        break;
      default:
        from = subDays(now, 30);
    }

    setDateRange({ from, to: now });
  };

  const exportReport = async (format: 'pdf' | 'excel') => {
    try {
      setExporting(true);

      // TODO: Replace with actual API call
      // const response = await analyticsService.exportReport({
      //   format,
      //   startDate: dateRange?.from,
      //   endDate: dateRange?.to,
      //   serviceId: selectedService !== 'all' ? selectedService : undefined,
      //   practitionerId: selectedPractitioner !== 'all' ? selectedPractitioner : undefined
      // });

      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create mock download
      const filename = `rapport-rendez-vous-${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      console.log(`Téléchargement du rapport: ${filename}`);

    } catch (err: any) {
      setError('Erreur lors de l\'export du rapport');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytiques des rendez-vous</h1>
          <p className="text-gray-600">Analysez les performances de votre système de rendez-vous</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => exportReport('excel')}
            disabled={exporting}
          >
            {exporting ? <LoadingSpinner size="sm" className="mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReport('pdf')}
            disabled={exporting}
          >
            {exporting ? <LoadingSpinner size="sm" className="mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            PDF
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filtres</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Période</label>
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 derniers jours</SelectItem>
                  <SelectItem value="30d">30 derniers jours</SelectItem>
                  <SelectItem value="90d">90 derniers jours</SelectItem>
                  <SelectItem value="1y">1 an</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === 'custom' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Plage de dates</label>
                <DatePickerWithRange
                  date={dateRange}
                  onDateChange={setDateRange}
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Service</label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les services</SelectItem>
                  <SelectItem value="consultation">Consultation générale</SelectItem>
                  <SelectItem value="specialiste">Consultation spécialisée</SelectItem>
                  <SelectItem value="suivi">Suivi</SelectItem>
                  <SelectItem value="urgence">Urgence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Praticien</label>
              <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les praticiens</SelectItem>
                  <SelectItem value="martin">Dr. Martin</SelectItem>
                  <SelectItem value="dubois">Dr. Dubois</SelectItem>
                  <SelectItem value="leroy">Dr. Leroy</SelectItem>
                  <SelectItem value="bernard">Dr. Bernard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total rendez-vous</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAppointments}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600">+12%</span>
              <span className="text-gray-600 ml-1">vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux de présence</p>
                <p className="text-2xl font-bold text-gray-900">{formatPercentage(stats.attendanceRate)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600">+2.3%</span>
              <span className="text-gray-600 ml-1">vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux d'annulation</p>
                <p className="text-2xl font-bold text-gray-900">{formatPercentage(stats.cancellationRate)}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingDown className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600">-1.2%</span>
              <span className="text-gray-600 ml-1">vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600">+8.5%</span>
              <span className="text-gray-600 ml-1">vs période précédente</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Appointments Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Évolution quotidienne</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: fr })}
                />
                <Area
                  type="monotone"
                  dataKey="appointments"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  name="Rendez-vous"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time Slots Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Heures de pointe</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeSlotData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="appointments" fill="#10B981" name="Rendez-vous" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Services Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChartIcon className="w-5 h-5" />
              <span>Répartition par service</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="appointments"
                  >
                    {serviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Évolution du chiffre d'affaires</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                />
                <YAxis tickFormatter={(value) => `${value}€`} />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: fr })}
                  formatter={(value) => [`${value}€`, 'Chiffre d\'affaires']}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ fill: '#F59E0B' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Practitioner Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Performance par praticien</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {practitionerData.map((practitioner, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{practitioner.name}</h4>
                    <p className="text-sm text-gray-600">
                      {practitioner.appointments} rendez-vous
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">Taux de présence</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatPercentage(practitioner.attendanceRate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Chiffre d'affaires</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(practitioner.revenue)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance par service</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {serviceData.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: service.color }}
                  />
                  <div>
                    <h4 className="font-medium">{service.name}</h4>
                    <p className="text-sm text-gray-600">
                      {service.appointments} rendez-vous
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Chiffre d'affaires</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(service.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentAnalytics;