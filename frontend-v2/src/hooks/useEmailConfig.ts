import { useState, useEffect, useCallback } from 'react';
import { 
  emailConfigService, 
  EmailProvider, 
  ProviderTypeInfo, 
  CreateEmailProviderRequest, 
  UpdateEmailProviderRequest,
  TestEmailProviderRequest,
  TestEmailProviderResult
} from '@/services/emailConfigService';

interface UseEmailConfigReturn {
  providers: EmailProvider[];
  providerTypes: ProviderTypeInfo[];
  loading: boolean;
  error: string | null;
  fetchProviders: () => Promise<void>;
  createProvider: (data: CreateEmailProviderRequest) => Promise<EmailProvider>;
  updateProvider: (id: string, data: UpdateEmailProviderRequest) => Promise<EmailProvider>;
  deleteProvider: (id: string) => Promise<void>;
  testProvider: (data: TestEmailProviderRequest) => Promise<TestEmailProviderResult>;
}

export const useEmailConfig = (): UseEmailConfigReturn => {
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [providerTypes, setProviderTypes] = useState<ProviderTypeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [providersData, typesData] = await Promise.all([
        emailConfigService.getEmailProviders(),
        emailConfigService.getAvailableProviderTypes()
      ]);
      
      setProviders(providersData);
      setProviderTypes(typesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(errorMessage);
      console.error('Error fetching email providers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProvider = useCallback(async (data: CreateEmailProviderRequest): Promise<EmailProvider> => {
    try {
      const newProvider = await emailConfigService.createEmailProvider(data);
      setProviders(prev => [...prev, newProvider]);
      return newProvider;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateProvider = useCallback(async (id: string, data: UpdateEmailProviderRequest): Promise<EmailProvider> => {
    try {
      const updatedProvider = await emailConfigService.updateEmailProvider(id, data);
      setProviders(prev => prev.map(p => p.id === id ? updatedProvider : p));
      return updatedProvider;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteProvider = useCallback(async (id: string): Promise<void> => {
    try {
      await emailConfigService.deleteEmailProvider(id);
      setProviders(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const testProvider = useCallback(async (data: TestEmailProviderRequest): Promise<TestEmailProviderResult> => {
    try {
      return await emailConfigService.testEmailProvider(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du test';
      setError(errorMessage);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return {
    providers,
    providerTypes,
    loading,
    error,
    fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider
  };
};