/**
 * Middleware pour la résolution de tenant par domaine personnalisé
 */

import { Request, Response, NextFunction } from 'express';
import { customDomainService } from '../services/domain/custom-domain.service';
import { tenantService } from '../services/tenant/tenant.service';

export interface DomainContext {
  domain: string;
  tenantId?: string;
  isCustomDomain: boolean;
  isSubdomain: boolean;
}

declare global {
  namespace Express {
    interface Request {
      domainContext?: DomainContext;
    }
  }
}

export class DomainResolutionMiddleware {

  /**
   * Résoudre le tenant basé sur le domaine de la requête
   */
  async resolveTenantByDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const host = req.get('host');
      if (!host) {
        return next();
      }

      // Nettoyer le domaine (supprimer le port si présent)
      const domain = host.split(':')[0].toLowerCase();

      // Initialiser le contexte de domaine
      const domainContext: DomainContext = {
        domain,
        isCustomDomain: false,
        isSubdomain: false
      };

      // Vérifier si c'est un domaine personnalisé
      const tenantId = await customDomainService.resolveTenantByDomain(domain);
      
      if (tenantId) {
        domainContext.tenantId = tenantId;
        domainContext.isCustomDomain = true;
        
        // Vérifier si c'est un sous-domaine
        const parts = domain.split('.');
        if (parts.length >= 3) {
          domainContext.isSubdomain = true;
        }

        // Charger les informations du tenant
        const tenant = await tenantService.getTenant(tenantId);
        if (tenant) {
          req.tenantContext = {
            tenant,
            user: req.user || null,
            permissions: []
          };
        }
      } else {
        // Vérifier si c'est un sous-domaine de la plateforme (tenant.platform.com)
        const platformDomain = process.env.PLATFORM_DOMAIN || 'localhost';
        if (domain.endsWith(`.${platformDomain}`)) {
          const subdomain = domain.replace(`.${platformDomain}`, '');
          if (subdomain && subdomain !== platformDomain) {
            domainContext.isSubdomain = true;
            
            // Essayer de résoudre le tenant par slug
            const tenant = await tenantService.getTenantBySlug(subdomain);
            if (tenant) {
              domainContext.tenantId = tenant.id;
              req.tenantContext = {
                tenant,
                user: req.user || null,
                permissions: []
              };
            }
          }
        }
      }

      req.domainContext = domainContext;
      next();
    } catch (error) {
      console.error('Error resolving tenant by domain:', error);
      next();
    }
  }

  /**
   * Rediriger vers HTTPS si nécessaire
   */
  async enforceHttpsRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Ignorer en développement
      if (process.env.NODE_ENV === 'development') {
        return next();
      }

      const domainContext = req.domainContext;
      if (!domainContext?.isCustomDomain || !domainContext.tenantId) {
        return next();
      }

      // Vérifier si le domaine a la redirection HTTPS activée
      const domains = await customDomainService.getTenantDomains(domainContext.tenantId);
      const customDomain = domains.find(d => d.domain === domainContext.domain);

      if (customDomain?.redirectToHttps && req.protocol !== 'https') {
        const httpsUrl = `https://${req.get('host')}${req.originalUrl}`;
        return res.redirect(301, httpsUrl);
      }

      next();
    } catch (error) {
      console.error('Error enforcing HTTPS redirect:', error);
      next();
    }
  }

  /**
   * Gérer les redirections WWW
   */
  async handleWwwRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const domainContext = req.domainContext;
      if (!domainContext?.isCustomDomain || !domainContext.tenantId) {
        return next();
      }

      const host = req.get('host');
      if (!host) {
        return next();
      }

      // Vérifier la configuration de redirection WWW
      const domains = await customDomainService.getTenantDomains(domainContext.tenantId);
      const customDomain = domains.find(d => 
        d.domain === domainContext.domain || 
        d.domain === domainContext.domain.replace('www.', '')
      );

      if (!customDomain || customDomain.wwwRedirect === 'none') {
        return next();
      }

      const isWww = host.startsWith('www.');
      let redirectUrl: string | null = null;

      if (customDomain.wwwRedirect === 'www_to_non_www' && isWww) {
        // Rediriger de www vers non-www
        const nonWwwHost = host.replace('www.', '');
        redirectUrl = `${req.protocol}://${nonWwwHost}${req.originalUrl}`;
      } else if (customDomain.wwwRedirect === 'non_www_to_www' && !isWww) {
        // Rediriger de non-www vers www
        const wwwHost = `www.${host}`;
        redirectUrl = `${req.protocol}://${wwwHost}${req.originalUrl}`;
      }

      if (redirectUrl) {
        return res.redirect(301, redirectUrl);
      }

      next();
    } catch (error) {
      console.error('Error handling WWW redirect:', error);
      next();
    }
  }

  /**
   * Injecter les métadonnées de domaine personnalisé
   */
  async injectDomainMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const domainContext = req.domainContext;
      if (domainContext?.isCustomDomain && domainContext.tenantId) {
        // Ajouter des headers personnalisés
        res.setHeader('X-Tenant-Domain', domainContext.domain);
        res.setHeader('X-Tenant-ID', domainContext.tenantId);
        
        if (domainContext.isSubdomain) {
          res.setHeader('X-Domain-Type', 'subdomain');
        } else {
          res.setHeader('X-Domain-Type', 'custom');
        }
      }

      next();
    } catch (error) {
      console.error('Error injecting domain metadata:', error);
      next();
    }
  }
}

// Instance singleton
export const domainResolutionMiddleware = new DomainResolutionMiddleware();
export default domainResolutionMiddleware;