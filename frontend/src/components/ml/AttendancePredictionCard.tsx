// src/components/ml/AttendancePredictionCard.tsx - Composant de prédiction de présence
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User,
  Brain,
  Target,
  Info
} from 'lucide-react';
import { mlService, type AttendancePrediction } from '@/services';
import { toast } from 'react-toastify';

interface AttendancePredictionCardProps {
  userId: string;
  eventId: string;
  userName?: string;
  compact?: boolean;
  showFactors?: boolean;
  showRecommendations?: boolean;
  onPredictionUpdate?: (prediction: AttendancePrediction) => void;
}

const AttendancePredictionCard = ({
  userId,
  eventId,
  userName,
  compact = false,
  showFactors = true,
  showRecommendations = true,
  onPredictionUpdate
}: AttendancePredictionCardProps) => {
  const [prediction, setPrediction] = useState<AttendancePrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrediction();
  }, [userId, eventId]);

  const loadPrediction = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mlService.predictAttendance({
        userId,
        eventId,
        includeFactors: showFactors
      });

      if (response.success && response.data) {
        setPrediction(response.data);
        onPredictionUpdate?.(response.data);
      } else {
        setError('Impossible de charger la prédiction');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
      toast.error('Erreur lors de la prédiction');
    } finally {
      setLoading(false);
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return 'text-green-600';
    if (probability >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string, probability: number) => {
    const variants = {
      present: 'default',
      late: 'secondary',
      absent: 'destructive',
      excused: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {mlService.getStatusLabel(status)} ({mlService.formatProbability(probability)})
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className={compact ? 'h-32' : 'h-48'}>
        <CardContent className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !prediction) {
    return (
      <Card className={compact ? 'h-32' : 'h-48'}>
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm text-muted-foreground text-center">{error || 'Aucune prédiction disponible'}</p>
          <Button variant="outline" size="sm" onClick={loadPrediction} className="mt-2">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="h-32">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{userName || 'Utilisateur'}</span>
            </div>
            {getRiskIcon(prediction.prediction.riskLevel)}
          </div>
          
          <div className="flex items-center justify-between mb-2">
            {getStatusBadge(prediction.prediction.expectedStatus, prediction.prediction.probability)}
            <Badge variant="outline" className="text-xs">
              {mlService.getConfidenceIcon(prediction.prediction.confidence)} {prediction.prediction.confidence}
            </Badge>
          </div>

          <Progress 
            value={prediction.prediction.probability * 100} 
            className="h-2"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-primary" />
            <span>Prédiction de Présence</span>
          </div>
          <Badge variant="outline" className="text-xs">
            IA v{prediction.modelVersion}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Utilisateur */}
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{userName || prediction.userName}</span>
        </div>

        {/* Prédiction principale */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Statut prédit:</span>
            {getStatusBadge(prediction.prediction.expectedStatus, prediction.prediction.probability)}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Probabilité de présence</span>
              <span className={`font-medium ${getProbabilityColor(prediction.prediction.probability)}`}>
                {mlService.formatProbability(prediction.prediction.probability)}
              </span>
            </div>
            <Progress 
              value={prediction.prediction.probability * 100} 
              className="h-2"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Niveau de risque:</span>
            <div className="flex items-center space-x-1">
              {getRiskIcon(prediction.prediction.riskLevel)}
              <span className="text-sm capitalize">{prediction.prediction.riskLevel}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Confiance:</span>
            <Badge variant="outline" className="text-xs">
              {mlService.getConfidenceIcon(prediction.prediction.confidence)} {prediction.prediction.confidence}
            </Badge>
          </div>
        </div>

        {/* Facteurs d'influence */}
        {showFactors && prediction.influencingFactors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Target className="w-4 h-4 mr-1" />
              Facteurs d'influence
            </h4>
            <div className="space-y-1">
              {prediction.influencingFactors.slice(0, 3).map((factor, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="flex items-center">
                    {factor.direction === 'positive' ? 
                      <TrendingUp className="w-3 h-3 text-green-500 mr-1" /> : 
                      <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                    }
                    {factor.name}
                  </span>
                  <span className="font-medium">
                    {Math.round(factor.impact * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommandations */}
        {showRecommendations && prediction.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recommandations</h4>
            <div className="space-y-1">
              {prediction.recommendations.slice(0, 2).map((recommendation, index) => (
                <div key={index} className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  {recommendation}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            Généré {new Date(prediction.generatedAt).toLocaleString('fr-FR')}
          </span>
          <Button variant="outline" size="sm" onClick={loadPrediction}>
            Actualiser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendancePredictionCard;