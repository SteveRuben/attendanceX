/**
 * Composant d'affichage des métriques d'utilisation
 * Montre l'utilisation actuelle par rapport aux limites du plan
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Progress } from '../ui/progress';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Users, 
  Calendar, 
  HardDrive, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  Info,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { TenantUsage, PlanLimits, OveragePreview } from '../../services/billingService';
import { billingService } from '../../services/billingService';
import { formatNumber, formatBytes, formatPercentage } from '../../utils/formatters';

interface UsageMetricsProps {
  usage: TenantUsage;
  limits: PlanLimits;
}

interface UsageMetric {
  key: keyof TenantUsage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  current: number;
  limit: number;
  unit: string;
  formatter?: (value: number) => string;
  description: string;
}

export const UsageMetrics: React.FC<UsageMetricsProps> = ({ usage, limits }) => {
  const [overagePreview, setOveragePreview] = useState<OveragePreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOveragePreview();
  }, []);

  const loadOveragePreview = async () => {
    try {
      setLoading(true);
      const preview = await billingService.getOveragePreview();
      setOveragePreview(preview);
    } catch (error) {
      console.error('Error loading overage preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const metrics: UsageMetric[] = [
    {
      key: 'users',
      label: 'Utilisateurs',
      icon: Users,
      current: usage.users,
      limit: limits.maxUsers,
      unit: 'utilisateurs',
      formatter: formatNumber,
      description: 'Nombre d\'utilisateurs actifs dans votre organisation'
    },
    {
      key: 'events',
      label: 'Événements',
      icon: Calendar,
      current: usage.events,
      limit: limits.maxEvents,
      unit: 'événements',
      formatter: formatNumber,
      description: 'Nombre d\'événements créés ce mois-ci'
    },
    {
      key: 'storage',
      label: 'Stockage',
      icon: HardDrive,
      current: usage.storage,
      limit: limits.maxStorage,
      unit: 'MB',
      formatter: (value) => formatBytes(value * 1024 * 1024),
      description: 'Espace de stockage utilisé pour vos fichiers et données'
    },
    {
      key: 'apiCalls',
      label: 'Appels API',
      icon: Zap,
      current: usage.apiCalls,
      limit: limits.apiCallsPerMonth,
      unit: 'appels',
      formatter: formatNumber,
      description: 'Nombre d\'appels API effectués ce mois-ci'
    }
  ];

  const getUsagePercentage = (current: number, limit: number): number => {
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageStatus = (percentage: number): {
    color: string;
    bgColor: string;
    textColor: string;
    status: string;
  } => {
    if (percentage >= 100) {
      return {
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        status: 'Limite dépassée'
      };
    } else if (percentage >= 90) {
      return {
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-700',
        status: 'Limite proche'
      };
    } else if (percentage >= 75) {
      return {
        color: 'bg-yellow-500',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        status: 'Utilisation élevée'
      };
    } else {
      return {
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        status: 'Utilisation normale'
      };
    }
  };

  const hasOverages = overagePreview?.hasOverages || false;
  const totalOverages = metrics.filter(metric => 
    getUsagePercentage(metric.current, metric.limit) >= 100
  ).length;

  return (
    <div className="space-y-6">
      {/* Alertes globales */}
      {hasOverages && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Vous avez dépassé les limites de votre plan sur {totalOverages} métrique{totalOverages > 1 ? 's' : ''}. 
            Des frais supplémentaires s'appliquent.
          </AlertDescription>
        </Alert>
      )}

      {/* Métriques d'utilisation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((metric) => {
          const percentage = getUsagePercentage(metric.current, metric.limit);
          const status = getUsageStatus(percentage);
          const Icon = metric.icon;
          const isOverLimit = percentage >= 100;

          return (
            <Card key={metric.key} className={isOverLimit ? 'border-red-200' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {metric.label}
                </CardTitle>
                <Badge 
                  variant={isOverLimit ? 'destructive' : percentage >= 75 ? 'secondary' : 'default'}
                  className="text-xs"
                >
                  {formatPercentage(percentage)}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Valeurs actuelles */}
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-2xl font-bold">
                        {metric.formatter ? metric.formatter(metric.current) : metric.current}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        sur {metric.formatter ? metric.formatter(metric.limit) : metric.limit} {metric.unit}
                      </p>
                    </div>
                    {isOverLimit && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-600">
                          +{metric.current - metric.limit} {metric.unit}
                        </div>
                        <p className="text-xs text-red-500">Dépassement</p>
                      </div>
                    )}
                  </div>

                  {/* Barre de progression */}
                  <div className="space-y-2">
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className="h-2"
                    />
                    {isOverLimit && (
                      <Progress 
                        value={((metric.current - metric.limit) / metric.limit) * 100} 
                        className="h-1 opacity-60"
                      />
                    )}
                  </div>

                  {/* Statut et description */}
                  <div className={`p-2 rounded-lg ${status.bgColor}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${status.textColor}`}>
                        {status.status}
                      </span>
                      {percentage >= 90 && (
                        <ArrowUp className={`h-3 w-3 ${status.textColor}`} />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {metric.description}
                    </p>
                  </div>

                  {/* Informations sur les overages */}
                  {isOverLimit && overagePreview && (
                    <div className="border-t pt-2">
                      {overagePreview.overages
                        .filter(overage => overage.metric.toLowerCase().includes(metric.key))
                        .map((overage, index) => (
                          <div key={index} className="text-xs text-red-600">
                            Coût supplémentaire: {overage.totalCost}€
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Résumé des overages */}
      {overagePreview && overagePreview.hasOverages && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <TrendingUp className="h-5 w-5" />
              Coûts supplémentaires ce mois-ci
            </CardTitle>
            <CardDescription>
              Détail des dépassements et frais associés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overagePreview.overages.map((overage, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium">{overage.metric}</p>
                    <p className="text-sm text-gray-600">
                      {formatNumber(overage.actualUsage)} utilisés 
                      (limite: {formatNumber(overage.baseLimit)})
                    </p>
                    <p className="text-xs text-gray-500">
                      Dépassement: {formatNumber(overage.overageAmount)} unités
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">
                      {overage.totalCost}€
                    </p>
                    <p className="text-sm text-gray-600">
                      {overage.unitPrice}€ / unité
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-3">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total des dépassements</span>
                  <span className="text-orange-600">
                    {overagePreview.totalOverageCost}€
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Ces frais seront ajoutés à votre prochaine facture
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conseils d'optimisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Conseils d'optimisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics
              .filter(metric => getUsagePercentage(metric.current, metric.limit) >= 75)
              .map((metric) => (
                <div key={metric.key} className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-blue-900">
                    {metric.label} - {formatPercentage(getUsagePercentage(metric.current, metric.limit))} utilisé
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {getOptimizationTip(metric.key)}
                  </p>
                </div>
              ))
            }
            
            {metrics.every(metric => getUsagePercentage(metric.current, metric.limit) < 75) && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="font-medium text-green-900">
                  Excellente utilisation !
                </p>
                <p className="text-sm text-green-700">
                  Votre utilisation est optimale. Continuez ainsi !
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const getOptimizationTip = (metricKey: keyof TenantUsage): string => {
  const tips = {
    users: 'Considérez désactiver les utilisateurs inactifs ou passer à un plan supérieur.',
    events: 'Archivez les anciens événements ou optimisez la création d\'événements récurrents.',
    storage: 'Supprimez les fichiers inutiles ou compressez les documents volumineux.',
    apiCalls: 'Optimisez vos intégrations pour réduire le nombre d\'appels API ou utilisez la mise en cache.'
  };
  
  return tips[metricKey] || 'Contactez le support pour des conseils personnalisés.';
};

export default UsageMetrics;