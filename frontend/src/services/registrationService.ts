/**
 * Service pour gérer l'enregistrement des tenants
 * Interface avec l'API d'enregistrement
 */

export interface RegistrationRequest {
  organizationName: string;
  organizationSector: string;
  organizationSize: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPassword: string;
  selectedPlan: string;
  billingCycle: 'monthly' | 'yearly';
  timezone: string;
  language: string;
  currency: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingOptIn?: boolean;
}

export interface RegistrationResponse {
  tenantId: string;
  slug: string;
  setupUrl: string;
  message: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  limits: {
    maxUsers: number;
    maxEvents: number;
    maxStorage: number;
  };
  popular: boolean;
}

export interface SlugAvailability {
  slug: string;
  available: boolean;
  suggestion?: string;
}

export interface EmailVerificationRequest {
  token: string;
  email: string;
}

export interface EmailVerificationResponse {
  tenantId: string;
  setupUrl: string;
  message: string;
}

class RegistrationService {
  private baseUrl = '/api/public';

  /**
   * Obtenir les plans d'abonnement disponibles
   */
  async getAvailablePlans(): Promise<Plan[]> {
    try {
      const response = await fetch(`${this.baseUrl}/plans`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load plans');
      }
      
      return data.data.plans;
    } catch (error) {
      console.error('Error loading plans:', error);
      throw error;
    }
  }

  /**
   * Vérifier la disponibilité d'un slug
   */
  async checkSlugAvailability(slug: string): Promise<SlugAvailability> {
    try {
      const response = await fetch(`${this.baseUrl}/check-slug/${encodeURIComponent(slug)}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to check slug availability');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error checking slug availability:', error);
      throw error;
    }
  }

  /**
   * Enregistrer un nouveau tenant
   */
  async registerTenant(request: RegistrationRequest): Promise<RegistrationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error registering tenant:', error);
      throw error;
    }
  }

  /**
   * Vérifier l'email d'un tenant
   */
  async verifyEmail(request: EmailVerificationRequest): Promise<EmailVerificationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Email verification failed');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  }

  /**
   * Renvoyer l'email de vérification
   */
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to resend verification email');
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      throw error;
    }
  }

  /**
   * Valider les données d'enregistrement côté client
   */
  validateRegistrationData(data: RegistrationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validation du nom d'organisation
    if (!data.organizationName?.trim()) {
      errors.push('Le nom de l\'organisation est requis');
    } else if (data.organizationName.length < 2) {
      errors.push('Le nom de l\'organisation doit contenir au moins 2 caractères');
    } else if (data.organizationName.length > 100) {
      errors.push('Le nom de l\'organisation ne peut pas dépasser 100 caractères');
    }

    // Validation de l'email
    if (!data.adminEmail?.trim()) {
      errors.push('L\'email administrateur est requis');
    } else if (!this.isValidEmail(data.adminEmail)) {
      errors.push('Format d\'email invalide');
    }

    // Validation du mot de passe
    if (!data.adminPassword) {
      errors.push('Le mot de passe est requis');
    } else if (data.adminPassword.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.adminPassword)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');
    }

    // Validation des noms
    if (!data.adminFirstName?.trim()) {
      errors.push('Le prénom est requis');
    }
    if (!data.adminLastName?.trim()) {
      errors.push('Le nom est requis');
    }

    // Validation des consentements
    if (!data.termsAccepted) {
      errors.push('Vous devez accepter les conditions d\'utilisation');
    }
    if (!data.privacyAccepted) {
      errors.push('Vous devez accepter la politique de confidentialité');
    }

    // Validation des sélections
    if (!data.organizationSector) {
      errors.push('Veuillez sélectionner un secteur d\'activité');
    }
    if (!data.organizationSize) {
      errors.push('Veuillez sélectionner la taille de l\'organisation');
    }
    if (!data.selectedPlan) {
      errors.push('Veuillez sélectionner un plan d\'abonnement');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Générer un slug à partir d'un nom d'organisation
   */
  generateSlugFromName(organizationName: string): string {
    return organizationName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9\s-]/g, '') // Supprimer les caractères spéciaux
      .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
      .replace(/-+/g, '-') // Supprimer les tirets multiples
      .replace(/^-|-$/g, '') // Supprimer les tirets en début/fin
      .substring(0, 50); // Limiter la longueur
  }

  /**
   * Obtenir les fuseaux horaires populaires
   */
  getPopularTimezones(): { value: string; label: string }[] {
    return [
      { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
      { value: 'Europe/London', label: 'Londres (UTC+0)' },
      { value: 'America/New_York', label: 'New York (UTC-5)' },
      { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
      { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
      { value: 'Australia/Sydney', label: 'Sydney (UTC+10)' },
      { value: 'America/Toronto', label: 'Toronto (UTC-5)' },
      { value: 'Europe/Berlin', label: 'Berlin (UTC+1)' },
      { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
      { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' }
    ];
  }

  /**
   * Formater le prix d'un plan
   */
  formatPlanPrice(plan: Plan, billingCycle: 'monthly' | 'yearly'): string {
    if (plan.price === 0) {
      return 'Gratuit';
    }

    let price = plan.price;
    if (billingCycle === 'yearly') {
      price = Math.round(price * 12 * 0.8); // 20% de réduction annuelle
    }

    const currency = plan.currency === 'EUR' ? '€' : 
                    plan.currency === 'USD' ? '$' : 
                    plan.currency === 'GBP' ? '£' : plan.currency;

    const period = billingCycle === 'yearly' ? '/an' : '/mois';
    
    return `${price}${currency}${period}`;
  }

  /**
   * Calculer les économies annuelles
   */
  calculateYearlySavings(plan: Plan): number {
    if (plan.price === 0) return 0;
    
    const monthlyTotal = plan.price * 12;
    const yearlyTotal = Math.round(monthlyTotal * 0.8); // 20% de réduction
    
    return monthlyTotal - yearlyTotal;
  }

  // Méthodes privées

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Instance singleton
export const registrationService = new RegistrationService();
export default registrationService;