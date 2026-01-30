import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Ticket, 
  TrendingUp, 
  Users, 
  Mail, 
  Download,
  QrCode,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { TicketList } from '@/components/tickets/TicketList';
import { TicketStatistics } from '@/components/tickets/TicketStatistics';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { BulkTicketDialog } from '@/components/tickets/BulkTicketDialog';
import { useTickets } from '@/hooks/useTickets';
import { useTicketStatistics } from '@/hooks/useTicketStatistics';
import { ticketService } from '@/services/ticketService';
import { toast } from 'sonner';

export default function EventTicketsPage() {
  const router = useRouter();
  const { id: eventId } = router.query;
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

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
    eventId: eventId as string,
    autoFetch: !!eventId
  });

  const {
    statistics,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats
  } = useTicketStatistics({
    eventId: eventId as string,
    autoFetch: !!eventId,
    refreshInterval: 30000 // Refresh every 30 seconds
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
      refreshStats();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du check-in');
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
    try {
      await ticketService.cancelTicket(ticketId, 'Annulé par l\'organisateur');
      toast.success('Billet annulé avec succès');
      refresh();
      refreshStats();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'annulation');
    }
  };

  const handleBulkDownload = async () => {
    setBulkActionLoading(true);
    try {
      // Download all tickets as individual files
      const downloadPromises = tickets.map(ticket => 
        ticketService.downloadTicketAsFile(ticket.id, `ticket-${ticket.ticketNumber}.pdf`)
      );
      await Promise.all(downloadPromises);
      toast.success(`${tickets.length} billets téléchargés avec succès`);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du téléchargement en lot');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkEmail = async () => {
    setBulkActionLoading(true);
    try {
      const emailPromises = tickets
        .filter(ticket => !ticket.emailSent)
        .map(ticket => 
          ticketService.sendTicketEmail(ticket.id, {
            includeCalendarInvite: true,
            includeEventDetails: true
          })
        );
      
      await Promise.all(emailPromises);
      toast.success(`Emails envoyés avec succès`);
      refresh();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi en lot');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleTicketCreated = () => {
    setShowCreateDialog(false);
    refresh();
    refreshStats();
    toast.success('Billet créé avec succès');
  };

  const handleBulkTicketsCreated = () => {
    setShowBulkDialog(false);
    refresh();
    refreshStats();
    toast.success('Billets créés avec succès');
  };

  if (!eventId) {
    return (
      <AppShell title="Billets">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Gestion des billets">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              Gestion des billets
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les billets de votre événement, suivez les inscriptions et les check-ins
            </p>
          </div>

          {/* Erreurs globales */}
          {(error || statsError) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error || statsError}
              </AlertDescription>
            </Alert>
          )}

          {/* Statistiques rapides */}
          {statistics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total billets</p>
                      <p className="text-2xl font-bold">{statistics.total}</p>
                    </div>
                    <Ticket className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Check-ins</p>
                      <p className="text-2xl font-bold">{statistics.checkInsCount}</p>
                    </div>
                    <QrCode className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Emails envoyés</p>
                      <p className="text-2xl font-bold">{statistics.emailsSent}</p>
                    </div>
                    <Mail className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Téléchargements</p>
                      <p className="text-2xl font-bold">{statistics.downloadsCount}</p>
                    </div>
                    <Download className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Onglets principaux */}
          <Tabs defaultValue="tickets" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tickets" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Billets
              </TabsTrigger>
              <TabsTrigger value="statistics" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Statistiques
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="space-y-6">
              <TicketList
                tickets={tickets}
                loading={loading || bulkActionLoading}
                error={error}
                filters={filters}
                sort={sort}
                pagination={pagination}
                onFiltersChange={setFilters}
                onSortChange={setSort}
                onPageChange={setPage}
                onDownloadTicket={handleDownloadTicket}
                onSendTicketEmail={handleSendTicketEmail}
                onCheckInTicket={handleCheckInTicket}
                onCancelTicket={handleCancelTicket}
                onCreateTicket={() => setShowCreateDialog(true)}
                onBulkDownload={handleBulkDownload}
                onBulkEmail={handleBulkEmail}
                onRefresh={refresh}
                title="Liste des billets"
              />

              {/* Actions rapides */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions rapides</CardTitle>
                  <CardDescription>
                    Créez des billets individuels ou en lot pour votre événement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Ticket className="h-4 w-4 mr-2" />
                      Créer un billet
                    </Button>
                    <Button variant="outline" onClick={() => setShowBulkDialog(true)}>
                      <Users className="h-4 w-4 mr-2" />
                      Créer en lot
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics" className="space-y-6">
              <TicketStatistics
                statistics={statistics}
                loading={statsLoading}
                error={statsError}
                onRefresh={refreshStats}
              />
            </TabsContent>
          </Tabs>

          {/* Dialogs */}
          <CreateTicketDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            eventId={eventId as string}
            onSuccess={handleTicketCreated}
          />

          <BulkTicketDialog
            open={showBulkDialog}
            onOpenChange={setShowBulkDialog}
            eventId={eventId as string}
            onSuccess={handleBulkTicketsCreated}
          />
        </div>
      </div>
    </AppShell>
  );
}