import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { OrganizationRole } from '@attendance-x/shared';
import { collections } from '../config';
import { logger } from 'firebase-functions';

export interface OrganizationPermissions {
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewReports: boolean;
  canManageIntegrations: boolean;
  canInviteUsers: boolean;
  canDeleteData: boolean;
  canManageBilling: boolean;
  canAccessAuditLogs: boolean;
}

const ROLE_PERMISSIONS: Record<OrganizationRole, OrganizationPermissions> = {
  [OrganizationRole.OWNER]: {
    canManageUsers: true,
    canManageSettings: true,
    canViewReports: true,
    canManageIntegrations: true,
    canInviteUsers: true,
    canDeleteData: true,
    canManageBilling: true,
    canAccessAuditLogs: true,
  },
  [OrganizationRole.ADMIN]: {
    canManageUsers: true,
    canManageSettings: true,
    canViewReports: true,
    canManageIntegrations: true,
    canInviteUsers: true,
    canDeleteData: false,
    canManageBilling: false,
    canAccessAuditLogs: true,
  },
  [OrganizationRole.MANAGER]: {
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: true,
    canManageIntegrations: false,
    canInviteUsers: true,
    canDeleteData: false,
    canManageBilling: false,
    canAccessAuditLogs: false,
  },
  [OrganizationRole.MEMBER]: {
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: false,
    canManageIntegrations: false,
    canInviteUsers: false,
    canDeleteData: false,
    canManageBilling: false,
    canAccessAuditLogs: false,
  },
};

export const requireOrganizationPermission = (permission: keyof OrganizationPermissions) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.uid;
      
      // Récupérer les informations utilisateur
      const userDoc = await collections.users.doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé'
        });
      }

      const userData = userDoc.data();
      const organizationRole = userData?.organizationRole as OrganizationRole;
      
      if (!organizationRole) {
        return res.status(403).json({
          success: false,
          error: 'NO_ORGANIZATION_ROLE',
          message: 'Aucun rôle d\'organisation assigné'
        });
      }

      // Vérifier les permissions
      const permissions = ROLE_PERMISSIONS[organizationRole];
      if (!permissions[permission]) {
        logger.warn('Organization permission denied', {
          userId,
          organizationRole,
          requiredPermission: permission,
          organizationId: userData?.organizationId
        });

        return res.status(403).json({
          success: false,
          error: 'INSUFFICIENT_ORGANIZATION_PERMISSIONS',
          message: `Permission '${permission}' requise pour cette action`
        });
      }

      // Ajouter les permissions au request pour utilisation ultérieure
      req.organizationPermissions = permissions;
      req.organizationRole = organizationRole;
      
      next();
    } catch (error) {
      logger.error('Error checking organization permissions', { error, userId: req.user?.uid });
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la vérification des permissions'
      });
    }
  };
};

export const requireOrganizationOwner = requireOrganizationPermission('canDeleteData');
export const requireOrganizationAdmin = requireOrganizationPermission('canManageUsers');
export const requireOrganizationManager = requireOrganizationPermission('canInviteUsers');

// Middleware pour vérifier que l'utilisateur appartient à une organisation
export const requireOrganizationMembership = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const userId = req.user.uid;
    
    const userDoc = await collections.users.doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé'
      });
    }

    const userData = userDoc.data();
    const organizationId = userData?.organizationId;
    
    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'NO_ORGANIZATION',
        message: 'Utilisateur non associé à une organisation'
      });
    }

    // Vérifier que l'organisation existe
    const orgDoc = await collections.organizations.doc(organizationId).get();
    if (!orgDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'ORGANIZATION_NOT_FOUND',
        message: 'Organisation non trouvée'
      });
    }

    const orgData = orgDoc.data();
    if (orgData?.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'ORGANIZATION_SUSPENDED',
        message: 'Organisation suspendue'
      });
    }

    req.organizationId = organizationId;
    next();
  } catch (error) {
    logger.error('Error checking organization membership', { error, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Erreur lors de la vérification de l\'appartenance à l\'organisation'
    });
  }
};

// Utilitaire pour obtenir les permissions d'un rôle
export const getPermissionsForRole = (role: OrganizationRole): OrganizationPermissions => {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[OrganizationRole.MEMBER];
};

// Middleware pour logger les actions sensibles
export const auditOrganizationAction = (action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Logger l'action après la réponse
      if (res.statusCode < 400) {
        logger.info('Organization action performed', {
          action,
          userId: req.user?.uid,
          organizationId: req.organizationId,
          organizationRole: req.organizationRole,
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};