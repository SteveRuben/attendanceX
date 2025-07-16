// src/components/ml/AnomalyAlert.tsx - Composant d'alerte d'anomalie
import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  X, 
  Eye, 
  Clock,
  Users,
  Calendar,
  TrendingDown
} from 'lucide-react';
import { mlService, type MLAnomaly } from '@/services';
import { toast } from 'react-toastify';

interface AnomalyAlertProps {
  timeframe?: {
    start: string;
    end: string;
  };
  type?: 'attendance' | 'behavior' | 'event';
  threshold?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // en minutes
  onAnomalyClick?: (anomaly: MLAnomaly) => void;
  compact?: boolean;
}

const AnomalyAlert = ({
  timeframe,
  type = 'attendance',
  threshold = 0.7,
  autoRefresh = false,
  refreshInterval = 15,
  onAnomalyClick,
  compact = false
}: AnomalyAlertProps) => {
  const [anomalies, setAnomalies] = useState<MLAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAnomalies();
    
    if (autoRefresh) {
      const interval = setInterval(loadAnomalies, refreshInterval * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [timeframe, type, threshold, autoRefresh, refreshInterval]);

  const loadAnomalies = async () => {
    try {
      setLoading(true);
      setError(null);

      const defaultTimeframe = timeframe || {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
        end: new Date().toISOString()
      };

      const response = await mlService.detectAnomalies({
        type,
        timeframe: defaultTimeframe,
        threshold,
        includeRecommendations: true
      });

      if (response.success && response.data) {
        setAnomalies(response.data.anomalies);
      } else {
        setError('Impossible de charger les anomalies');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
      console.error('Error loading anomalies:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getTypeIcon = (anomalyType: string) => {
    if (anomalyType.includes('attendance')) return <Users className="w-4 h-4" />;
    if (anomalyType.includes('event')) return <Calendar className="w-4 h-4" />;
    if (anomalyType.includes('behavior')) return <TrendingDown className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const handleDismiss = (anomalyId: string) => {
    setDismissed(prev => new Set([...prev, anomalyId]));
  };

  const handleView = (anomaly: MLAnomaly) => {
    onAnomalyClick?.(anomaly);
  };

  const visibleAnomalies = anomalies.filter(anomaly => !dismissed.has(anomaly.id));
  const highSeverityCount = visibleAnomalies.filter(a => a.severity === 'high').length;
  const mediumSeverityCount = visibleAnomalies.filter(a => a.severity === 'medium').length;

  if (loading) {
    return (
      <Card className={compact ? 'h-20' : 'h-32'}>
        <CardContent className="p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erreur de détection</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (visibleAnomalies.length === 0) {
    if (compact) {
      return (
        <Card className="h-20">
          <CardContent className="p-4 flex items-center justify-center">
            <div className="flex items-center text-green-600">
              <Info className="w-4 h-4 mr-2" />
              <span className="text-sm">Aucune anomalie détectée</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Système normal</AlertTitle>
        <AlertDescription>
          Aucune anomalie détectée dans les dernières 24 heures.
        </AlertDescription>
      </Alert>
    );
  }

  if (compact) {
    return (
      <Card className="h-20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">
                {visibleAnomalies.length} anomalie{visibleAnomalies.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {highSeverityCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {highSeverityCount} critique{highSeverityCount > 1 ? 's' : ''}
                </Badge>
              )}
              {mediumSeverityCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {mediumSeverityCount} modérée{mediumSeverityCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Résumé */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Anomalies Détectées</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {visibleAnomalies.length} total
              </Badge>
              <Button variant="outline" size="sm" onClick={loadAnomalies}>
                Actualiser
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>{highSeverityCount} critique{highSeverityCount > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>{mediumSeverityCount} modérée{mediumSeverityCount > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>{visibleAnomalies.filter(a => a.severity === 'low').length} mineure{visibleAnomalies.filter(a => a.severity === 'low').length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des anomalies */}
      <div className="space-y-2">
        {visibleAnomalies.slice(0, 5).map((anomaly) => (
          <Alert key={anomaly.id} className={getSeverityColor(anomaly.severity)}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getSeverityIcon(anomaly.severity)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    {getTypeIcon(anomaly.type)}
                    <AlertTitle className="text-sm">
                      {anomaly.description}
                    </AlertTitle>
                  </div>
                  <AlertDescription className="text-xs">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(anomaly.detectedAt).toLocaleString('fr-FR')}
                      </span>
                      <span className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {anomaly.affectedEntities.length} entité{anomaly.affectedEntities.length > 1 ? 's' : ''} affectée{anomaly.affectedEntities.length > 1 ? 's' : ''}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(anomaly.confidence * 100)}% confiance
                      </Badge>
                    </div>
                    {anomaly.recommendations && anomaly.recommendations.length > 0 && (
                      <div className="mt-2 p-2 bg-white/50 rounded text-xs">
                        <strong>Recommandation:</strong> {anomaly.recommendations[0]}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleView(anomaly)}
                  className="h-6 w-6 p-0"
                >
                  <Eye className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(anomaly.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Alert>
        ))}
      </div>

      {visibleAnomalies.length > 5 && (
        <div className="text-center">
          <Button variant="outline" size="sm">
            Voir {visibleAnomalies.length - 5} anomalie{visibleAnomalies.length - 5 > 1 ? 's' : ''} de plus
          </Button>
        </div>
      )}
    </div>
  );
};

export default AnomalyAlert;