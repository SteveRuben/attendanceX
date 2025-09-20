// backend/functions/src/middleware/organization-context.middleware.ts - Middleware de contexte d'organisation

import { NextFunction, Response } from 'express';
import { collections } from '../config';
import { AuthenticatedRequest } from '../types/middleware.types';
import { OrganizationMember, OrganizationRole } from '../common/types';
import { ValidationError } from '../common/validators';



export class OrganizationContextMiddleware {


  /**
   * Middleware pour valider le contexte d'organisation
   */
  validateContext = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log('=== Organization Context Debug ===');
      console.log('URL:', req.url);
      console.log('Method:', req.method);
      console.log('Params:', req.params);
      console.log('User ID:', user.uid);

      // Récupérer l'ID d'organisation depuis les paramètres, le body ou l'utilisateur
      const organizationId = this.extractOrganizationId(req);
      console.log('Extracted Organization ID:', organizationId);
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'Organization context required'
        });
      }

      // Vérifier que l'utilisateur est membre de l'organisation
      const member = await this.getMember(organizationId, user.uid);
      console.log('Found member:', member);

      if (!member) {
        console.log('User is not a member of organization:', organizationId);
        return res.status(403).json({
          success: false,
          error: 'User is not a member of this organization'
        });
      }

      // Vérifier que le membre est actif
      if (!member.isActive) {
        return res.status(403).json({
          success: false,
          error: 'User membership is inactive'
        });
      }

      // Ajouter le contexte d'organisation à la requête
      req.organization = {
        organizationId: organizationId,
        member,
        permissions: member.permissions
      };

      return next();
    } catch (error) {
      console.error('Organization context validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Middleware pour enforcer l'accès basé sur l'organisation
   */
  enforceOrganizationAccess = (requiredPermission?: string, requiredRole?: OrganizationRole) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.organization) {
          return res.status(403).json({
            success: false,
            error: 'Organization context not found'
          });
        }

        const { member, permissions } = req.organization;

        // Vérifier le rôle requis
        if (requiredRole && member.role !== requiredRole) {
          // Permettre aux propriétaires et admins d'accéder aux ressources des rôles inférieurs
          const roleHierarchy = {
            [OrganizationRole.OWNER]: 5,
            [OrganizationRole.ADMIN]: 4,
            [OrganizationRole.MANAGER]: 3,
            [OrganizationRole.MEMBER]: 2,
            [OrganizationRole.VIEWER]: 1
          };

          const userRoleLevel = roleHierarchy[member.role];
          const requiredRoleLevel = roleHierarchy[requiredRole];

          if (userRoleLevel < requiredRoleLevel) {
            return res.status(403).json({
              success: false,
              error: `Role ${requiredRole} or higher required`
            });
          }
        }

        // Vérifier la permission requise
        if (requiredPermission && !permissions.includes(requiredPermission)) {
          return res.status(403).json({
            success: false,
            error: `Permission ${requiredPermission} required`
          });
        }

        return next();
      } catch (error) {
        console.error('Organization access enforcement error:', error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  };

  /**
   * Middleware pour filtrer les données par organisation
   */
  filterDataByOrganization = (dataField: string = 'data') => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.organization) {
          return res.status(403).json({
            success: false,
            error: 'Organization context required for data filtering'
          });
        }

        // Ajouter un hook pour filtrer les données dans la réponse
        const originalJson = res.json;
        res.json = function (body: any) {
          if (body?.[dataField]) {
            body[dataField] = filterByOrganization(body[dataField], req.organization!.organizationId);
          }
          return originalJson.call(this, body);
        };

        return next();
      } catch (error) {
        console.error('Data filtering error:', error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  };

  /**
   * Middleware pour vérifier que l'utilisateur a une organisation
   */
  requireOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Vérifier si l'utilisateur a une organisation
      const userDoc = await collections.users.doc(user.uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const userData = userDoc.data()!;
      if (!userData.organizationId) {
        return res.status(400).json({
          success: false,
          error: 'User must belong to an organization',
          needsOrganization: true
        });
      }

      return next();
    } catch (error) {
      console.error('Organization requirement check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Middleware pour les utilisateurs sans organisation (pour la création d'organisation)
   */
  requireNoOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Vérifier si l'utilisateur n'a pas d'organisation
      const memberQuery = await collections.organization_members
        .where('userId', '==', user.uid)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!memberQuery.empty) {
        return res.status(400).json({
          success: false,
          error: 'User already belongs to an organization'
        });
      }

      return next();
    } catch (error) {
      console.error('No organization requirement check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Utilitaire pour ajouter automatiquement le filtre d'organisation aux requêtes
   */
  addOrganizationFilter = (query: any, organizationId: string): any => {
    if (query.where) {
      // Si c'est une requête Firestore
      return query.where('organizationId', '==', organizationId);
    } else if (typeof query === 'object') {
      // Si c'est un objet de filtre
      return { ...query, organizationId };
    }
    return query;
  };

  /**
   * Utilitaire pour valider que les données appartiennent à l'organisation
   */
  validateOrganizationOwnership = (data: any, organizationId: string): boolean => {
    if (Array.isArray(data)) {
      return data.every(item => item.organizationId === organizationId);
    } else if (data && typeof data === 'object') {
      return data.organizationId === organizationId;
    }
    return false;
  };

  /**
   * Extraire l'ID d'organisation de la requête
   */
  private extractOrganizationId(req: AuthenticatedRequest): string | null {
    // Priorité: req.organization (pré-défini) > paramètres d'URL > body > query > headers
    const organizationId = req.organization?.organizationId ||
      req.params.organizationId ||
      req.params.id || // Support pour :id dans les routes d'organisation
      req.body?.organizationId ||
      req.query?.organizationId as string ||
      req.headers['x-organization-id'] as string ||
      null;

    // Si on trouve un organizationId et que req.organization n'existe pas, l'initialiser
    if (organizationId && !req.organization) {
      req.organization = {
        organizationId: organizationId,
        member: null as any,
        permissions: []
      };
    }

    return organizationId;
  }

  /**
   * Récupérer un membre d'organisation
   */
  private async getMember(organizationId: string, userId: string): Promise<OrganizationMember | null> {
    try {
      // D'abord, chercher dans la collection des membres
      const memberQuery = await collections.organization_members
        .where('organizationId', '==', organizationId)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!memberQuery.empty) {
        return memberQuery.docs[0].data() as OrganizationMember;
      }

      // Si pas trouvé comme membre, vérifier si l'utilisateur est le créateur de l'organisation
      /* const orgDoc = await collections.organizations.doc(organizationId).get();
      if (orgDoc.exists) {
        const orgData = orgDoc.data();
        if (orgData && orgData.createdBy === userId) {
          // Créer un membre temporaire pour le créateur
          return {
            id: `temp_${userId}`,
            organizationId: organizationId,
            userId: userId,
            role: 'owner' as any, // Le créateur est propriétaire
            isActive: true,
            joinedAt: new Date(),
            permissions: [], // Sera calculé par le système de permissions
            createdAt: new Date(),
            updatedAt: new Date()
          } as OrganizationMember;
        }
      } */

      return null;
    } catch (error) {
      console.error('Error getting organization member:', error);
      return null;
    }
  }
}

