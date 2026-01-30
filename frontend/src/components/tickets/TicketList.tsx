import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter, Download, Mail, Plus, RefreshCw } from 'lucide-react';
import { TicketCard } from './TicketCard';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  EventTicket, 
  TicketStatus, 
  TicketType, 
  TicketFilters, 
  TicketSortOptions 
} from '@/types/ticket.types';

interface TicketListProps {
  tickets: EventTicket[];
  loading: boolean;
  error: string | null;
  filters: TicketFilters;
  sort: TicketSortOptions;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  onFiltersChange: (filters: TicketFilters) => void;
  onSortChange: (sort: TicketSortOptions) => void;
  onPageChange?: (page: number) => void;
  onDownloadTicket?: (ticketId: string) => void;
  onSendTicketEmail?: (ticketId: string) => void;
  onCheckInTicket?: (ticketId: string) => void;
  onCancelTicket?: (ticketId: string) => void;
  onCreateTicket?: () => void;
  onBulkDownload?: () => void;
  onBulkEmail?: () => void;
  onRefresh?: () => void;
  showActions?: boolean;
  title?: string;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  loading,
  error,
  filters,
  sort,
  pagination,
  onFiltersChange,
  onSortChange,
  onPageChange,
  onDownloadTicket,
  onSendTicketEmail,
  onCheckInTicket,
  onCancelTicket,
  onCreateTicket,
  onBulkDownload,
  onBulkEmail,
  onRefresh,
  showActions = true,
  title = 'Billets'
}) => {
  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search: search || undefined });
  };

  const handleStatusFilter = (status: string) => {
    if (status === 'all') {
      onFiltersChange({ ...filters, status: undefined });
    } else {
      onFiltersChange({ ...filters, status: [status as TicketStatus] });
    }
  };

  const handleTypeFilter = (type: string) => {
    if (type === 'all') {
      onFiltersChange({ ...filters, type: undefined });
    } else {
      onFiltersChange({ ...filters, type: [type as TicketType] });
    }
  };

  const handleSortChange = (field: string) => {
    const newDirection = sort.field === field && sort.direction === 'desc' ? 'asc' : 'desc';
    onSortChange({ field: field as TicketSortOptions['field'], direction: newDirection });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
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

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          {pagination && (
            <p className="text-sm text-muted-foreground mt-1">
              {pagination.total > 0 
                ? `${((pagination.page - 1) * pagination.limit) + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} sur ${pagination.total}`
                : 'Aucun billet'
              }
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          )}

          {onBulkDownload && tickets.length > 0 && (
            <Button variant="outline" onClick={onBulkDownload}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger tout
            </Button>
          )}

          {onBulkEmail && tickets.length > 0 && (
            <Button variant="outline" onClick={onBulkEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Envoyer tout
            </Button>
          )}

          {onCreateTicket && (
            <Button onClick={onCreateTicket}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau billet
            </Button>
          )}
        </div>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et recherche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email..."
                value={filters.search || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtre par statut */}
            <Select
              value={filters.status?.[0] || 'all'}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value={TicketStatus.PENDING}>En attente</SelectItem>
                <SelectItem value={TicketStatus.CONFIRMED}>Confirmé</SelectItem>
                <SelectItem value={TicketStatus.USED}>Utilisé</SelectItem>
                <SelectItem value={TicketStatus.CANCELLED}>Annulé</SelectItem>
                <SelectItem value={TicketStatus.EXPIRED}>Expiré</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtre par type */}
            <Select
              value={filters.type?.[0] || 'all'}
              onValueChange={handleTypeFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value={TicketType.STANDARD}>Standard</SelectItem>
                <SelectItem value={TicketType.VIP}>VIP</SelectItem>
                <SelectItem value={TicketType.EARLY_BIRD}>Early Bird</SelectItem>
                <SelectItem value={TicketType.GROUP}>Groupe</SelectItem>
                <SelectItem value={TicketType.COMPLIMENTARY}>Gratuit</SelectItem>
              </SelectContent>
            </Select>

            {/* Tri */}
            <Select
              value={`${sort.field}-${sort.direction}`}
              onValueChange={(value) => {
                const [field, direction] = value.split('-');
                onSortChange({ 
                  field: field as TicketSortOptions['field'], 
                  direction: direction as 'asc' | 'desc' 
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Plus récent</SelectItem>
                <SelectItem value="createdAt-asc">Plus ancien</SelectItem>
                <SelectItem value="participantName-asc">Nom A-Z</SelectItem>
                <SelectItem value="participantName-desc">Nom Z-A</SelectItem>
                <SelectItem value="status-asc">Statut A-Z</SelectItem>
                <SelectItem value="type-asc">Type A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtres actifs */}
          {(filters.search || filters.status?.length || filters.type?.length) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Filtres actifs :</span>
              
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Recherche: {filters.search}
                  <button
                    onClick={() => handleSearchChange('')}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {filters.status?.map(status => (
                <Badge key={status} variant="secondary" className="gap-1">
                  Statut: {status}
                  <button
                    onClick={() => handleStatusFilter('all')}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              ))}

              {filters.type?.map(type => (
                <Badge key={type} variant="secondary" className="gap-1">
                  Type: {type}
                  <button
                    onClick={() => handleTypeFilter('all')}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange({})}
                className="h-6 px-2 text-xs"
              >
                Effacer tout
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des billets */}
      {loading ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : tickets.length === 0 ? (
        <EmptyState
          title="Aucun billet trouvé"
          description={
            Object.keys(filters).length > 0
              ? "Aucun billet ne correspond aux filtres sélectionnés"
              : "Aucun billet n'a été créé pour cet événement"
          }
          action={onCreateTicket ? {
            label: 'Créer un billet',
            onClick: onCreateTicket
          } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onDownload={onDownloadTicket}
              onSendEmail={onSendTicketEmail}
              onCheckIn={onCheckInTicket}
              onCancel={onCancelTicket}
              showActions={showActions}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} sur {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};