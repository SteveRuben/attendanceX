/**
 * Service de gestion des domaines personnalisés pour les tenants
 * Gère la configuration, vérification DNS et certificats SSL
 */

import { collections } from '../../config/database';
import { TenantError, TenantErrorCode } from '../../shared/types/tenant.types';
import { tenantService } from '../tenant/tenant.service';

export interface CustomDomain {
  id: string;
  tenantId: string;
  domain: string;
  subdomain?: string; // Pour les sous-domaines comme tenant.yourdomain.com
  type: 'custom' | 'subdomain';
  status: DomainStatus;
  
  // Vérification DNS
  dnsRecords: DNSRecord[];
  dnsVerified: boolean;
  dnsVerifiedAt?: Date;
  
  // SSL/TLS
  sslEnabled: boolean;
  sslStatus: SSLStatus;
  certificateIssuer?: string;
  certificateExpiresAt?: Date;
  
  // Configuration
  redirectToHttps: boolean;
  wwwRedirect: 'none' | 'www_to_non_www' | 'non_www_to_www';
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
}

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  ttl?: number;
  verified: boolean;
  verifiedAt?: Date;
}

export enum DomainStatus {
  PENDING = 'pending',
  DNS_VERIFICATION = 'dns_verification',
  SSL_PROVISIONING = 'ssl_provisioning',
  ACTIVE = 'active',
  FAILED = 'failed',
  SUSPENDED = 'suspended'
}

export enum SSLStatus {
  NONE = 'none',
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  FAILED = 'failed'
}

export interface AddCustomDomainRequest {
  domain: string;
  type: 'custom' | 'subdomain';
  subdomain?: string;
  redirectToHttps?: boolean;
  wwwRedirect?: 'none' | 'www_to_non_www' | 'non_www_to_www';
}

export interface DomainVerificationResult {
  verified: boolean;
  records: DNSRecord[];
  errors: string[];
}

export class CustomDomainService {

  /**
   * Ajouter un domaine personnalisé
   */
  async addCustomDomain(tenantId: string, request: AddCustomDomainRequest): Promise<CustomDomain> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Valider le domaine
      this.validateDomain(request.domain);

      // Vérifier que le domaine n'est pas déjà utilisé
      const existingDomain = await this.getDomainByName(request.domain);
      if (existingDomain) {
        throw new TenantError(
          'Domain already exists',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Générer les enregistrements DNS requis
      const dnsRecords = this.generateRequiredDNSRecords(request);

      const now = new Date();
      const domainData: Omit<CustomDomain, 'id'> = {
        tenantId,
        domain: request.domain,
        subdomain: request.subdomain,
        type: request.type,
        status: DomainStatus.PENDING,
        dnsRecords,
        dnsVerified: false,
        sslEnabled: false,
        sslStatus: SSLStatus.NONE,
        redirectToHttps: request.redirectToHttps ?? true,
        wwwRedirect: request.wwwRedirect ?? 'none',
        createdAt: now,
        updatedAt: now
      };

      const domainRef = await collections.custom_domains.add(domainData);

      const customDomain = {
        id: domainRef.id,
        ...domainData
      };

      // Démarrer la vérification DNS en arrière-plan
      this.startDNSVerification(customDomain.id);

      return customDomain;
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error adding custom domain:', error);
      throw new TenantError(
        'Failed to add custom domain',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir les domaines d'un tenant
   */
  async getTenantDomains(tenantId: string): Promise<CustomDomain[]> {
    try {
      const snapshot = await collections.custom_domains
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomDomain));
    } catch (error) {
      console.error('Error getting tenant domains:', error);
      return [];
    }
  }

  /**
   * Obtenir un domaine par nom
   */
  async getDomainByName(domain: string): Promise<CustomDomain | null> {
    try {
      const snapshot = await collections.custom_domains
        .where('domain', '==', domain)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as CustomDomain;
    } catch (error) {
      console.error('Error getting domain by name:', error);
      return null;
    }
  }

  /**
   * Résoudre un tenant par domaine
   */
  async resolveTenantByDomain(domain: string): Promise<string | null> {
    try {
      const customDomain = await this.getDomainByName(domain);
      if (customDomain && customDomain.status === DomainStatus.ACTIVE) {
        return customDomain.tenantId;
      }

      // Vérifier les sous-domaines
      const parts = domain.split('.');
      if (parts.length >= 3) {
        const subdomain = parts[0];
        const baseDomain = parts.slice(1).join('.');
        
        const snapshot = await collections.custom_domains
          .where('subdomain', '==', subdomain)
          .where('domain', '==', baseDomain)
          .where('status', '==', DomainStatus.ACTIVE)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const domainData = doc.data() as CustomDomain;
          return domainData.tenantId;
        }
      }

      return null;
    } catch (error) {
      console.error('Error resolving tenant by domain:', error);
      return null;
    }
  }

