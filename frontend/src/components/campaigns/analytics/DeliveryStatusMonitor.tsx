import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/badge';
import {
  Monitor,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  RefreshCw,
  Play,
  Pause,
  Activity
} from 'lucide-react';

interface DeliveryStatusMonitorProps {
  campaignId?: string;
  organizationId: string;
}

interface DeliveryStatus {
  status: 'queued' | 'sending' | 'sent' | 'paused' | 'failed' | 'completed';
  totalRecipients: number;
  processed: number;
  delivered: number;
  failed: number;
  pending: number;
  startedAt?: string;
  estimatedCompletion?: string;
  currentBatch?: {
    batchNumber: number;
    totalBatches: number;
    batchSize: number;
    processing: boolean;
  };
  errors: Array<{
    type: string;
    count: number;
    message: string;
  }>;
  throughput: {
    emailsPerMinute: number;
    averageResponseTime: number;
  };
}

export const DeliveryStatusMonitor: React.FC<DeliveryStatusMonitorProps> = ({
  campaignId,
  organizationId
}) => {
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  useEffect(() => {
    loadDeliveryStatus();
    
    // Mise à jour en temps réel si activée
    let interval: NodeJS.Timeout;
    if (realTimeUpdates && deliveryStatus?.status === 'sending') {
      interval = setInterval(loadDeliveryStatus, 5000); // Mise à jour toutes les 5 secondes
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [campaignId, organizationId, realTimeUpdates]);

  const loadDeliveryStatus = async () => {
    try {
      setLoading(true);
      
      // Mock data - à remplacer par l'API réelle
      const mockStatus: DeliveryStatus = {
        status: 'sending',
        totalRecipients: 1250,
        processed: 856,
        delivered: 798,
        failed: 58,
        pending: 394,
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Il y a 2 heures
        estimatedCompletion: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // Dans 45 minutes
        currentBatch: {
          batchNumber: 9,
          totalBatches: 13,
          batchSize: 100,
          processing: true
        },
        errors: [
          { type: 'bounce_hard', count: 32, message: 'Adresses email invalides' },
          { type: 'bounce_soft', count: 18, message: 'Boîtes de réception pleines' },
          { type: 'spam_filter', count: 8, message: 'Bloqué par les filtres anti-spam' }
        ],
        throughput: {
          emailsPerMinute: 125,
          averageResponseTime: 2.3
        }
      };
      
      setDeliveryStatus(mockStatus);
    } catch (error) {
      console.error('Error loading delivery status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: DeliveryStatus['status']) => {
    const configs = {
      queued: { 
        icon: Clock, 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-100', 
        label: 'En attente',
        description: 'La campagne est en file d\'attente'
      },
      sending: { 
        icon: Activity, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100', 
        label: 'En cours d\'envoi',
        description: 'Envoi en cours...'
      },
      sent: { 
        icon: CheckCircle, 
        color: 'text-green-600', 
        bgColor: 'bg-green-100', 
        label: 'Envoyé',
        description: 'Envoi terminé avec succès'
      },
      paused: { 
        icon: Pause, 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-100', 
        label: 'En pause',
        description: 'Envoi mis en pause'
      },
      failed: { 
        icon: XCircle, 
        color: 'text-red-600', 
        bgColor: 'bg-red-100', 
        label: 'Échec',
        description: 'Erreur lors de l\'envoi'
      },
      completed: { 
        icon: CheckCircle, 
        color: 'text-green-600', 
        bgColor: 'bg-green-100', 
        label: 'Terminé',
        description: 'Campagne terminée'
      }
    };
    
    return configs[status];
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}min`;
    }
    return `${diffMins}min`;
  };

  const formatEstimatedTime = (estimatedTime: string) => {
    const estimated = new Date(estimatedTime);
    const now = new Date();
    const diffMs = estimated.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins <= 0) return 'Bientôt terminé';
    if (diffMins < 60) return `${diffMins} min restantes`;
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min restantes`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deliveryStatus) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Monitor className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Aucune donnée de livraison disponible</p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = getStatusConfig(deliveryStatus.status);
  const StatusIcon = statusConfig.icon;
  const progressPercentage = (deliveryStatus.processed / deliveryStatus.totalRecipients) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Monitoring de Livraison
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRealTimeUpdates(!realTimeUpdates)}
              className={realTimeUpdates ? 'text-green-600' : 'text-gray-400'}
            >
              <Activity className="h-4 w-4 mr-1" />
              Temps réel
            </Button>
            <Button variant="ghost" size="sm" onClick={loadDeliveryStatus}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Statut principal */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-12 h-12 ${statusConfig.bgColor} rounded-lg flex items-center justify-center`}>
            <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {statusConfig.label}
              </h3>
              {deliveryStatus.status === 'sending' && (
                <Badge variant="default" className="animate-pulse">
                  En cours
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">{statusConfig.description}</p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progression de l'envoi
            </span>
            <span className="text-sm text-gray-600">
              {deliveryStatus.processed.toLocaleString()} / {deliveryStatus.totalRecipients.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {progressPercentage.toFixed(1)}% terminé
          </div>
        </div>

        {/* Métriques de livraison */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-900">
              {deliveryStatus.delivered.toLocaleString()}
            </div>
            <div className="text-sm text-green-700">Livrés</div>
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-900">
              {deliveryStatus.failed.toLocaleString()}
            </div>
            <div className="text-sm text-red-700">Échecs</div>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-lg font-bold text-yellow-900">
              {deliveryStatus.pending.toLocaleString()}
            </div>
            <div className="text-sm text-yellow-700">En attente</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-900">
              {deliveryStatus.throughput.emailsPerMinute}
            </div>
            <div className="text-sm text-blue-700">Emails/min</div>
          </div>
        </div>

        {/* Informations de batch (si en cours d'envoi) */}
        {deliveryStatus.currentBatch && deliveryStatus.status === 'sending' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Batch en cours de traitement
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Batch:</span>
                <span className="font-medium ml-2">
                  {deliveryStatus.currentBatch.batchNumber} / {deliveryStatus.currentBatch.totalBatches}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Taille:</span>
                <span className="font-medium ml-2">
                  {deliveryStatus.currentBatch.batchSize} emails
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Timing */}
        {deliveryStatus.startedAt && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900">Durée d'envoi</div>
                <div className="text-sm text-gray-600">
                  {formatDuration(deliveryStatus.startedAt)}
                </div>
              </div>
            </div>
            
            {deliveryStatus.estimatedCompletion && deliveryStatus.status === 'sending' && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Temps restant estimé</div>
                  <div className="text-sm text-gray-600">
                    {formatEstimatedTime(deliveryStatus.estimatedCompletion)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Erreurs */}
        {deliveryStatus.errors.length > 0 && (
          <div className="border-t pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Erreurs de livraison ({deliveryStatus.errors.reduce((sum, e) => sum + e.count, 0)})
            </h4>
            
            <div className="space-y-2">
              {deliveryStatus.errors.map((error, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-red-900">
                      {error.message}
                    </div>
                    <div className="text-xs text-red-700">
                      Type: {error.type}
                    </div>
                  </div>
                  <Badge variant="destructive">
                    {error.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Performance de livraison
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Débit moyen</span>
              <span className="text-sm font-medium">
                {deliveryStatus.throughput.emailsPerMinute} emails/min
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Temps de réponse</span>
              <span className="text-sm font-medium">
                {deliveryStatus.throughput.averageResponseTime}s
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};