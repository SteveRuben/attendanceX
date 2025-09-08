import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, User, Mail, Phone, MoreVertical, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { clientService, ClientFilters } from '../../services/clientService';
import type { Client } from '../../shared';

interface ClientListProps {
  organizationId: string;
  onClientSelect?: (client: Client) => void;
  onCreateClient?: () => void;
  onEditClient?: (client: Client) => void;
  showCreateButton?: boolean;
  compact?: boolean;
}

export const ClientList: React.FC<ClientListProps> = ({
  organizationId,
  onClientSelect,
  onCreateClient,
  onEditClient,
  showCreateButton = true,
  compact = false
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reminderMethodFilter, setReminderMethodFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const [exporting, setExporting] = useState(false);

  const itemsPerPage = compact ? 10 : 20;

  // Load clients
  useEffect(() => {
    loadClients();
  }, [organizationId, searchQuery, reminderMethodFilter, languageFilter, currentPage]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: ClientFilters = {};

      // Apply search filter
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      // Apply reminder method filter
      if (reminderMethodFilter !== 'all') {
        filters.reminderMethod = reminderMethodFilter;
      }

      // Apply language filter
      if (languageFilter !== 'all') {
        filters.language = languageFilter;
      }

      const response = await clientService.getClients(
        organizationId,
        filters,
        currentPage,
        itemsPerPage
      );

      setClients(response.clients);
      setTotalPages(response.pagination?.totalPages || 0);
      setTotalClients(response.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setExporting(true);
      
      const filters: ClientFilters = {};
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      if (reminderMethodFilter !== 'all') filters.reminderMethod = reminderMethodFilter;
      if (languageFilter !== 'all') filters.language = languageFilter;

      const blob = await clientService.exportClients(organizationId, format, filters);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export clients');
    } finally {
      setExporting(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getReminderMethodLabel = (method: string) => {
    switch (method) {
      case 'email': return 'Email';
      case 'sms': return 'SMS';
      case 'both': return 'Email + SMS';
      default: return method;
    }
  };

  const getReminderMethodColor = (method: string) => {
    switch (method) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'sms': return 'bg-green-100 text-green-800';
      case 'both': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && currentPage === 1) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
          <p className="text-gray-600">
            {totalClients} client{totalClients > 1 ? 's' : ''} trouvé{totalClients > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exporting}>
                {exporting ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Exporter en CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Exporter en Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {showCreateButton && onCreateClient && (
            <Button onClick={onCreateClient} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouveau client
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher par nom, email, téléphone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        {/* Reminder Method Filter */}
        <Select 
          value={reminderMethodFilter} 
          onValueChange={(value) => {
            setReminderMethodFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Méthode de rappel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les méthodes</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="both">Email + SMS</SelectItem>
          </SelectContent>
        </Select>

        {/* Language Filter */}
        <Select 
          value={languageFilter} 
          onValueChange={(value) => {
            setLanguageFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Langue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les langues</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Español</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadClients}
            className="mt-2"
          >
            Réessayer
          </Button>
        </div>
      )}

      {/* Clients List */}
      <div className="space-y-4">
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun client</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || reminderMethodFilter !== 'all' || languageFilter !== 'all'
                ? 'Aucun client ne correspond à vos critères de recherche.'
                : 'Commencez par ajouter votre premier client.'
              }
            </p>
            {showCreateButton && onCreateClient && (
              <Button onClick={onCreateClient} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un client
              </Button>
            )}
          </div>
        ) : (
          clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onSelect={onClientSelect}
              onEdit={onEditClient}
              compact={compact}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Page {currentPage} sur {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Loading overlay for pagination */}
      {loading && currentPage > 1 && (
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="md" />
        </div>
      )}
    </div>
  );
};

// Client Card Component
interface ClientCardProps {
  client: Client;
  onSelect?: (client: Client) => void;
  onEdit?: (client: Client) => void;
  compact?: boolean;
}

const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onSelect,
  onEdit,
  compact = false
}) => {
  const handleCardClick = () => {
    if (onSelect) {
      onSelect(client);
    }
  };

  const getReminderMethodLabel = (method: string) => {
    switch (method) {
      case 'email': return 'Email';
      case 'sms': return 'SMS';
      case 'both': return 'Email + SMS';
      default: return method;
    }
  };

  const getReminderMethodColor = (method: string) => {
    switch (method) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'sms': return 'bg-green-100 text-green-800';
      case 'both': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card 
      className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${compact ? 'p-3' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {client.firstName} {client.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  className={getReminderMethodColor(client.preferences.reminderMethod)}
                >
                  {getReminderMethodLabel(client.preferences.reminderMethod)}
                </Badge>
                <span className="text-xs text-gray-500">
                  {client.preferences.language?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span className="truncate">{client.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{client.phone}</span>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-1 text-sm text-gray-500">
              <div>
                Créé le {new Date(client.createdAt).toLocaleDateString('fr-FR')}
              </div>
              {client.updatedAt && client.updatedAt !== client.createdAt && (
                <div>
                  Modifié le {new Date(client.updatedAt).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(client);
              }}
            >
              Modifier
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelect) onSelect(client);
                }}
              >
                Voir les détails
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(client);
                  }}
                >
                  Modifier
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`mailto:${client.email}`, '_blank');
                }}
              >
                Envoyer un email
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`tel:${client.phone}`, '_blank');
                }}
              >
                Appeler
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};