/**
 * Fonction utilitaire pour filtrer les données par organisation
 */
function filterByOrganization(data: any, organizationId: string): any {
  if (Array.isArray(data)) {
    return data.filter(item =>
      item && typeof item === 'object' && item.organizationId === organizationId
    );
  } else if (data && typeof data === 'object') {
    if (data.organizationId === organizationId) {
      return data;
    } else {
      return null;
    }
  }
  return data;
}

/**
 * Décorateur pour les méthodes de service qui nécessitent un contexte d'organisation
 */
export function RequireOrganizationContext(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const organizationId = args[0];
    if (!organizationId) {
      throw new ValidationError('Organization ID is required', "organizationId");
    }
    return method.apply(this, args);
  };
}

/**
 * Décorateur pour les méthodes de service qui filtrent automatiquement par organisation
 */
export function FilterByOrganization(organizationIdIndex: number = 0) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      const organizationId = args[organizationIdIndex];

      if (organizationId && result) {
        return filterByOrganization(result, organizationId);
      }

      return result;
    };
  };
}

/**
 * Middleware pour initialiser le contexte d'organisation
 * À utiliser avant validateContext si vous voulez pré-définir l'organizationId
 */
export const initializeOrganizationContext = (organizationId?: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Initialiser req.organization s'il n'existe pas
    if (!req.organization) {
      req.organization = {
        organizationId: organizationId || '',
        member: null as any,
        permissions: []
      };
    }

    // Si un organizationId est fourni, l'utiliser
    if (organizationId) {
      req.organization.organizationId = organizationId;
    }

    return next();
  };
};

/**
 * Middleware pour définir l'organizationId depuis les paramètres de la requête
 */
export const setOrganizationFromParams = (paramName: string = 'id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const organizationId = req.params[paramName];

    if (organizationId) {
      // Initialiser req.organization s'il n'existe pas
      if (!req.organization) {
        req.organization = {
          organizationId: organizationId,
          member: null as any,
          permissions: []
        };
      } else {
        req.organization.organizationId = organizationId;
      }
    }

    return next();
  };
};

// Instance singleton du middleware
export const organizationContextMiddleware = new OrganizationContextMiddleware();

// Exports des middlewares individuels pour faciliter l'utilisation
export const validateContext = organizationContextMiddleware.validateContext;
export const enforceOrganizationAccess = organizationContextMiddleware.enforceOrganizationAccess;
export const filterDataByOrganization = organizationContextMiddleware.filterDataByOrganization;
export const requireOrganization = organizationContextMiddleware.requireOrganization;
export const requireNoOrganization = organizationContextMiddleware.requireNoOrganization;