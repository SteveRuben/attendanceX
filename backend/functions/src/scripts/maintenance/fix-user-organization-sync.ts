/**
 * Script de migration pour corriger la synchronisation entre les utilisateurs et leurs organisations
 * Ce script met à jour le champ organizationId des utilisateurs basé sur leur appartenance dans organization_members
 */

import { collections } from '../../config';
import { OrganizationRole } from '../../common/types';

interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  isActive: boolean;
}

interface User {
  id: string;
  organizationId?: string;
  role?: OrganizationRole;
}

export async function fixUserOrganizationSync(): Promise<void> {
  console.log('🔧 Début de la correction de synchronisation utilisateur-organisation...');

  try {
    // 1. Récupérer tous les membres d'organisation actifs
    const membersSnapshot = await collections.organization_members
      .where('isActive', '==', true)
      .get();

    console.log(`📊 ${membersSnapshot.size} membres d'organisation trouvés`);

    const updates: Promise<any>[] = [];
    let fixedCount = 0;
    let alreadyCorrectCount = 0;

    // 2. Pour chaque membre, vérifier et corriger l'utilisateur correspondant
    for (const memberDoc of membersSnapshot.docs) {
      const member = memberDoc.data() as OrganizationMember;
      
      // Récupérer l'utilisateur
      const userDoc = await collections.users.doc(member.userId).get();
      
      if (!userDoc.exists) {
        console.warn(`⚠️ Utilisateur ${member.userId} non trouvé pour le membre ${member.id}`);
        continue;
      }

      const user = userDoc.data() as User;
      
      // Vérifier si l'utilisateur a besoin d'être mis à jour
      const needsUpdate = user.organizationId !== member.organizationId || user.role !== member.role;
      
      if (needsUpdate) {
        console.log(`🔄 Correction nécessaire pour l'utilisateur ${member.userId}:`, {
          currentOrgId: user.organizationId,
          correctOrgId: member.organizationId,
          currentRole: user.role,
          correctRole: member.role
        });

        // Ajouter la mise à jour à la liste
        updates.push(
          collections.users.doc(member.userId).update({
            organizationId: member.organizationId,
            role: member.role
          })
        );
        
        fixedCount++;
      } else {
        alreadyCorrectCount++;
      }
    }

    // 3. Exécuter toutes les mises à jour
    if (updates.length > 0) {
      console.log(`🚀 Exécution de ${updates.length} mises à jour...`);
      await Promise.all(updates);
      console.log(`✅ ${fixedCount} utilisateurs corrigés`);
    }

    // 4. Vérifier les utilisateurs orphelins (avec organizationId mais sans membership)
    console.log('🔍 Vérification des utilisateurs orphelins...');
    
    const usersWithOrgSnapshot = await collections.users
      .where('organizationId', '!=', null)
      .get();

    let orphanCount = 0;
    const orphanUpdates: Promise<any>[] = [];

    for (const userDoc of usersWithOrgSnapshot.docs) {
      const user = userDoc.data() as User;
      
      if (!user.organizationId) {continue;}

      // Vérifier si l'utilisateur a un membership actif
      const membershipSnapshot = await collections.organization_members
        .where('userId', '==', userDoc.id)
        .where('organizationId', '==', user.organizationId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (membershipSnapshot.empty) {
        console.log(`🧹 Utilisateur orphelin trouvé: ${userDoc.id} (org: ${user.organizationId})`);
        
        orphanUpdates.push(
          collections.users.doc(userDoc.id).update({
            organizationId: null,
            role: null
          })
        );
        
        orphanCount++;
      }
    }

    if (orphanUpdates.length > 0) {
      console.log(`🚀 Nettoyage de ${orphanUpdates.length} utilisateurs orphelins...`);
      await Promise.all(orphanUpdates);
      console.log(`✅ ${orphanCount} utilisateurs orphelins nettoyés`);
    }

    // 5. Résumé
    console.log('📈 Résumé de la correction:');
    console.log(`  - Utilisateurs déjà corrects: ${alreadyCorrectCount}`);
    console.log(`  - Utilisateurs corrigés: ${fixedCount}`);
    console.log(`  - Utilisateurs orphelins nettoyés: ${orphanCount}`);
    console.log('✅ Correction terminée avec succès');

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    throw error;
  }
}

// Fonction utilitaire pour exécuter le script
export async function runFixUserOrganizationSync(): Promise<void> {
  try {
    await fixUserOrganizationSync();
    process.exit(0);
  } catch (error) {
    console.error('❌ Échec de la correction:', error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  runFixUserOrganizationSync();
}