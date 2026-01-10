import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Mail, 
  QrCode, 
  User, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { EventTicket, TicketStatus, TicketType } from '@/types/ticket.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TicketCardProps {
  ticket: EventTicket;
  onDownload?: (ticketId: string) => void;
  onSendEmail?: (ticketId: string) => void;
  onCheckIn?: (ticketId: string) => void;
  onCancel?: (ticketId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

const getStatusBadge = (status: TicketStatus) => {
  const variants = {
    [TicketStatus.PENDING]: {
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
      icon: Clock,
      label: 'En attente'
    },
    [TicketStatus.CONFIRMED]: {
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      icon: CheckCircle,
      label: 'Confirmé'
    },
    [TicketStatus.CANCELLED]: {
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      icon: XCircle,
      label: 'Annulé'
    },
    [TicketStatus.USED]: {
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
      icon: CheckCircle,
      label: 'Utilisé'
    },
    [TicketStatus.EXPIRED]: {
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
      icon: AlertTriangle,
      label: 'Expiré'
    }
  };

  const variant = variants[status];
  const Icon = variant.icon;

  return (
    <Badge className={variant.className}>
      <Icon className="h-3 w-3 mr-1" />
      {variant.label}
    </Badge>
  );
};

const getTypeBadge = (type: TicketType) => {
  const variants = {
    [TicketType.STANDARD]: { label: 'Standard', className: 'bg-gray-100 text-gray-800' },
    [TicketType.VIP]: { label: 'VIP', className: 'bg-purple-100 text-purple-800' },
    [TicketType.EARLY_BIRD]: { label: 'Early Bird', className: 'bg-orange-100 text-orange-800' },
    [TicketType.GROUP]: { label: 'Groupe', className: 'bg-blue-100 text-blue-800' },
    [TicketType.COMPLIMENTARY]: { label: 'Gratuit', className: 'bg-green-100 text-green-800' }
  };

  const variant = variants[type];
  return (
    <Badge variant="outline" className={variant.className}>
      {variant.label}
    </Badge>
  );
};

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onDownload,
  onSendEmail,
  onCheckIn,
  onCancel,
  showActions = true,
  compact = false
}) => {
  const canCheckIn = ticket.status === TicketStatus.CONFIRMED && !ticket.checkedInAt;
  const canCancel = ticket.status === TicketStatus.PENDING || ticket.status === TicketStatus.CONFIRMED;

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardHeader className={compact ? 'pb-3' : 'pb-4'}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              {ticket.participantName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {ticket.participantEmail}
            </p>
            {ticket.participantPhone && (
              <p className="text-sm text-muted-foreground">
                {ticket.participantPhone}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            {getStatusBadge(ticket.status)}
            {getTypeBadge(ticket.type)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informations du billet */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Numéro :</span>
            <p className="font-mono">{ticket.ticketNumber}</p>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Code sécurité :</span>
            <p className="font-mono">{ticket.securityCode}</p>
          </div>
        </div>

        {/* Prix si disponible */}
        {ticket.price && (
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Prix :</span>
            <span className="ml-2 font-semibold">
              {ticket.price} {ticket.currency || 'EUR'}
            </span>
          </div>
        )}

        {/* Dates importantes */}
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Créé le :</span>
            <span>{format(new Date(ticket.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}</span>
          </div>
          
          {ticket.checkedInAt && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Check-in :</span>
              <span>{format(new Date(ticket.checkedInAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}</span>
            </div>
          )}

          {ticket.validUntil && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-muted-foreground">Valide jusqu'au :</span>
              <span>{format(new Date(ticket.validUntil), 'dd/MM/yyyy à HH:mm', { locale: fr })}</span>
            </div>
          )}
        </div>

        {/* Statistiques */}
        {!compact && (
          <div className="grid grid-cols-3 gap-4 pt-2 border-t text-sm">
            <div className="text-center">
              <p className="font-semibold">{ticket.downloadCount}</p>
              <p className="text-muted-foreground">Téléchargements</p>
            </div>
            <div className="text-center">
              <p className="font-semibold">{ticket.emailSent ? 'Oui' : 'Non'}</p>
              <p className="text-muted-foreground">Email envoyé</p>
            </div>
            <div className="text-center">
              <p className="font-semibold">{ticket.checkedInAt ? 'Oui' : 'Non'}</p>
              <p className="text-muted-foreground">Check-in</p>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(ticket.id)}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            )}

            {onSendEmail && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendEmail(ticket.id)}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Envoyer
              </Button>
            )}

            {onCheckIn && canCheckIn && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onCheckIn(ticket.id)}
                className="flex items-center gap-2"
              >
                <QrCode className="h-4 w-4" />
                Check-in
              </Button>
            )}

            {onCancel && canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(ticket.id)}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Annuler
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};