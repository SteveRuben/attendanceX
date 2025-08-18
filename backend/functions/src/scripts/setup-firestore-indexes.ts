/**
 * Script pour configurer automatiquement les index Firestore
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { generateFirestoreIndexesConfig, manualIndexInstructions } from '../config/firestore-indexes';

/**
 * Générer le fichier firestore.indexes.json
 */
function generateIndexesFile(): void {
  try {
    const config = generateFirestoreIndexesConfig();
    const configPath = join(process.cwd(), 'firestore.indexes.json');
    
    // Créer le répertoire si nécessaire
    const dir = join(process.cwd());
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Écrire le fichier de configuration
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log('✅ Fichier firestore.indexes.json généré avec succès');
    console.log(`📁 Emplacement: ${configPath}`);
    console.log(`📊 Nombre d'index: ${config.indexes.length}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération du fichier d\'index:', error);
    throw error;
  }
}

/**
 * Générer le fichier firestore.rules avec les règles de sécurité
 */
function generateSecurityRules(): void {
  try {
    const rules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================================================
    // RÈGLES POUR LA COLLECTION EMPLOYEES
    // ============================================================================
    match /employees/{employeeId} {
      // Lecture: employé lui-même, managers et admins de l'organisation
      allow read: if isAuthenticated() && (
        isOwner(employeeId) || 
        isManagerInOrganization(resource.data.organizationId) ||
        isAdmin()
      );
      
      // Écriture: managers et admins de l'organisation
      allow write: if isAuthenticated() && (
        isManagerInOrganization(resource.data.organizationId) ||
        isAdmin()
      );
    }
    
    // ============================================================================
    // RÈGLES POUR LA COLLECTION PRESENCE_ENTRIES
    // ============================================================================
    match /presence_entries/{entryId} {
      // Lecture: employé concerné, managers et admins de l'organisation
      allow read: if isAuthenticated() && (
        isEmployeeEntry(resource.data.employeeId) ||
        isManagerInOrganization(resource.data.organizationId) ||
        isAdmin()
      );
      
      // Création: employé concerné, managers et admins
      allow create: if isAuthenticated() && (
        isEmployeeEntry(request.resource.data.employeeId) ||
        isManagerInOrganization(request.resource.data.organizationId) ||
        isAdmin()
      ) && validatePresenceEntry();
      
      // Mise à jour: managers et admins seulement
      allow update: if isAuthenticated() && (
        isManagerInOrganization(resource.data.organizationId) ||
        isAdmin()
      ) && validatePresenceEntryUpdate();
      
      // Suppression: admins seulement
      allow delete: if isAuthenticated() && isAdmin();
    }
    
    // ============================================================================
    // RÈGLES POUR LA COLLECTION WORK_SCHEDULES
    // ============================================================================
    match /work_schedules/{scheduleId} {
      // Lecture: membres de l'organisation
      allow read: if isAuthenticated() && (
        isMemberOfOrganization(resource.data.organizationId) ||
        isAdmin()
      );
      
      // Écriture: managers et admins de l'organisation
      allow write: if isAuthenticated() && (
        isManagerInOrganization(resource.data.organizationId) ||
        isAdmin()
      );
    }
    
    // ============================================================================
    // RÈGLES POUR LA COLLECTION LEAVE_REQUESTS
    // ============================================================================
    match /leave_requests/{requestId} {
      // Lecture: employé concerné, managers et admins
      allow read: if isAuthenticated() && (
        isEmployeeEntry(resource.data.employeeId) ||
        isManagerInOrganization(resource.data.organizationId) ||
        isAdmin()
      );
      
      // Création: employé concerné
      allow create: if isAuthenticated() && 
        isEmployeeEntry(request.resource.data.employeeId) &&
        validateLeaveRequest();
      
      // Mise à jour: employé (avant approbation) ou managers/admins
      allow update: if isAuthenticated() && (
        (isEmployeeEntry(resource.data.employeeId) && resource.data.status == 'pending') ||
        isManagerInOrganization(resource.data.organizationId) ||
        isAdmin()
      );
      
      // Suppression: employé (avant approbation) ou admins
      allow delete: if isAuthenticated() && (
        (isEmployeeEntry(resource.data.employeeId) && resource.data.status == 'pending') ||
        isAdmin()
      );
    }
    
    // ============================================================================
    // RÈGLES POUR LA COLLECTION PRESENCE_REPORTS
    // ============================================================================
    match /presence_reports/{reportId} {
      // Lecture: créateur du rapport, managers et admins de l'organisation
      allow read: if isAuthenticated() && (
        resource.data.createdBy == request.auth.uid ||
        isManagerInOrganization(resource.data.organizationId) ||
        isAdmin()
      );
      
      // Écriture: managers et admins de l'organisation
      allow write: if isAuthenticated() && (
        isManagerInOrganization(request.resource.data.organizationId) ||
        isAdmin()
      );
    }
    
    // ============================================================================
    // RÈGLES POUR LA COLLECTION PRESENCE_AUDIT_LOGS
    // ============================================================================
    match /presence_audit_logs/{logId} {
      // Lecture: admins seulement
      allow read: if isAuthenticated() && isAdmin();
      
      // Écriture: système seulement (via triggers)
      allow write: if false;
    }
    
    // ============================================================================
    // RÈGLES POUR LA COLLECTION ORGANIZATION_PRESENCE_SETTINGS
    // ============================================================================
    match /organization_presence_settings/{settingsId} {
      // Lecture: membres de l'organisation
      allow read: if isAuthenticated() && (
        isMemberOfOrganization(resource.data.organizationId) ||
        isAdmin()
      );
      
      // Écriture: admins de l'organisation
      allow write: if isAuthenticated() && (
        isAdminInOrganization(resource.data.organizationId) ||
        isAdmin()
      );
    }
    
    // ============================================================================
    // RÈGLES POUR LA COLLECTION PRESENCE_NOTIFICATIONS
    // ============================================================================
    match /presence_notifications/{notificationId} {
      // Lecture: destinataire de la notification
      allow read: if isAuthenticated() && (
        resource.data.recipientId == request.auth.uid ||
        isAdmin()
      );
      
      // Mise à jour: destinataire (pour marquer comme lu)
      allow update: if isAuthenticated() && 
        resource.data.recipientId == request.auth.uid &&
        onlyUpdatingReadStatus();
      
      // Création/Suppression: système seulement
      allow create, delete: if false;
    }
    
    // ============================================================================
    // FONCTIONS UTILITAIRES
    // ============================================================================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return request.auth.token.role == 'admin';
    }
    
    function isOwner(employeeId) {
      return request.auth.uid == employeeId;
    }
    
    function isEmployeeEntry(employeeId) {
      // Vérifier si l'utilisateur est l'employé concerné
      return exists(/databases/$(database)/documents/employees/$(employeeId)) &&
             get(/databases/$(database)/documents/employees/$(employeeId)).data.userId == request.auth.uid;
    }
    
    function isMemberOfOrganization(organizationId) {
      // Vérifier si l'utilisateur est membre de l'organisation
      return request.auth.token.organizationId == organizationId;
    }
    
    function isManagerInOrganization(organizationId) {
      return request.auth.token.organizationId == organizationId &&
             (request.auth.token.role == 'manager' || request.auth.token.role == 'admin');
    }
    
    function isAdminInOrganization(organizationId) {
      return request.auth.token.organizationId == organizationId &&
             request.auth.token.role == 'admin';
    }
    
    function validatePresenceEntry() {
      let data = request.resource.data;
      return data.keys().hasAll(['employeeId', 'organizationId', 'date']) &&
             data.employeeId is string &&
             data.organizationId is string &&
             data.date is string;
    }
    
    function validatePresenceEntryUpdate() {
      // Empêcher la modification de certains champs critiques
      let unchangedFields = ['employeeId', 'organizationId', 'date', 'createdAt', 'createdBy'];
      return unchangedFields.all(field, resource.data[field] == request.resource.data[field]);
    }
    
    function validateLeaveRequest() {
      let data = request.resource.data;
      return data.keys().hasAll(['employeeId', 'organizationId', 'type', 'startDate', 'endDate']) &&
             data.employeeId is string &&
             data.organizationId is string &&
             data.type is string &&
             data.startDate is timestamp &&
             data.endDate is timestamp &&
             data.startDate <= data.endDate;
    }
    
    function onlyUpdatingReadStatus() {
      let changedFields = request.resource.data.diff(resource.data).changedKeys();
      return changedFields.hasOnly(['isRead', 'readAt', 'updatedAt']);
    }
  }
}`;

    const rulesPath = join(process.cwd(), 'firestore.rules');
    writeFileSync(rulesPath, rules.trim());
    
    console.log('✅ Fichier firestore.rules généré avec succès');
    console.log(`📁 Emplacement: ${rulesPath}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération des règles de sécurité:', error);
    throw error;
  }
}

/**
 * Afficher les instructions de déploiement
 */
function showDeploymentInstructions(): void {
  console.log(`
🚀 INSTRUCTIONS DE DÉPLOIEMENT
===============================

1. Déployer les index Firestore:
   firebase deploy --only firestore:indexes

2. Déployer les règles de sécurité:
   firebase deploy --only firestore:rules

3. Déployer les fonctions (triggers):
   firebase deploy --only functions

4. Vérifier le déploiement:
   firebase firestore:indexes

📋 INSTRUCTIONS MANUELLES
=========================
${manualIndexInstructions}

⚠️  IMPORTANT
=============
- Les index peuvent prendre plusieurs minutes à se construire
- Surveillez la console Firebase pour le statut des index
- Testez les requêtes après le déploiement des index
- Les règles de sécurité sont appliquées immédiatement

🔍 MONITORING
=============
- Surveillez les métriques de performance dans la console Firebase
- Vérifiez les logs des fonctions pour les erreurs de triggers
- Utilisez les outils de débogage Firestore pour optimiser les requêtes
`);
}

/**
 * Valider la configuration des index
 */
function validateIndexConfiguration(): boolean {
  try {
    const config = generateFirestoreIndexesConfig();
    
    // Vérifications de base
    if (!config.indexes || config.indexes.length === 0) {
      console.error('❌ Aucun index configuré');
      return false;
    }

    // Vérifier que chaque index a au moins un champ
    for (const index of config.indexes) {
      if (!index.fields || index.fields.length === 0) {
        console.error('❌ Index sans champs détecté');
        return false;
      }

      // Vérifier les champs requis
      for (const field of index.fields) {
        if (!field.fieldPath) {
          console.error('❌ Champ sans fieldPath détecté');
          return false;
        }
      }
    }

    console.log('✅ Configuration des index validée');
    console.log(`📊 ${config.indexes.length} index configurés`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error);
    return false;
  }
}

/**
 * Fonction principale
 */
async function main(): Promise<void> {
  try {
    console.log('🔧 Configuration des index Firestore pour la gestion de présence');
    console.log('================================================================');

    // 1. Valider la configuration
    if (!validateIndexConfiguration()) {
      process.exit(1);
    }

    // 2. Générer les fichiers
    generateIndexesFile();
    generateSecurityRules();

    // 3. Afficher les instructions
    showDeploymentInstructions();

    console.log('✅ Configuration terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

export {
  generateIndexesFile,
  generateSecurityRules,
  validateIndexConfiguration,
  showDeploymentInstructions
};