  /**
   * Vérifier les enregistrements DNS
   */
  async verifyDNSRecords(domainId: string): Promise<DomainVerificationResult> {
    try {
      const domain = await this.getDomainById(domainId);
      if (!domain) {
        throw new TenantError(
          'Domain not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const verificationResult: DomainVerificationResult = {
        verified: true,
        records: [],
        errors: []
      };

      // Vérifier chaque enregistrement DNS
      for (const record of domain.dnsRecords) {
        const verified = await this.verifyDNSRecord(domain.domain, record);
        
        const updatedRecord: DNSRecord = {
          ...record,
          verified,
          verifiedAt: verified ? new Date() : undefined
        };

        verificationResult.records.push(updatedRecord);

        if (!verified) {
          verificationResult.verified = false;
          verificationResult.errors.push(`DNS record ${record.type} ${record.name} not verified`);
        }
      }

      // Mettre à jour le domaine
      const updates: any = {
        dnsRecords: verificationResult.records,
        dnsVerified: verificationResult.verified,
        updatedAt: new Date()
      };

      if (verificationResult.verified) {
        updates.dnsVerifiedAt = new Date();
        updates.status = DomainStatus.SSL_PROVISIONING;
        
        // Démarrer le provisioning SSL
        this.startSSLProvisioning(domainId);
      }

      await collections.custom_domains.doc(domainId).update(updates);

      return verificationResult;
    } catch (error) {
      console.error('Error verifying DNS records:', error);
      throw error;
    }
  }

  /**
   * Supprimer un domaine personnalisé
   */
  async removeCustomDomain(tenantId: string, domainId: string): Promise<void> {
    try {
      const domain = await this.getDomainById(domainId);
      if (!domain) {
        throw new TenantError(
          'Domain not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      if (domain.tenantId !== tenantId) {
        throw new TenantError(
          'Access denied',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Révoquer le certificat SSL si actif
      if (domain.sslStatus === SSLStatus.ACTIVE) {
        await this.revokeSSLCertificate(domainId);
      }

      await collections.custom_domains.doc(domainId).delete();
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error removing custom domain:', error);
      throw new TenantError(
        'Failed to remove custom domain',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir un domaine par ID
   */
  private async getDomainById(domainId: string): Promise<CustomDomain | null> {
    try {
      const doc = await collections.custom_domains.doc(domainId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() } as CustomDomain;
    } catch (error) {
      console.error('Error getting domain by ID:', error);
      return null;
    }
  }

  /**
   * Valider un nom de domaine
   */
  private validateDomain(domain: string): void {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    
    if (!domainRegex.test(domain)) {
      throw new TenantError(
        'Invalid domain format',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }

    if (domain.length > 253) {
      throw new TenantError(
        'Domain name too long',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }
  }

  /**
   * Générer les enregistrements DNS requis
   */
  private generateRequiredDNSRecords(request: AddCustomDomainRequest): DNSRecord[] {
    const records: DNSRecord[] = [];

    if (request.type === 'custom') {
      // Enregistrement A pour le domaine principal
      records.push({
        type: 'A',
        name: request.domain,
        value: process.env.LOAD_BALANCER_IP || '192.0.2.1',
        ttl: 300,
        verified: false
      });

      // Enregistrement A pour www si nécessaire
      if (request.wwwRedirect !== 'none') {
        records.push({
          type: 'A',
          name: `www.${request.domain}`,
          value: process.env.LOAD_BALANCER_IP || '192.0.2.1',
          ttl: 300,
          verified: false
        });
      }
    } else if (request.type === 'subdomain' && request.subdomain) {
      // Enregistrement CNAME pour le sous-domaine
      records.push({
        type: 'CNAME',
        name: `${request.subdomain}.${request.domain}`,
        value: process.env.PLATFORM_DOMAIN || 'platform.example.com',
        ttl: 300,
        verified: false
      });
    }

    // Enregistrement TXT pour la vérification
    records.push({
      type: 'TXT',
      name: `_platform-verify.${request.domain}`,
      value: this.generateVerificationToken(),
      ttl: 300,
      verified: false
    });

    return records;
  }

  /**
   * Générer un token de vérification
   */
  private generateVerificationToken(): string {
    return `platform-verify=${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Vérifier un enregistrement DNS
   */
  private async verifyDNSRecord(domain: string, record: DNSRecord): Promise<boolean> {
    try {
      // Simulation de vérification DNS
      // Dans un vrai environnement, utiliser une bibliothèque comme 'dns' de Node.js
      console.log(`Verifying DNS record ${record.type} ${record.name} -> ${record.value}`);
      
      // Pour la démo, on considère que la vérification réussit après un délai
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return Math.random() > 0.3; // 70% de chance de succès pour la démo
    } catch (error) {
      console.error('Error verifying DNS record:', error);
      return false;
    }
  }

  /**
   * Démarrer la vérification DNS en arrière-plan
   */
  private async startDNSVerification(domainId: string): Promise<void> {
    try {
      // Attendre un peu avant de commencer la vérification
      setTimeout(async () => {
        await this.verifyDNSRecords(domainId);
      }, 5000);
    } catch (error) {
      console.error('Error starting DNS verification:', error);
    }
  }

  /**
   * Démarrer le provisioning SSL
   */
  private async startSSLProvisioning(domainId: string): Promise<void> {
    try {
      const domain = await this.getDomainById(domainId);
      if (!domain) return;

      // Mettre à jour le statut SSL
      await collections.custom_domains.doc(domainId).update({
        sslStatus: SSLStatus.PENDING,
        updatedAt: new Date()
      });

      // Simulation du provisioning SSL
      setTimeout(async () => {
        const success = Math.random() > 0.2; // 80% de chance de succès
        
        const updates: any = {
          sslStatus: success ? SSLStatus.ACTIVE : SSLStatus.FAILED,
          sslEnabled: success,
          updatedAt: new Date()
        };

        if (success) {
          updates.status = DomainStatus.ACTIVE;
          updates.activatedAt = new Date();
          updates.certificateIssuer = 'Let\'s Encrypt';
          updates.certificateExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 jours
        } else {
          updates.status = DomainStatus.FAILED;
        }

        await collections.custom_domains.doc(domainId).update(updates);
      }, 10000);
    } catch (error) {
      console.error('Error starting SSL provisioning:', error);
    }
  }

  /**
   * Révoquer un certificat SSL
   */
  private async revokeSSLCertificate(domainId: string): Promise<void> {
    try {
      // Simulation de révocation SSL
      console.log(`Revoking SSL certificate for domain ${domainId}`);
      
      await collections.custom_domains.doc(domainId).update({
        sslStatus: SSLStatus.NONE,
        sslEnabled: false,
        certificateIssuer: null,
        certificateExpiresAt: null,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error revoking SSL certificate:', error);
    }
  }
}

// Ajouter la collection manquante
declare module '../../config/database' {
  interface Collections {
    custom_domains: any;
  }
}

// Instance singleton
export const customDomainService = new CustomDomainService();
export default customDomainService;