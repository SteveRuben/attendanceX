import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Mail, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { TicketStatistics as TicketStatsType, TicketStatus, TicketType } from '@/types/ticket.types';

interface TicketStatisticsProps {
  statistics: TicketStatsType | null;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

const getStatusIcon = (status: TicketStatus) => {
  switch (status) {
    case TicketStatus.PENDING:
      return Clock;
    case TicketStatus.CONFIRMED:
      return CheckCircle;
    case TicketStatus.CANCELLED:
      return XCircle;
    case TicketStatus.USED:
      return CheckCircle;
    case TicketStatus.EXPIRED:
      return AlertTriangle;
    default:
      return Clock;
  }
};

const getStatusColor = (status: TicketStatus) => {
  switch (status) {
    case TicketStatus.PENDING:
      return 'text-yellow-600';
    case TicketStatus.CONFIRMED:
      return 'text-green-600';
    case TicketStatus.CANCELLED:
      return 'text-red-600';
    case TicketStatus.USED:
      return 'text-blue-600';
    case TicketStatus.EXPIRED:
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
};

const getStatusLabel = (status: TicketStatus) => {
  switch (status) {
    case TicketStatus.PENDING:
      return 'En attente';
    case TicketStatus.CONFIRMED:
      return 'Confirmés';
    case TicketStatus.CANCELLED:
      return 'Annulés';
    case TicketStatus.USED:
      return 'Utilisés';
    case TicketStatus.EXPIRED:
      return 'Expirés';
    default:
      return status;
  }
};

const getTypeLabel = (type: TicketType) => {
  switch (type) {
    case TicketType.STANDARD:
      return 'Standard';
    case TicketType.VIP:
      return 'VIP';
    case TicketType.EARLY_BIRD:
      return 'Early Bird';
    case TicketType.GROUP:
      return 'Groupe';
    case TicketType.COMPLIMENTARY:
      return 'Gratuit';
    default:
      return type;
  }
};

export const TicketStatistics: React.FC<TicketStatisticsProps> = ({
  statistics,
  loading,
  error,
  onRefresh
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
            {onRefresh && (
              <Button variant="outline" onClick={onRefresh} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!statistics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2" />
            <p>Aucune statistique disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const checkInRate = statistics.total > 0 ? (statistics.checkInsCount / statistics.total) * 100 : 0;
  const emailRate = statistics.total > 0 ? (statistics.emailsSent / statistics.total) * 100 : 0;
  const cancellationRate = statistics.total > 0 ? (statistics.cancellationsCount / statistics.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header avec refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Statistiques détaillées</h3>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble des performances de vos billets
          </p>
        </div>
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        )}
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux de check-in</p>
                <p className="text-2xl font-bold">{checkInRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {statistics.checkInsCount} sur {statistics.total}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <Progress value={checkInRate} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Emails envoyés</p>
                <p className="text-2xl font-bold">{emailRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {statistics.emailsSent} sur {statistics.total}
                </p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <Progress value={emailRate} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Téléchargements</p>
                <p className="text-2xl font-bold">{statistics.downloadsCount}</p>
                <p className="text-xs text-muted-foreground">
                  {statistics.total > 0 ? (statistics.downloadsCount / statistics.total).toFixed(1) : 0} par billet
                </p>
              </div>
              <Download className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux d'annulation</p>
                <p className="text-2xl font-bold">{cancellationRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {statistics.cancellationsCount} annulés
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <Progress value={cancellationRate} className="mt-3" />
          </CardContent>
        </Card>
      </div>

      {/* Répartition par statut */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Répartition par statut
          </CardTitle>
          <CardDescription>
            Distribution des billets selon leur statut actuel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(statistics.byStatus).map(([status, count]) => {
              const StatusIcon = getStatusIcon(status as TicketStatus);
              const percentage = statistics.total > 0 ? (count / statistics.total) * 100 : 0;
              
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`h-5 w-5 ${getStatusColor(status as TicketStatus)}`} />
                    <span className="font-medium">{getStatusLabel(status as TicketStatus)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">{count}</p>
                      <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                    </div>
                    <div className="w-24">
                      <Progress value={percentage} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Répartition par type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Répartition par type
          </CardTitle>
          <CardDescription>
            Distribution des billets selon leur type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(statistics.byType).map(([type, count]) => {
              const percentage = statistics.total > 0 ? (count / statistics.total) * 100 : 0;
              
              return (
                <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{getTypeLabel(type as TicketType)}</p>
                    <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}% du total</p>
                  </div>
                  <Badge variant="secondary" className="text-lg font-semibold px-3 py-1">
                    {count}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Résumé des actions */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé des actions</CardTitle>
          <CardDescription>
            Aperçu des interactions avec les billets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 border rounded-lg">
              <p className="text-2xl font-bold text-green-600">{statistics.validTickets}</p>
              <p className="text-sm text-muted-foreground">Billets valides</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-2xl font-bold text-red-600">{statistics.expiredTickets}</p>
              <p className="text-sm text-muted-foreground">Billets expirés</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{statistics.emailsSent}</p>
              <p className="text-sm text-muted-foreground">Emails envoyés</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{statistics.downloadsCount}</p>
              <p className="text-sm text-muted-foreground">Téléchargements</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};