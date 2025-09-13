/**
 * Composant de liste des factures
 * Affiche l'historique complet des factures avec pagination
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/Input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Download, 
  Eye, 
  CreditCard, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  AlertTriangle
} from 'lucide-react';
import { billingService, Invoice, InvoiceStatus } from '../../services/billingService';
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters';

interface InvoiceListProps {
  limit?: number;
  showPagination?: boolean;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ 
  limit = 10, 
  showPagination = true 
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  useEffect(() => {
    loadInvoices();
  }, [currentPage, limit]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await billingService.getInvoices(currentPage, limit);
      setInvoices(response.invoices);
      setPagination(response.pagination);
    } catch (err) {
      setError('Erreur lors du chargement des factures');
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      const result = await billingService.payInvoice(invoiceId);
      if (result.success) {
        // Recharger les factures pour mettre à jour le statut
        await loadInvoices();
      } else {
        setError('Échec du paiement de la facture');
      }
    } catch (err) {
      setError('Erreur lors du paiement de la facture');
      console.error('Error paying invoice:', err);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      // TODO: Implémenter le téléchargement PDF quand disponible
      console.log('Download invoice:', invoiceId);
    } catch (err) {
      console.error('Error downloading invoice:', err);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const statusConfig = {
      [InvoiceStatus.PAID]: { variant: 'default' as const, color: 'bg-green-500' },
      [InvoiceStatus.OPEN]: { variant: 'secondary' as const, color: 'bg-blue-500' },
      [InvoiceStatus.DRAFT]: { variant: 'outline' as const, color: 'bg-gray-500' },
      [InvoiceStatus.VOID]: { variant: 'outline' as const, color: 'bg-gray-500' },
      [InvoiceStatus.UNCOLLECTIBLE]: { variant: 'destructive' as const, color: 'bg-red-500' }
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {formatStatus(status)}
      </Badge>
    );
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.amount.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Historique des factures
          </CardTitle>
          <CardDescription>
            Consultez et gérez toutes vos factures
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Filtres et recherche */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par numéro de facture ou montant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Statut: {statusFilter === 'all' ? 'Tous' : formatStatus(statusFilter)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  Tous les statuts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter(InvoiceStatus.PAID)}>
                  Payées
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter(InvoiceStatus.OPEN)}>
                  En attente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter(InvoiceStatus.DRAFT)}>
                  Brouillons
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Table des factures */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Aucune facture trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        {formatDate(invoice.issueDate)}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        <span className={
                          invoice.status === InvoiceStatus.OPEN && new Date(invoice.dueDate) < new Date()
                            ? 'text-red-600 font-medium'
                            : ''
                        }>
                          {formatDate(invoice.dueDate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleDownloadInvoice(invoice.id)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Voir la facture
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDownloadInvoice(invoice.id)}
                              className="flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Télécharger PDF
                            </DropdownMenuItem>
                            {invoice.status === InvoiceStatus.OPEN && (
                              <DropdownMenuItem 
                                onClick={() => handlePayInvoice(invoice.id)}
                                className="flex items-center gap-2"
                              >
                                <CreditCard className="h-4 w-4" />
                                Payer maintenant
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {showPagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
                {pagination.total} factures
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                <span className="text-sm">
                  Page {pagination.page} sur {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.hasNext}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceList;