import { useState, useEffect } from 'react';
import { API_ENDPOINTS, apiCall, ApiResponse } from '../services/api';

export interface Industry {
  value: string;
  label: string;
  description?: string;
  active: boolean;
  order: number;
}

export interface OrganizationSize {
  value: string;
  label: string;
  min_employees: number;
  max_employees: number;
  active: boolean;
  order: number;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export interface Timezone {
  value: string;
  label: string;
  offset: string;
}

export interface UseMetadataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Hook générique pour les métadonnées
const useMetadata = <T>(endpoint: string, fallbackData: T[] = []): UseMetadataReturn<T> => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result: ApiResponse<T[]> = await apiCall(endpoint);

      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error(`Error fetching metadata from ${endpoint}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      
      // Utiliser les données de fallback en cas d'erreur
      setData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [endpoint]);

  return {
    data,
    loading,
    error,
    refetch
  };
};

// Hook spécifique pour les industries
export const useIndustries = (): UseMetadataReturn<Industry> => {
  const fallbackIndustries: Industry[] = [
    { value: 'technology', label: 'Technology', active: true, order: 1 },
    { value: 'education', label: 'Education', active: true, order: 2 },
    { value: 'healthcare', label: 'Healthcare', active: true, order: 3 },
    { value: 'corporate', label: 'Corporate', active: true, order: 4 },
    { value: 'retail', label: 'Retail', active: true, order: 5 },
    { value: 'manufacturing', label: 'Manufacturing', active: true, order: 6 },
    { value: 'finance', label: 'Finance & Banking', active: true, order: 7 },
    { value: 'government', label: 'Government', active: true, order: 8 },
    { value: 'non_profit', label: 'Non-profit', active: true, order: 9 },
    { value: 'other', label: 'Other', active: true, order: 99 }
  ];

  return useMetadata<Industry>(API_ENDPOINTS.METADATA.INDUSTRIES, fallbackIndustries);
};

// Hook spécifique pour les tailles d'organisation
export const useOrganizationSizes = (): UseMetadataReturn<OrganizationSize> => {
  const fallbackSizes: OrganizationSize[] = [
    { value: 'startup', label: '1-5 employees', min_employees: 1, max_employees: 5, active: true, order: 1 },
    { value: 'small', label: '6-25 employees', min_employees: 6, max_employees: 25, active: true, order: 2 },
    { value: 'medium', label: '26-100 employees', min_employees: 26, max_employees: 100, active: true, order: 3 },
    { value: 'large', label: '101-500 employees', min_employees: 101, max_employees: 500, active: true, order: 4 },
    { value: 'enterprise', label: '500+ employees', min_employees: 500, max_employees: -1, active: true, order: 5 }
  ];

  return useMetadata<OrganizationSize>(API_ENDPOINTS.METADATA.ORGANIZATION_SIZES, fallbackSizes);
};

// Hook spécifique pour les pays
export const useCountries = (): UseMetadataReturn<Country> => {
  const fallbackCountries: Country[] = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'OTHER', name: 'Other', flag: '🌍' }
  ];

  return useMetadata<Country>(API_ENDPOINTS.METADATA.COUNTRIES, fallbackCountries);
};

// Hook spécifique pour les fuseaux horaires
export const useTimezones = (): UseMetadataReturn<Timezone> => {
  const fallbackTimezones: Timezone[] = [
    { value: 'America/New_York', label: 'Eastern Time (ET)', offset: '-05:00' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: '-08:00' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: '+00:00' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)', offset: '+01:00' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: '+09:00' },
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)', offset: '+00:00' }
  ];

  return useMetadata<Timezone>(API_ENDPOINTS.METADATA.TIMEZONES, fallbackTimezones);
};

// Hook combiné pour toutes les métadonnées d'onboarding
export const useOnboardingMetadata = () => {
  const industries = useIndustries();
  const organizationSizes = useOrganizationSizes();
  const countries = useCountries();
  const timezones = useTimezones();

  const loading = industries.loading || organizationSizes.loading || countries.loading || timezones.loading;
  const error = industries.error || organizationSizes.error || countries.error || timezones.error;

  const refetchAll = async () => {
    await Promise.all([
      industries.refetch(),
      organizationSizes.refetch(),
      countries.refetch(),
      timezones.refetch()
    ]);
  };

  return {
    industries: industries.data,
    organizationSizes: organizationSizes.data,
    countries: countries.data,
    timezones: timezones.data,
    loading,
    error,
    refetch: refetchAll
  };
};