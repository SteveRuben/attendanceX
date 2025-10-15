import React, { useState, useEffect, useCallback } from 'react';
import { campaignService } from '../services/campaignService';
import { Campaign, CampaignFilters } from '../components/campaigns/CampaignDashboard';
import { toast } from 'react-toastify';

export interface UseCampaignsOptions {
  autoLoad?: boolean;
  filters?: Partial<CampaignFilters>;
}

export interface UseCampaignsReturn {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  filters: CampaignFilters;
  stats: {
    totalCampaigns: number;
    sentCampaigns: number;
    activeCampaigns: number;
    draftCampaigns: number;
    totalRecipients: number;
    avgOpenRate: number;
    avgClickRate: number;
  };
  
  // Actions
  loadCampaigns: () => Promise<void>;
  setFilters: (filters: Partial<CampaignFilters>) => void;
  createCampaign: (data: any) => Promise<Campaign | null>;
  updateCampaign: (id: string, data: any) => Promise<Campaign | null>;
  deleteCampaign: (id: string) => Promise<boolean>;
  duplicateCampaign: (id: string, newName?: string) => Promise<Campaign | null>;
  sendCampaign: (id: string) => Promise<boolean>;
  pauseCampaign: (id: string) => Promise<boolean>;
  resumeCampaign: (id: string) => Promise<boolean>;
  scheduleCampaign: (id: string, scheduledAt: string) => Promise<boolean>;
}

export const useCampaigns = (options: UseCampaignsOptions = {}): UseCampaignsReturn => {
  const { autoLoad = true, filters: initialFilters = {} } = options;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<CampaignFilters>({
    search: '',
    status: 'all',
    type: 'all',
    dateRange: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...initialFilters
  });

  // Calculer les statistiques
  const stats = React.useMemo(() => {
    const totalCampaigns = campaigns.length;
    const sentCampaigns = campaigns.filter(c => c.status === 'sent').length;
    const activeCampaigns = campaigns.filter(c => ['scheduled', 'sending'].includes(c.status)).length;
    const draftCampaigns = campaigns.filter(c => c.status === 'draft').length;
    const totalRecipients = campaigns.reduce((sum, c) => sum + c.recipients, 0);
    
    const sentCampaignsList = campaigns.filter(c => c.status === 'sent');
    const avgOpenRate = sentCampaignsList.length > 0 
      ? sentCampaignsList.reduce((sum, c) => sum + c.openRate, 0) / sentCampaignsList.length 
      : 0;
    const avgClickRate = sentCampaignsList.length > 0 
      ? sentCampaignsList.reduce((sum, c) => sum + c.clickRate, 0) / sentCampaignsList.length 
      : 0;

    return {
      totalCampaigns,
      sentCampaigns,
      activeCampaigns,
      draftCampaigns,
      totalRecipients,
      avgOpenRate,
      avgClickRate
    };
  }, [campaigns]);

  // Charger les campagnes
  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await campaignService.getCampaigns(filters);
      setCampaigns(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des campagnes';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Mettre à jour les filtres
  const setFilters = useCallback((newFilters: Partial<CampaignFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Créer une campagne
  const createCampaign = useCallback(async (data: any): Promise<Campaign | null> => {
    try {
      const campaign = await campaignService.createCampaign(data);
      setCampaigns(prev => [campaign, ...prev]);
      toast.success('Campagne créée avec succès');
      return campaign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création de la campagne';
      toast.error(errorMessage);
      return null;
    }
  }, []);

  // Mettre à jour une campagne
  const updateCampaign = useCallback(async (id: string, data: any): Promise<Campaign | null> => {
    try {
      const updatedCampaign = await campaignService.updateCampaign({ id, ...data });
      setCampaigns(prev => prev.map(c => c.id === id ? updatedCampaign : c));
      toast.success('Campagne mise à jour avec succès');
      return updatedCampaign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la campagne';
      toast.error(errorMessage);
      return null;
    }
  }, []);

  // Supprimer une campagne
  const deleteCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      await campaignService.deleteCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success('Campagne supprimée avec succès');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression de la campagne';
      toast.error(errorMessage);
      return false;
    }
  }, []);

  // Dupliquer une campagne
  const duplicateCampaign = useCallback(async (id: string, newName?: string): Promise<Campaign | null> => {
    try {
      const duplicatedCampaign = await campaignService.duplicateCampaign(id, newName);
      setCampaigns(prev => [duplicatedCampaign, ...prev]);
      toast.success('Campagne dupliquée avec succès');
      return duplicatedCampaign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la duplication de la campagne';
      toast.error(errorMessage);
      return null;
    }
  }, []);

  // Envoyer une campagne
  const sendCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      await campaignService.sendCampaign(id);
      // Recharger les campagnes pour mettre à jour le statut
      await loadCampaigns();
      toast.success('Campagne envoyée avec succès');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'envoi de la campagne';
      toast.error(errorMessage);
      return false;
    }
  }, [loadCampaigns]);

  // Mettre en pause une campagne
  const pauseCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      await campaignService.pauseCampaign(id);
      await loadCampaigns();
      toast.success('Campagne mise en pause');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise en pause de la campagne';
      toast.error(errorMessage);
      return false;
    }
  }, [loadCampaigns]);

  // Reprendre une campagne
  const resumeCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      await campaignService.resumeCampaign(id);
      await loadCampaigns();
      toast.success('Campagne reprise');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la reprise de la campagne';
      toast.error(errorMessage);
      return false;
    }
  }, [loadCampaigns]);

  // Programmer une campagne
  const scheduleCampaign = useCallback(async (id: string, scheduledAt: string): Promise<boolean> => {
    try {
      await campaignService.scheduleCampaign(id, scheduledAt);
      await loadCampaigns();
      toast.success('Campagne programmée avec succès');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la programmation de la campagne';
      toast.error(errorMessage);
      return false;
    }
  }, [loadCampaigns]);

  // Charger automatiquement les campagnes
  useEffect(() => {
    if (autoLoad) {
      loadCampaigns();
    }
  }, [autoLoad, loadCampaigns]);

  return {
    campaigns,
    loading,
    error,
    filters,
    stats,
    loadCampaigns,
    setFilters,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    duplicateCampaign,
    sendCampaign,
    pauseCampaign,
    resumeCampaign,
    scheduleCampaign
  };
};