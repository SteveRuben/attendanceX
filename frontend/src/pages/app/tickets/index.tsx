import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Ticket, 
  Search, 
  Filter, 
  Calendar,
  Users,
  QrCode,
  AlertTriangle,
  Loader2,
  Download,
  Mail
} from 'lucide-react';
import { TicketCard } from '@/components/tickets/TicketCard';
import { EmptyState } from '@/components/ui/empty-state';
import { useTickets } from '@/hooks/useTickets';
import { ticketService } from '@/services/ticketService';
import { TicketStatus, TicketType } from '@/types/ticket.types';
import { toast } from 'sonner';

export default function AllTicketsPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Note: Dans une vraie implémentation, il faudrait un hook pour récupérer tous les billets
  // ou modifier useTickets pour supporter les requêtes globales
  const {
    tickets,
    pagination,
    loading,
    error,
    filters,
    sort,
    setFilters,
    setSort,
    setPage,
    refresh
  } = useTickets({
    eventId: selectedEventId || 'all', // Adapter le hook pour supporter 'all'
    autoFetch: false // Ne pas auto-fetch sans eventId
  });

  const handleDownloadTicket = async (ticketId: string) => {
    try {
      await ticketService.downloadTicketAsFile(ticketId);
      toast.success('Billet téléchargé avec succès');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du téléchargement');
    }
  };

  const handleSendTicketEmail = async (ticketId: string) => {
    try {
      await ticketService.sendTicketEmail(ticketId, {
        includeCalendarInvite: true,
        includeEventDetails: true
      });
      toast.success('Email envoyé avec succès');
      refresh();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi de l\'email');
    }
  };

  const handleCheckInTicket = async (ticketId: string) => {
    try {
      await ticketService.checkInTicket(ticketId);
      toast.success('Check-in effectué avec succès');
      refresh();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du check-in');
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
    try {
      await ticketService.cancelTicket(ticketId, 'Annulé par l\'organisateur');
      toast.success('Billet annulé avec succès');
      refresh();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'annulation');
    }
  };

  const handleSearch = () => {
    setFilters({
      ...filters,
      search: globalSearch || undefined
    });
  };

  const handleStatusFilter = (status: string) => {
    if (status === 'all') {
      setFilters({ ...filters, status: undefined });
    } else {
      setFilters({ ...filters, status: [status as TicketStatus] });
    }
    setStatusFilter(status);
  };

  const handleTypeFilter = (type: string) => {
    if (type === 'all') {
      setFilters({ ...filters, type: undefined });
    } else {
      setFilters({ ...filters, type: [type as TicketType] });
    }
    setTypeFilter(type);
  };

  return (
    <AppShell title="Tous les billets">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              Tous les billets
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vue d'ensemble de tous les billets de vos événements
            </p>
          </div>

          {/* Erreur globale */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Filtres globaux */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Recherche et filtres
              </CardTitle>
              <CardDescription>
                Recherchez et filtrez les billets de tous vos événements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Recherche globale */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, email, numéro..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>

                {/* Filtre par statut */}
                <Select value={statusFilter} onValueChange={handleStatusFilter}>
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
                <Select value={typeFilter} onValueChange={handleTypeFilter}>
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

                {/* Bouton de recherche */}
                <Button onClick={handleSearch} className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Rechercher
                </Button>
              </div>

              {/* Filtres actifs */}
              {(globalSearch || statusFilter !== 'all' || typeFilter !== 'all') && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Filtres actifs :</span>
                  
                  {globalSearch && (
                    <Badge variant="secondary" className="gap-1">
                      Recherche: {globalSearch}
                      <button
                        onClick={() => {
                          setGlobalSearch('');
                          handleSearch();
                        }}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}

                  {statusFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      Statut: {statusFilter}
                      <button
                        onClick={() => handleStatusFilter('all')}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}

                  {typeFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {typeFilter}
                      <button
                        onClick={() => handleTypeFilter('all')}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setGlobalSearch('');
                      setStatusFilter('all');
                      setTypeFilter('all');
                      setFilters({});
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    Effacer tout
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/app/tickets/validate'}>
              <CardContent className="p-6 text-center">
                <QrCode className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold">Validation</h3>
                <p className="text-sm text-muted-foreground">Scanner et valider les billets</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/app/events'}>
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold">Événements</h3>
                <p className="text-sm text-muted-foreground">Gérer vos événements</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/app/users'}>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-semibold">Participants</h3>
                <p className="text-sm text-muted-foreground">Gérer les participants</p>
              </CardContent>
            </Card>
          </div>

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
                  : "Aucun billet n'a été créé. Créez votre premier événement pour commencer."
              }
              action={{
                label: 'Voir les événements',
                onClick: () => window.location.href = '/app/events'
              }}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {tickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onDownload={handleDownloadTicket}
                    onSendEmail={handleSendTicketEmail}
                    onCheckIn={handleCheckInTicket}
                    onCancel={handleCancelTicket}
                    showActions={true}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} sur {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage(pagination.page - 1)}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPage(pagination.page + 1)}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Note d'information */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Gestion centralisée des billets
                  </p>
                  <p className="text-blue-700 dark:text-blue-200 mt-1">
                    Cette page vous permet de voir tous les billets de vos événements. 
                    Pour une gestion détaillée, accédez à la page de billets de chaque événement spécifique.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}