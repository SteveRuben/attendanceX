// src/components/ml/RecommendationPanel.tsx - Panneau de recommandations intelligentes
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/Button';
import { 
  Lightbulb, 
  Target, 
  CheckCircle, 
  Clock, 
  Users, 
  Calendar,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';
import { mlService } from '../services';
import { toast } from 'react-toastify';

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  category: string;
  actionable: boolean;
  action?: {
    type: string;
    description: string;
    target?: string;
  };
  estimatedImpact?: string;
  timeToImplement?: string;
}

interface RecommendationPanelProps {
  type: 'attendance' | 'event' | 'user' | 'department' | 'global';
  targetId?: string;
  context?: Record<string, any>;
  maxRecommendations?: number;
  showPriority?: boolean;
  showActions?: boolean;
  onRecommendationApply?: (recommendation: Recommendation) => void;
  onRecommendationDismiss?: (recommendationId: string) => void;
}

const RecommendationPanel = ({
  type,
  targetId,
  context,
  maxRecommendations = 5,
  showPriority = true,
  showActions = true,
  onRecommendationApply,
  onRecommendationDismiss
}: RecommendationPanelProps) => {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRecommendations();
  }, [type, targetId, context]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mlService.getRecommendations({
        type,
        targetId,
        context
      });

      if (response.success && response.data) {
        setRecommendations(response.data.recommendations);
      } else {
        setError('Impossible de charger les recommandations');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
      console.error('Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Lightbulb className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'scheduling': return <Calendar className="w-4 h-4" />;
      case 'engagement': return <Users className="w-4 h-4" />;
      case 'optimization': return <TrendingUp className="w-4 h-4" />;
      case 'communication': return <Target className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleApply = (recommendation: Recommendation) => {
    setApplied(prev => new Set([...prev, recommendation.id]));
    onRecommendationApply?.(recommendation);
    toast.success('Recommandation appliquée');
  };

  const handleDismiss = (recommendationId: string) => {
    setDismissed(prev => new Set([...prev, recommendationId]));
    onRecommendationDismiss?.(recommendationId);
  };

  // Simuler des recommandations structurées à partir des chaînes
  const structuredRecommendations: Recommendation[] = recommendations.map((rec, index) => ({
    id: `rec-${index}`,
    type: type,
    title: rec.length > 50 ? rec.substring(0, 50) + '...' : rec,
    description: rec,
    confidence: 0.8 + (Math.random() * 0.2), // Simulation
    priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
    category: index % 4 === 0 ? 'scheduling' : 
              index % 4 === 1 ? 'engagement' : 
              index % 4 === 2 ? 'optimization' : 'communication',
    actionable: true,
    action: {
      type: 'implement',
      description: 'Appliquer cette recommandation',
    },
    estimatedImpact: index === 0 ? 'Élevé' : index === 1 ? 'Moyen' : 'Faible',
    timeToImplement: index === 0 ? '5 min' : index === 1 ? '15 min' : '30 min'
  }));

  const visibleRecommendations = structuredRecommendations
    .filter(rec => !dismissed.has(rec.id))
    .slice(0, maxRecommendations);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm text-muted-foreground text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={loadRecommendations} className="mt-2">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (visibleRecommendations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground text-center">
            Aucune recommandation disponible pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <span>Recommandations IA</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {visibleRecommendations.length} recommandation{visibleRecommendations.length > 1 ? 's' : ''}
            </Badge>
            <Button variant="outline" size="sm" onClick={loadRecommendations}>
              Actualiser
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {visibleRecommendations.map((recommendation) => (
          <div 
            key={recommendation.id}
            className={`p-4 border rounded-lg ${getPriorityColor(recommendation.priority)} ${
              applied.has(recommendation.id) ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start space-x-3">
                {showPriority && getPriorityIcon(recommendation.priority)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    {getCategoryIcon(recommendation.category)}
                    <h4 className="font-medium text-sm">{recommendation.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {recommendation.description}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(recommendation.id)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            {/* Métriques */}
            <div className="flex items-center space-x-4 mb-3 text-xs">
              <div className="flex items-center space-x-1">
                <span className="text-muted-foreground">Confiance:</span>
                <span className={`font-medium ${getConfidenceColor(recommendation.confidence)}`}>
                  {Math.round(recommendation.confidence * 100)}%
                </span>
              </div>
              {recommendation.estimatedImpact && (
                <div className="flex items-center space-x-1">
                  <span className="text-muted-foreground">Impact:</span>
                  <span className="font-medium">{recommendation.estimatedImpact}</span>
                </div>
              )}
              {recommendation.timeToImplement && (
                <div className="flex items-center space-x-1">
                  <span className="text-muted-foreground">Temps:</span>
                  <span className="font-medium">{recommendation.timeToImplement}</span>
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center space-x-2 mb-3">
              <Badge variant="outline" className="text-xs capitalize">
                {recommendation.priority}
              </Badge>
              <Badge variant="secondary" className="text-xs capitalize">
                {recommendation.category}
              </Badge>
              {recommendation.actionable && (
                <Badge variant="default" className="text-xs">
                  Actionnable
                </Badge>
              )}
              {applied.has(recommendation.id) && (
                <Badge variant="default" className="text-xs bg-green-600">
                  ✓ Appliquée
                </Badge>
              )}
            </div>

            {/* Actions */}
            {showActions && recommendation.actionable && !applied.has(recommendation.id) && (
              <div className="flex items-center justify-between">
                {recommendation.action && (
                  <div className="flex items-center text-xs text-primary">
                    <Target className="w-3 h-3 mr-1" />
                    <span>{recommendation.action.description}</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApply(recommendation)}
                  className="ml-auto"
                >
                  Appliquer
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <span>
            {applied.size} appliquée{applied.size > 1 ? 's' : ''}, {dismissed.size} ignorée{dismissed.size > 1 ? 's' : ''}
          </span>
          <span>IA v2.0</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecommendationPanel;