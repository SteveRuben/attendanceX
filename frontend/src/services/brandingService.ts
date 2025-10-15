/**
 * Service pour la gestion du branding des tenants
 */

export interface TenantBranding {
  id: string;
  tenantId: string;
  logoUrl?: string;
  faviconUrl?: string;
  backgroundImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  headingFontFamily?: string;
  customCss?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandingTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

export interface UpdateBrandingRequest {
  logoUrl?: string;
  faviconUrl?: string;
  backgroundImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  headingFontFamily?: string;
  customCss?: string;
}

class BrandingService {
  private baseUrl = '/api/branding';

  /**
   * Obtenir le branding du tenant actuel
   */
  async getTenantBranding(): Promise<TenantBranding | null> {
    try {
      const response = await fetch(this.baseUrl);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch branding');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching tenant branding:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le branding du tenant
   */
  async updateTenantBranding(updates: UpdateBrandingRequest): Promise<TenantBranding> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update branding');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating tenant branding:', error);
      throw error;
    }
  }

  /**
   * Supprimer le branding du tenant
   */
  async deleteTenantBranding(): Promise<void> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete branding');
      }
    } catch (error) {
      console.error('Error deleting tenant branding:', error);
      throw error;
    }
  }

  /**
   * Obtenir les thèmes prédéfinis
   */
  async getPresetThemes(): Promise<BrandingTheme[]> {
    try {
      const response = await fetch(`${this.baseUrl}/themes`);

      if (!response.ok) {
        throw new Error('Failed to fetch themes');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching preset themes:', error);
      throw error;
    }
  }

  /**
   * Appliquer un thème prédéfini
   */
  async applyPresetTheme(themeName: string): Promise<TenantBranding> {
    try {
      const response = await fetch(`${this.baseUrl}/themes/${themeName}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to apply theme');
      }

      return await response.json();
    } catch (error) {
      console.error('Error applying preset theme:', error);
      throw error;
    }
  }

  /**
   * Obtenir le CSS généré pour le tenant
   */
  async getTenantCss(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/css`);

      if (!response.ok) {
        throw new Error('Failed to fetch CSS');
      }

      return await response.text();
    } catch (error) {
      console.error('Error fetching tenant CSS:', error);
      throw error;
    }
  }

  /**
   * Appliquer le branding au DOM
   */
  async applyBrandingToDOM(): Promise<void> {
    try {
      const branding = await this.getTenantBranding();
      if (!branding) return;

      // Appliquer les variables CSS
      const root = document.documentElement;
      
      if (branding.primaryColor) {
        root.style.setProperty('--primary-color', branding.primaryColor);
      }
      if (branding.secondaryColor) {
        root.style.setProperty('--secondary-color', branding.secondaryColor);
      }
      if (branding.accentColor) {
        root.style.setProperty('--accent-color', branding.accentColor);
      }
      if (branding.backgroundColor) {
        root.style.setProperty('--background-color', branding.backgroundColor);
      }
      if (branding.textColor) {
        root.style.setProperty('--text-color', branding.textColor);
      }
      if (branding.fontFamily) {
        root.style.setProperty('--font-family', branding.fontFamily);
      }
      if (branding.headingFontFamily) {
        root.style.setProperty('--heading-font-family', branding.headingFontFamily);
      }

      // Appliquer le favicon
      if (branding.faviconUrl) {
        this.updateFavicon(branding.faviconUrl);
      }

      // Appliquer le CSS personnalisé
      if (branding.customCss) {
        this.injectCustomCSS(branding.customCss);
      }
    } catch (error) {
      console.error('Error applying branding to DOM:', error);
    }
  }

  /**
   * Mettre à jour le favicon
   */
  private updateFavicon(faviconUrl: string): void {
    const existingFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (existingFavicon) {
      existingFavicon.href = faviconUrl;
    } else {
      const favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.href = faviconUrl;
      document.head.appendChild(favicon);
    }
  }

  /**
   * Injecter du CSS personnalisé
   */
  private injectCustomCSS(css: string): void {
    // Supprimer l'ancien CSS personnalisé s'il existe
    const existingStyle = document.getElementById('tenant-custom-css');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Créer et injecter le nouveau CSS
    const style = document.createElement('style');
    style.id = 'tenant-custom-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Valider une couleur hexadécimale
   */
  isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  /**
   * Convertir une couleur hex en RGB
   */
  hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Calculer la luminosité d'une couleur
   */
  getLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Déterminer si une couleur est claire ou sombre
   */
  isLightColor(hex: string): boolean {
    return this.getLuminance(hex) > 0.5;
  }

  /**
   * Obtenir une couleur de contraste appropriée
   */
  getContrastColor(hex: string): string {
    return this.isLightColor(hex) ? '#000000' : '#ffffff';
  }
}

export const brandingService = new BrandingService();
export default brandingService;