// src/pages/Analytics/PredictionsPage.tsx - Page de prédictions détaillées
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Search,
  Filter,
  Download,
  RefreshCw,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { AttendancePredictionCard } from '../components/ml';
import { mlService, eventService, type AttendancePrediction } from '../services';
import { toast } from 'react-toastify';

interface Event {
  id: string;
  title: string;
  startDateTime: string;
  participants: string[];
  organizerId: string;
}

const PredictionsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [predictions, setPredictions] = useState<AttendancePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'excused'>('all');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadPredictions();
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const response = await eventService.getUpcomingEvents(20);
      if (response.success && response.data) {
        setEvents(response.data);
        if (response.data.length > 0) {
          setSelectedEvent(response.data[0]);
        }
      }
    } catch (error: any) {
      console.error('Error loading events:', error);
      toast.error('Erreur lors du chargement des événements');
    }
  };

  const loadPredictions = async () => {
    if (!selectedEvent) return;

    try {
      setLoading(true);
      const response = await mlService.batchPredictAttendance({
        eventId: selectedEvent.id,
        userIds: selectedEvent.participants,
        includeFactors: true,
        includeRecommendations: true
      });

      if (response.success && response.data) {
        setPredictions(response.data);
      } else {
        toast.error('Erreur lors du chargement des prédictions');
      }
    } catch (error: any) {
      console.error('Error loading predictions:', error);
      toast.error('Erreur lors du chargement des prédictions');
    } finally {
      setLoading(false);
    }
  };

  const filteredPredictions = predictions.filter(prediction => {
    // Filtre par terme de recherche
    if (searchTerm && !prediction.userName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Filtre par niveau de risque
    if (riskFilter !== 'all' && prediction.prediction.riskLevel !== riskFilter) {
      return false;
    }

    // Filtre par statut prédit
    if (statusFilter !== 'all' && prediction.prediction.expectedStatus !== statusFilter) {
      return false;
    }

    return true;
  });

  const getStatistics = () => {
    if (predictions.length === 0) return null;

    const totalPredictions = predictions.length;
    const willAttend = predictions.filter(p => p.prediction.willAttend).length;
    const highRisk = predictions.filter(p => p.prediction.riskLevel === 'high').length;
    const averageConfidence = predictions.reduce((sum, p) => {
      const confidenceScore = p.prediction.confidence === 'high' ? 1 : 
                             p.prediction.confidence === 'medium' ? 0.7 : 0.4;
      return sum + confidenceScore;
    }, 0) / totalPredictions;

    return {
      totalPredictions,
      willAttend,
      attendanceRate: Math.round((willAttend / totalPredictions) * 100),
      highRisk,
      averageConfidence: Math.round(averageConfidence * 100)
    };
  };

  const exportPredictions = () => {
    if (predictions.length === 0) {
      toast.warning('Aucune prédiction à exporter');
      return;
    }

    const csvContent = [
      ['Utilisateur', 'Probabilité', 'Statut Prédit', 'Niveau de Risque', 'Confiance'].join(','),
      ...predictions.map(p => [
        p.userName,
        `${Math.round(p.prediction.probability * 100)}%`,
        p.prediction.expectedStatus,
        p.prediction.riskLevel,
        p.prediction.confidence
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictions-${selectedEvent?.title || 'event'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Prédictions exportées avec succès');
  };

  const stats = getStatistics();

  return (
    <div className="container-fluid py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <TrendingUp className="w-8 h-8 mr-3 text-primary" />
            Prédictions de Présence
          </h1>
          <p className="text-muted-foreground mt-1">
            Prédictions IA pour les événements à venir
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={exportPredictions} disabled={predictions.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline" onClick={loadPredictions} disabled={!selectedEvent}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Sélection d'événement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Select 
                value={selectedEvent?.id || ''} 
                onValueChange={(value) => {
                  const event = events.find(e => e.id === value);
                  setSelectedEvent(event || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un événement" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{event.title}</span>
                        <Badge variant="outline" className="ml-2">
                          {event.participants.length} participants
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEvent && (
              <div className="text-sm text-muted-foreground">
                {new Date(selectedEvent.startDateTime).toLocaleString('fr-FR')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Participants</p>
                  <p className="text-2xl font-bold">{stats.totalPredictions}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taux de Présence Prédit</p>
                  <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Risque Élevé</p>
                  <p className="text-2xl font-bold">{stats.highRisk}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confiance Moyenne</p>
                  <p className="text-2xl font-bold">{stats.averageConfidence}%</p>
                </div>
                <Target className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Rechercher un participant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={riskFilter} onValueChange={(value: any) => setRiskFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Niveau de risque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les risques</SelectItem>
                <SelectItem value="high">Risque élevé</SelectItem>
                <SelectItem value="medium">Risque moyen</SelectItem>
                <SelectItem value="low">Risque faible</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut prédit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="present">Présent</SelectItem>
                <SelectItem value="late">En retard</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="excused">Excusé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Predictions Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      ) : filteredPredictions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPredictions.map((prediction) => (
            <AttendancePredictionCard
              key={prediction.userId}
              userId={prediction.userId}
              eventId={prediction.eventId}
              userName={prediction.userName}
              compact={false}
              showFactors={true}
              showRecommendations={true}
            />
          ))}
        </div>
      ) : selectedEvent ? (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Aucune prédiction trouvée
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || riskFilter !== 'all' || statusFilter !== 'all' 
                ? 'Aucune prédiction ne correspond aux filtres sélectionnés.'
                : 'Aucune prédiction disponible pour cet événement.'
              }
            </p>
            {(searchTerm || riskFilter !== 'all' || statusFilter !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setRiskFilter('all');
                  setStatusFilter('all');
                }}
              >
                Réinitialiser les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Sélectionnez un événement
            </h3>
            <p className="text-muted-foreground">
              Choisissez un événement pour voir les prédictions de présence.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PredictionsPage;