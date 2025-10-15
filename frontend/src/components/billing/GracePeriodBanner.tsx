/**
 * Composant banner pour afficher le statut de la période de grâce
 * Affiche le temps restant et les boutons d'action pour choisir un plan
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ArrowRight,
  Calendar,
  Zap,
  Gift
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { billingService } from '../../services/billingService';
import { GracePeriodStatus } from '../../shared/types/billing.types';

interface GracePeriodBannerProps {
  /** Statut initial de la période de grâce */
  initialStatus?: GracePeriodStatus;
  /** Callback appelé quand le banner est fermé */
  onDismiss?: () => void;
  /** Afficher le bouton de fermeture */
  showDismiss?: boolean;
  /** Position du banner */
  position?: 'top' | 'bottom' | 'inline';
  /** Taille du banner */
  size?: 'sm' | 'md' | 'lg';
  /** Classe CSS personnalisée */
  className?: string;
  /** Actualisation automatique */
  autoRefresh?: boolean;
  /** Intervalle d'actualisation en secondes */
  refreshInterval?: number;
}

export const GracePeriodBanner: React.FC<GracePeriodBannerProps> = ({
  initialStatus,
  onDismiss,
  showDismiss = false,
  position = 'top',
  size = 'md',
  className = '',
  autoRefresh = true,
  refreshInterval = 60
}) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<GracePeriodStatus | null>(initialStatus || null);
  const [isLoading, setIsLoading] = useState(!initialStatus);
  const [isDismissed, setIsDismissed] = useState(false);

  // Charger le statut de la période de grâce
  const loadStatus = async () => {
    try {
      const gracePeriodStatus = await billingService.getMyGracePeriodStatus();
      setStatus(gracePeriodStatus);
    } catch (error) {
      console.error('Error loading grace period status:', error);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger le statut initial
  useEffect(() => {
    if (!initialStatus) {
      loadStatus();
    }
  }, [initialStatus]);

  // Actualisation automatique
  useEffect(() => {
    if (!autoRefresh || !status?.hasActiveGracePeriod) return;

    const interval = setInterval(loadStatus, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, status?.hasActiveGracePeriod]);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleChoosePlan = () => {
    navigate('/pricing');
  };

  const handleUpgradeNow = () => {
    navigate('/billing/upgrade');
  };

  const getUrgencyLevel = () => {
    if (!status?.hasActiveGracePeriod || !status.daysRemaining) return 'normal';
    
    if (status.daysRemaining <= 1) return 'critical';
    if (status.daysRemaining <= 3) return 'warning';
    return 'normal';
  };

  const getUrgencyColors = () => {
    const urgency = getUrgencyLevel();
    
    switch (urgency) {
      case 'critical':
        return {
          bg: 'bg-red-500',
          text: 'text-white',
          border: 'border-red-600',
          progress: 'bg-red-600'
        };
      case 'warning':
        return {
          bg: 'bg-orange-500',
          text: 'text-white',
          border: 'border-orange-600',
          progress: 'bg-orange-600'
        };
      default:
        return {
          bg: 'bg-blue-500',
          text: 'text-white',
          border: 'border-blue-600',
          progress: 'bg-blue-600'
        };
    }
  };

  const getTimeDisplay = () => {
    if (!status?.hasActiveGracePeriod) return '';
    
    if (status.isOverdue) {
      return 'Période expirée';
    }
    
    if (status.daysRemaining === 0) {
      return `${status.hoursRemaining || 0}h restantes`;
    }
    
    return `${status.daysRemaining} jour${status.daysRemaining > 1 ? 's' : ''} restant${status.daysRemaining > 1 ? 's' : ''}`;
  };

  const getUrgencyIcon = () => {
    const urgency = getUrgencyLevel();
    
    switch (urgency) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5" />;
      case 'warning':
        return <Clock className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getUrgencyMessage = () => {
    const urgency = getUrgencyLevel();
    
    switch (urgency) {
      case 'critical':
        return 'Action requise immédiatement !';
      case 'warning':
        return 'Votre période de grâce expire bientôt';
      default:
        return 'Période de grâce active';
    }
  };

  const sizeClasses = {
    sm: 'py-2 px-4 text-sm',
    md: 'py-3 px-6 text-base',
    lg: 'py-4 px-8 text-lg'
  };

  const positionClasses = {
    top: 'fixed top-0 left-0 right-0 z-50',
    bottom: 'fixed bottom-0 left-0 right-0 z-50',
    inline: 'relative'
  };

  // Ne pas afficher si pas de période de grâce active, en cours de chargement, ou fermé
  if (isLoading || !status?.hasActiveGracePeriod || isDismissed) {
    return null;
  }

  const colors = getUrgencyColors();

  return (
    <div className={`
      ${positionClasses[position]} 
      ${colors.bg} ${colors.text} 
      border-b-2 ${colors.border}
      shadow-lg
      ${className}
    `}>
      <div className={`
        max-w-7xl mx-auto flex items-center justify-between
        ${sizeClasses[size]}
      `}>
        {/* Contenu principal */}
        <div className="flex items-center space-x-4 flex-1">
          {/* Icône d'urgence */}
          <div className="flex-shrink-0">
            {getUrgencyIcon()}
          </div>
          
          {/* Message principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <span className="font-semibold">
                {getUrgencyMessage()}
              </span>
              
              <Badge 
                variant="secondary" 
                className="bg-white/20 text-white border-white/30"
              >
                {getTimeDisplay()}
              </Badge>
            </div>
            
            {/* Barre de progression */}
            {status.progressPercentage !== undefined && (
              <div className="mt-2 max-w-xs">
                <Progress 
                  value={status.progressPercentage} 
                  className="h-2 bg-white/20"
                  indicatorClassName={colors.progress}
                />
                <div className="text-xs mt-1 opacity-90">
                  {status.progressPercentage}% de la période écoulée
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* Bouton principal selon l'urgence */}
          {getUrgencyLevel() === 'critical' ? (
            <Button
              onClick={handleUpgradeNow}
              size="sm"
              className="bg-white text-red-600 hover:bg-gray-100 font-semibold"
            >
              <Zap className="w-4 h-4 mr-2" />
              Choisir un plan maintenant
            </Button>
          ) : (
            <Button
              onClick={handleChoosePlan}
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-white/10 hover:border-white"
            >
              <Gift className="w-4 h-4 mr-2" />
              Voir les plans
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {/* Bouton de fermeture */}
          {showDismiss && (
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 p-2"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Détails supplémentaires pour les grandes tailles */}
      {size === 'lg' && status.gracePeriod && (
        <div className="border-t border-white/20 bg-black/10">
          <div className="max-w-7xl mx-auto px-8 py-3">
            <div className="flex items-center justify-between text-sm opacity-90">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    Début : {new Date(status.gracePeriod.startDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>
                    Fin : {new Date(status.gracePeriod.endDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
              
              <div className="text-xs">
                Source : {status.gracePeriod.source}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GracePeriodBanner;