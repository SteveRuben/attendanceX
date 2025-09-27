import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { CampaignFilters as CampaignFiltersType } from './CampaignDashboard';

interface CampaignFiltersProps {
  filters: CampaignFiltersType;
  onFilterChange: (filters: Partial<CampaignFiltersType>) => void;
  campaignCount: number;
}

export const CampaignFilters: React.FC<CampaignFiltersProps> = ({
  filters,
  onFilterChange,
  campaignCount
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
  };

  const handleStatusChange = (value: string) => {
    onFilterChange({ status: value });
  };

  const handleTypeChange = (value: string) => {
    onFilterChange({ type: value });
  };

  const handleDateRangeChange = (value: string) => {
    onFilterChange({ dateRange: value });
  };

  const handleSortChange = (value: string) => {
    onFilterChange({ sortBy: value });
  };

  const toggleSortOrder = () => {
    onFilterChange({ 
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
    });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      status: 'all',
      type: 'all',
      dateRange: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = filters.search || 
    filters.status !== 'all' || 
    filters.type !== 'all' || 
    filters.dateRange !== 'all';

  return (
    <Card className="p-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Recherche */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher par nom ou sujet..."
            value={filters.search}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3">
          {/* Statut */}
          <Select value={filters.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="scheduled">Programmé</SelectItem>
              <SelectItem value="sending">En cours d'envoi</SelectItem>
              <SelectItem value="sent">Envoyé</SelectItem>
              <SelectItem value="paused">En pause</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
              <SelectItem value="failed">Échec</SelectItem>
            </SelectContent>
          </Select>

          {/* Type */}
          <Select value={filters.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="newsletter">Newsletter</SelectItem>
              <SelectItem value="announcement">Annonce</SelectItem>
              <SelectItem value="event_reminder">Rappel événement</SelectItem>
              <SelectItem value="hr_communication">Communication RH</SelectItem>
              <SelectItem value="custom">Personnalisé</SelectItem>
            </SelectContent>
          </Select>

          {/* Période */}
          <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les périodes</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>

          {/* Tri */}
          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date de création</SelectItem>
              <SelectItem value="name">Nom</SelectItem>
              <SelectItem value="status">Statut</SelectItem>
              <SelectItem value="recipients">Destinataires</SelectItem>
              <SelectItem value="openRate">Taux d'ouverture</SelectItem>
              <SelectItem value="clickRate">Taux de clic</SelectItem>
              <SelectItem value="sentAt">Date d'envoi</SelectItem>
            </SelectContent>
          </Select>

          {/* Ordre de tri */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortOrder}
            className="px-3"
          >
            {filters.sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>

          {/* Effacer les filtres */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="px-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Effacer
            </Button>
          )}
        </div>
      </div>

      {/* Résultats */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <div className="text-sm text-gray-600">
          {campaignCount === 0 ? (
            "Aucune campagne trouvée"
          ) : (
            <>
              {campaignCount} campagne{campaignCount > 1 ? 's' : ''} trouvée{campaignCount > 1 ? 's' : ''}
              {hasActiveFilters && " (filtrées)"}
            </>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Filter className="h-4 w-4" />
            Filtres actifs
          </div>
        )}
      </div>
    </Card>
  );
};