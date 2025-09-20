/**
 * Service de gestion du branding des tenants
 * Gère les logos, couleurs, CSS personnalisé et autres éléments de marque
 */

import { collections } from '../../config/database';
import { tenantService } from '../tenant/tenant.service';
import { TenantError, TenantErrorCode } from '../../common/types';

export interface TenantBranding {
  id: string;
  tenantId: string;
  
  // Logo et images
  logoUrl?: string;
  faviconUrl?: string;
  backgroundImageUrl?: string;
  
  // Couleurs
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  
  // Typographie
  fontFamily?: string;
  headingFontFamily?: string;
  
  // CSS personnalisé
  customCss?: string;
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
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

export interface BrandingTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

export class TenantBrandingService {

  /**
   * Obtenir le branding d'un tenant
   */
  async getTenantBranding(tenantId: string): Promise<TenantBranding | null> {
    try {
      const snapshot = await collections.tenant_branding
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as TenantBranding;
    } catch (error) {
      console.error('Error getting tenant branding:', error);
      return null;
    }
  }

  /**
   * Créer ou mettre à jour le branding d'un tenant
   */
  async updateTenantBranding(tenantId: string, updates: UpdateBrandingRequest): Promise<TenantBranding> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Valider les couleurs
      this.validateColors(updates);

      // Valider le CSS personnalisé
      if (updates.customCss) {
        this.validateCustomCss(updates.customCss);
      }

      const now = new Date();
      const existingBranding = await this.getTenantBranding(tenantId);

      if (existingBranding) {
        // Mettre à jour le branding existant
        const updatedData = {
          ...updates,
          updatedAt: now
        };

        await collections.tenant_branding.doc(existingBranding.id).update(updatedData);

        return {
          ...existingBranding,
          ...updatedData
        };
      } else {
        // Créer un nouveau branding
        const brandingData: Omit<TenantBranding, 'id'> = {
          tenantId,
          ...updates,
          createdAt: now,
          updatedAt: now
        };

        const brandingRef = await collections.tenant_branding.add(brandingData);

        return {
          id: brandingRef.id,
          ...brandingData
        };
      }
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error updating tenant branding:', error);
      throw new TenantError(
        'Failed to update tenant branding',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Supprimer le branding d'un tenant
   */
  async deleteTenantBranding(tenantId: string): Promise<void> {
    try {
      const branding = await this.getTenantBranding(tenantId);
      if (!branding) {
        return;
      }

      await collections.tenant_branding.doc(branding.id).delete();
    } catch (error) {
      console.error('Error deleting tenant branding:', error);
      throw new TenantError(
        'Failed to delete tenant branding',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir les thèmes prédéfinis
   */
  getPresetThemes(): BrandingTheme[] {
    return [
      {
        name: 'Corporate Blue',
        primaryColor: '#1e40af',
        secondaryColor: '#3b82f6',
        accentColor: '#60a5fa',
        backgroundColor: '#ffffff',
        textColor: '#1f2937'
      },
      {
        name: 'Modern Green',
        primaryColor: '#059669',
        secondaryColor: '#10b981',
        accentColor: '#34d399',
        backgroundColor: '#ffffff',
        textColor: '#1f2937'
      },
      {
        name: 'Creative Purple',
        primaryColor: '#7c3aed',
        secondaryColor: '#8b5cf6',
        accentColor: '#a78bfa',
        backgroundColor: '#ffffff',
        textColor: '#1f2937'
      },
      {
        name: 'Elegant Dark',
        primaryColor: '#374151',
        secondaryColor: '#4b5563',
        accentColor: '#6b7280',
        backgroundColor: '#111827',
        textColor: '#f9fafb'
      },
      {
        name: 'Warm Orange',
        primaryColor: '#ea580c',
        secondaryColor: '#f97316',
        accentColor: '#fb923c',
        backgroundColor: '#ffffff',
        textColor: '#1f2937'
      }
    ];
  }

  /**
   * Appliquer un thème prédéfini
   */
  async applyPresetTheme(tenantId: string, themeName: string): Promise<TenantBranding> {
    const themes = this.getPresetThemes();
    const theme = themes.find(t => t.name === themeName);

    if (!theme) {
      throw new TenantError(
        'Theme not found',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }

    return await this.updateTenantBranding(tenantId, {
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor,
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor
    });
  }

  /**
   * Générer le CSS pour un tenant
   */
  async generateTenantCss(tenantId: string): Promise<string> {
    const branding = await this.getTenantBranding(tenantId);
    if (!branding) {
      return '';
    }

    let css = ':root {\n';

    if (branding.primaryColor) {
      css += `  --primary-color: ${branding.primaryColor};\n`;
    }
    if (branding.secondaryColor) {
      css += `  --secondary-color: ${branding.secondaryColor};\n`;
    }
    if (branding.accentColor) {
      css += `  --accent-color: ${branding.accentColor};\n`;
    }
    if (branding.backgroundColor) {
      css += `  --background-color: ${branding.backgroundColor};\n`;
    }
    if (branding.textColor) {
      css += `  --text-color: ${branding.textColor};\n`;
    }
    if (branding.fontFamily) {
      css += `  --font-family: ${branding.fontFamily};\n`;
    }
    if (branding.headingFontFamily) {
      css += `  --heading-font-family: ${branding.headingFontFamily};\n`;
    }

    css += '}\n\n';

    // Ajouter le CSS personnalisé
    if (branding.customCss) {
      css += branding.customCss;
    }

    return css;
  }

  /**
   * Valider les couleurs hexadécimales
   */
  private validateColors(updates: UpdateBrandingRequest): void {
    const colorFields = [
      'primaryColor', 'secondaryColor', 'accentColor', 
      'backgroundColor', 'textColor'
    ];

    for (const field of colorFields) {
      const color = updates[field as keyof UpdateBrandingRequest] as string;
      if (color && !this.isValidHexColor(color)) {
        throw new TenantError(
          `Invalid color format for ${field}`,
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }
    }
  }

  /**
   * Valider le format de couleur hexadécimale
   */
  private isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  /**
   * Valider le CSS personnalisé (sécurité basique)
   */
  private validateCustomCss(css: string): void {
    // Interdire les imports et les URLs externes pour la sécurité
    const dangerousPatterns = [
      /@import/i,
      /url\s*\(/i,
      /javascript:/i,
      /expression\s*\(/i,
      /<script/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(css)) {
        throw new TenantError(
          'Custom CSS contains forbidden patterns',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }
    }

    // Limiter la taille du CSS
    if (css.length > 50000) { // 50KB max
      throw new TenantError(
        'Custom CSS is too large (max 50KB)',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }
  }
}

// Ajouter la collection manquante
declare module '../../config/database' {
  interface Collections {
    tenant_branding: any;
  }
}

// Instance singleton
export const tenantBrandingService = new TenantBrandingService();
export default tenantBrandingService;