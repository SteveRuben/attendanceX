import { useState, useEffect } from 'react';
import { API_ENDPOINTS, apiCall, ApiResponse } from '../services/api';

export interface OrganizationSector {
    value: string;
    label: string;
    description?: string;
}

export interface OrganizationSize {
    value: string;
    label: string;
    min_employees: number;
    max_employees: number;
}

export interface SectorTemplate {
    id: string;
    name: string;
    description: string;
    sector: string;
    features: Record<string, boolean>;
    branding?: {
        primaryColor?: string;
        secondaryColor?: string;
    };
    preview?: {
        features: string[];
        benefits: string[];
    };
}

export interface UseOrganizationSectorsReturn {
    sectors: OrganizationSector[];
    templates: Record<string, SectorTemplate[]>;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

// Hook pour récupérer les secteurs depuis l'API existante
export const useOrganizationSectors = (): UseOrganizationSectorsReturn => {
    const [sectors, setSectors] = useState<OrganizationSector[]>([]);
    const [templates, setTemplates] = useState<Record<string, SectorTemplate[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSectors = async () => {
        try {
            setLoading(true);
            setError(null);

            const result: ApiResponse<Record<string, SectorTemplate[]>> = await apiCall(
                API_ENDPOINTS.ORGANIZATIONS.SECTOR_TEMPLATES
            );

            if (result.success && result.data) {
                const templatesData = result.data;
                setTemplates(templatesData);

                // Extraire les secteurs uniques depuis les templates
                const uniqueSectors = Object.keys(templatesData).map(sectorKey => {
                    const sectorTemplates = templatesData[sectorKey];
                    const firstTemplate = sectorTemplates?.[0];

                    return {
                        value: sectorKey,
                        label: getSectorLabel(sectorKey),
                        description: firstTemplate?.description || `Templates for ${getSectorLabel(sectorKey)} sector`
                    };
                });

                setSectors(uniqueSectors);
            } else {
                throw new Error(result.error || 'Failed to fetch sectors');
            }
        } catch (err) {
            console.error('Error fetching organization sectors:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch sectors');

            // Fallback vers des données statiques
            setSectors(getFallbackSectors());
            setTemplates({});
        } finally {
            setLoading(false);
        }
    };

    const refetch = async () => {
        await fetchSectors();
    };

    useEffect(() => {
        fetchSectors();
    }, []);

    return {
        sectors,
        templates,
        loading,
        error,
        refetch
    };
};

// Fonction pour convertir les clés de secteur en labels lisibles
const getSectorLabel = (sectorKey: string): string => {
    const labels: Record<string, string> = {
        education: 'Education',
        healthcare: 'Healthcare',
        corporate: 'Corporate',
        government: 'Government',
        non_profit: 'Non-profit',
        technology: 'Technology',
        finance: 'Finance & Banking',
        retail: 'Retail',
        manufacturing: 'Manufacturing',
        hospitality: 'Hospitality',
        consulting: 'Consulting',
        services: 'Services',
        association: 'Association',
        other: 'Other'
    };

    return labels[sectorKey] || sectorKey.charAt(0).toUpperCase() + sectorKey.slice(1);
};

// Données de fallback en cas d'erreur API
const getFallbackSectors = (): OrganizationSector[] => [
    { value: 'technology', label: 'Technology', description: 'Software, IT services, and tech companies' },
    { value: 'education', label: 'Education', description: 'Schools, universities, and educational institutions' },
    { value: 'healthcare', label: 'Healthcare', description: 'Hospitals, clinics, and medical services' },
    { value: 'corporate', label: 'Corporate', description: 'General business and corporate services' },
    { value: 'retail', label: 'Retail', description: 'Retail stores and e-commerce' },
    { value: 'manufacturing', label: 'Manufacturing', description: 'Manufacturing and industrial companies' },
    { value: 'finance', label: 'Finance & Banking', description: 'Financial services and banking' },
    { value: 'government', label: 'Government', description: 'Government agencies and public sector' },
    { value: 'non_profit', label: 'Non-profit', description: 'Non-profit organizations and NGOs' },
    { value: 'hospitality', label: 'Hospitality', description: 'Hotels, restaurants, and tourism' },
    { value: 'consulting', label: 'Consulting', description: 'Professional consulting services' },
    { value: 'services', label: 'Services', description: 'Professional and business services' },
    { value: 'other', label: 'Other', description: 'Other industries not listed above' }
];

// Hook pour les tailles d'organisation (garde l'implémentation existante)
export const useOrganizationSizes = () => {
    const [sizes, setSizes] = useState<OrganizationSize[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Pour l'instant, utilise des données statiques
        // TODO: Créer une API pour les tailles d'organisation
        const organizationSizes: OrganizationSize[] = [
            { value: 'startup', label: '1-5 employees', min_employees: 1, max_employees: 5 },
            { value: 'small', label: '6-25 employees', min_employees: 6, max_employees: 25 },
            { value: 'medium', label: '26-100 employees', min_employees: 26, max_employees: 100 },
            { value: 'large', label: '101-500 employees', min_employees: 101, max_employees: 500 },
            { value: 'enterprise', label: '500+ employees', min_employees: 500, max_employees: -1 }
        ];

        setTimeout(() => {
            setSizes(organizationSizes);
            setLoading(false);
        }, 100);
    }, []);

    const refetch = async () => {
        // Recharger les données
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
        }, 100);
    };

    return {
        data: sizes,
        loading,
        error,
        refetch
    };
};

// Hook pour récupérer un template spécifique par secteur
export const useSectorTemplate = (sector: string) => {
    const [template, setTemplate] = useState<SectorTemplate | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplate = async () => {
        if (!sector) return;

        try {
            setLoading(true);
            setError(null);

            const result: ApiResponse<SectorTemplate> = await apiCall(
                API_ENDPOINTS.ORGANIZATIONS.SECTOR_TEMPLATE(sector)
            );

            if (result.success && result.data) {
                setTemplate(result.data);
            } else {
                throw new Error(result.error || 'Failed to fetch template');
            }
        } catch (err) {
            console.error(`Error fetching template for sector ${sector}:`, err);
            setError(err instanceof Error ? err.message : 'Failed to fetch template');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplate();
    }, [sector]);

    return {
        template,
        loading,
        error,
        refetch: fetchTemplate
    };
};