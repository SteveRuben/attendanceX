import { useState, useCallback, useEffect } from 'react';
import { campaignService } from '../services/campaignService';
import {
  EventCampaign,
  CreateEventCampaignRequest,
  EventCampaignPreview,
  AccessCodeValidation,
  AccessCodeStats
} from '../types/campaign.types';

export const useEventCampaigns = (eventId?: string) => {
  const [campaigns, setCampaigns] = useState<EventCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger les campagnes d'un événement
   */
  const fetchEventCampaigns = useCallback(async (targetEventId?: string) => {
    if (!targetEventId && !eventId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignService.getEventCampaigns(targetEventId || eventId!);
      setCampaigns(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des campagnes');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  /**
   * Créer une campagne d'événement
   */
  const createEventCampaign = useCallback(async (
    targetEventId: string,
    campaignData: CreateEventCampaignRequest
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await campaignService.createEventCampaign(targetEventId, campaignData);
      
      // Recharger les campagnes si c'est le même événement
      if (targetEventId === eventId) {
        await fetchEventCampaigns();
      }
      
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la campagne');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [eventId, fetchEventCampaigns]);

  /**
   * Envoyer une campagne d'événement
   */
  const sendEventCampaign = useCallback(async (campaignId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await campaignService.sendEventCampaign(campaignId);
      
      // Recharger les campagnes pour mettre à jour le statut
      if (eventId) {
        await fetchEventCampaigns();
      }
      
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi de la campagne');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [eventId, fetchEventCampaigns]);

  // Charger automatiquement les campagnes si eventId est fourni
  useEffect(() => {
    if (eventId) {
      fetchEventCampaigns();
    }
  }, [eventId, fetchEventCampaigns]);

  return {
    campaigns,
    loading,
    error,
    fetchEventCampaigns,
    createEventCampaign,
    sendEventCampaign,
    clearError: () => setError(null)
  };
};

export const useEventCampaignPreview = () => {
  const [preview, setPreview] = useState<EventCampaignPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Prévisualiser une campagne d'événement
   */
  const previewEventCampaign = useCallback(async (
    eventId: string,
    notificationMethods: any
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignService.previewEventCampaign(eventId, notificationMethods);
      setPreview(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la prévisualisation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    preview,
    loading,
    error,
    previewEventCampaign,
    clearPreview: () => setPreview(null),
    clearError: () => setError(null)
  };
};

export const useAccessCodeValidation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Valider un QR code
   */
  const validateQRCode = useCallback(async (
    eventId: string,
    qrCodeId: string,
    location?: any
  ): Promise<AccessCodeValidation> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await campaignService.validateQRCode(eventId, qrCodeId, location);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation du QR code');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Valider un PIN code
   */
  const validatePINCode = useCallback(async (
    eventId: string,
    pinCode: string,
    userId?: string
  ): Promise<AccessCodeValidation> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await campaignService.validatePINCode(eventId, pinCode, userId);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation du PIN code');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    validateQRCode,
    validatePINCode,
    clearError: () => setError(null)
  };
};

export const useAccessCodeStats = (eventId?: string) => {
  const [stats, setStats] = useState<AccessCodeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger les statistiques des codes d'accès
   */
  const fetchAccessCodeStats = useCallback(async (targetEventId?: string) => {
    if (!targetEventId && !eventId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await campaignService.getAccessCodeStats(targetEventId || eventId!);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Charger automatiquement les stats si eventId est fourni
  useEffect(() => {
    if (eventId) {
      fetchAccessCodeStats();
    }
  }, [eventId, fetchAccessCodeStats]);

  return {
    stats,
    loading,
    error,
    fetchAccessCodeStats,
    clearError: () => setError(null)
  };
};