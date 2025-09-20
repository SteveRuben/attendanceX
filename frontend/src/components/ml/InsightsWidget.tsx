// src/components/ml/InsightsWidget.tsx - Widget d'insights IA
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/progress';
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target,
  Users,
  Calendar,
  BarChart3,
  ArrowRight,
  Sparkles,
  Brain
} from 'lucide-react';
import { mlService, type MLInsight, type MLTrend } from '../services';
import { toast } from 'react-toastify';

interface InsightsWidgetProps {
  type: 'user' | 'event' | 'department' | 'global';
  targetId?: string;
  timeframe?: {
    start: string;
    end: string;
  };
  maxInsights?: number;
  showTrends?: boolean;
  showRecommendations?: boolean;
  compact?: boolean;
  onInsightClick?: (insight: MLInsight) => void;
}

const InsightsWidget = ({
  type,
  targetId,
  timeframe,
  maxInsights = 3,
  showTrends = true,
  showRecommendations = true,
  compact = false,
  onInsightClick
}: InsightsWidgetProps) => {
  const [insights, setInsights] = useState<MLInsight[]>([]);
  const [trends, setTrends] = useState<MLTrend[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, [type, targetId, timeframe]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const defaultTimeframe = timeframe || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        end: new Date().toISOString()
      };

      const response = await mlService.generateInsights({
        type,
        targetId,
        timeframe: defaultTimeframe,
        includeRecommendations: showRecommendations
      });

      if (response.success && response.data) {
        setInsights(response.data.insights.slice(0, maxInsights));
        setTrends(response.data.trends);
        setRecommendations(response.data.recommendations);
      } else {
        setError('Impossible de charger les insights');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
      console.error('Error loading insights:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'user_preference': return <Users className="w-4 h-4" />;
      case 'scheduling': return <Calendar className="w-4 h-4" />;
      case 'performance': return <BarChart3 className="w-4 h-4" />;
      case 'trend': return <TrendingUp className="w-4 h-4" />;
      case 'seasonal': return <Calendar className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
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

  if (error) {
    return (
      <Card className={compact ? 'h-32' : 'h-48'}>
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <Brain className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm text-muted-foreground text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={loadInsights} className="mt-2">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0 && trends.length === 0) {
    return (
      <Card className={compact ? 'h-32' : 'h-48'}>
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground text-center">
            Aucun insight disponible pour cette période
          </p>
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
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Insights IA</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {insights.length} insight{insights.length > 1 ? 's' : ''}
            </Badge>
          </div>
          
          {insights.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                {getCategoryIcon(insights[0].category)}
                <span className="text-xs text-muted-foreground truncate">
                  {insights[0].title}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Progress 
                  value={insights[0].confidence * 100} 
                  className="h-1 flex-1 mr-2"
                />
                <span className="text-xs text-muted-foreground">
                  {Math.round(insights[0].confidence * 100)}%
                </span>
              </div>
            </div>
          )}
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
            <span>Insights IA</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {insights.length} insight{insights.length > 1 ? 's' : ''}
            </Badge>
            <Button variant="outline" size="sm" onClick={loadInsights}>
              Actualiser
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Insights principaux */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center">
              <Lightbulb className="w-4 h-4 mr-1" />
              Insights Clés
            </h4>
            {insights.map((insight, index) => (
              <div 
                key={index} 
                className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onInsightClick?.(insight)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(insight.category)}
                    <span className="font-medium text-sm">{insight.title}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getConfidenceColor(insight.confidence)}`}
                    >
                      {Math.round(insight.confidence * 100)}%
                    </Badge>
                    {insight.actionable && (
                      <Badge variant="secondary" className="text-xs">
                        Actionnable
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {insight.description}
                </p>

                {insight.action && (
                  <div className="flex items-center text-xs text-primary">
                    <Target className="w-3 h-3 mr-1" />
                    <span>{insight.action.description}</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tendances */}
        {showTrends && trends.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              Tendances
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {trends.slice(0, 3).map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(trend.direction)}
                    <span className="text-sm">{trend.metric}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      trend.direction === 'up' ? 'text-green-600' : 
                      trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                      {Math.abs(trend.change)}%
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getSignificanceColor(trend.significance)}`}
                    >
                      {trend.significance}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommandations */}
        {showRecommendations && recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center">
              <Target className="w-4 h-4 mr-1" />
              Recommandations
            </h4>
            <div className="space-y-2">
              {recommendations.slice(0, 2).map((recommendation, index) => (
                <div key={index} className="text-sm text-muted-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                  {recommendation}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <span>Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}</span>
          <span>IA v2.0</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default InsightsWidget;