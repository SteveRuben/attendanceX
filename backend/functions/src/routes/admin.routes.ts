/**
 * Routes d'administration pour les tâches de maintenance
 */

import { Router } from 'express';

import { Response } from 'express';
import { fixUserOrganizationSync } from '../scripts/fix-user-organization-sync';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { collections } from '../config/database';

const router = Router();

/**
 * Endpoint pour corriger la synchronisation utilisateur-organisation
 * ATTENTION: Cet endpoint devrait être protégé en production
 */
router.post('/fix-user-organization-sync', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // En production, ajouter une vérification d'autorisation admin
  // if (!req.user.isAdmin) {
  //   return res.status(403).json({ error: 'Accès refusé' });
  // }

  console.log(`🔧 Correction de synchronisation demandée par l'utilisateur: ${req.user?.uid}`);

  try {
    await fixUserOrganizationSync();
    
    res.json({
      success: true,
      message: 'Synchronisation utilisateur-organisation corrigée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la correction:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la correction de synchronisation'
    });
  }
}));

/**
 * Endpoint de diagnostic pour vérifier l'état de synchronisation d'un utilisateur
 */
router.get('/check-user-organization-sync/:userId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  
  try {
    // Importer les collections    
    // 1. Récupérer l'utilisateur
    const userDoc = await collections.users.doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    // 2. Récupérer les memberships
    const membershipsSnapshot = await collections.organization_members
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();
    
    const memberships = membershipsSnapshot.docs.map(doc => doc.data());
    
    // 3. Diagnostic
    const diagnostic = {
      userId,
      user: {
        exists: userDoc.exists,
        organizationId: userData?.organizationId || null,
        role: userData?.role || null
      },
      memberships: memberships.map(m => ({
        organizationId: m.organizationId,
        role: m.role,
        isActive: m.isActive
      })),
      issues: [] as string[]
    };
    
    // Détecter les problèmes
    if (memberships.length > 0 && !userData?.organizationId) {
      diagnostic.issues.push('Utilisateur a des memberships mais pas d\'organizationId');
    }
    
    if (userData?.organizationId && memberships.length === 0) {
      diagnostic.issues.push('Utilisateur a un organizationId mais pas de membership actif');
    }
    
    if (memberships.length > 1) {
      diagnostic.issues.push('Utilisateur a plusieurs memberships (non supporté actuellement)');
    }
    
    res.json({
      success: true,
      diagnostic
    });
  } catch (error) {
    console.error('Erreur lors du diagnostic:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du diagnostic'
    });
  }
}));

export default router;