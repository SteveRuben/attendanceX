# Plan d'Implémentation

- [x] 1. Corriger les interfaces de présence de base


  - Étendre l'interface PresenceEntry avec les propriétés calculées manquantes (totalHours, effectiveHours, totalBreakHours)
  - Ajouter les propriétés d'anomalie (hasAnomalies, anomalyTypes, anomalyDetails)
  - Mettre à jour l'interface Employee avec les propriétés manquantes (workingYears, leaveBalances)
  - _Exigences: 3.1, 3.2, 3.3_

- [x] 2. Étendre les types de requête Express


  - Créer un fichier de déclaration de types pour étendre l'interface Request
  - Ajouter les propriétés utilisateur (uid, email, role, permissions, sessionId, isAdmin, organizationId)
  - Configurer TypeScript pour reconnaître les extensions de types
  - _Exigences: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Corriger les interfaces d'anomalie et d'alerte




  - Créer l'interface PresenceAlert avec les propriétés requises (entryId, types, details, severity)
  - Définir les types d'anomalie et leurs structures de données
  - Mettre à jour les méthodes de détection d'anomalie pour utiliser les bonnes interfaces
  - _Exigences: 3.3, 3.4_



- [x] 4. Mettre à jour la configuration des collections Firestore

  - Ajouter toutes les collections manquantes dans le fichier de configuration
  - Vérifier que toutes les collections utilisées dans le code sont définies
  - Corriger les références aux collections dans les services
  - _Exigences: 4.1, 4.2, 4.3_

- [x] 5. Corriger les imports et dépendances manquantes



  - Installer express-rate-limit et ses types
  - Corriger les imports de PDFDocument pour utiliser l'import namespace
  - Mettre à jour les imports Firebase/Firestore pour utiliser les bonnes versions


  - Ajouter l'import manquant pour 'db' dans les fichiers qui l'utilisent
  - _Exigences: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3_

- [x] 6. Implémenter les méthodes de service manquantes


  - Ajouter les méthodes manquantes dans PresenceNotificationService (sendLeaveApprovalNotification, sendLeaveRejectionNotification, etc.)
  - Implémenter les méthodes de détection d'anomalie dans PresenceService
  - Ajouter les méthodes d'audit manquantes dans PresenceAuditService
  - _Exigences: 5.1, 5.2, 5.3_

- [x] 7. Corriger les signatures de méthodes et types de retour




  - Mettre à jour les fonctions schedulées pour retourner void ou Promise<void>
  - Corriger les signatures des méthodes de service pour correspondre à leur utilisation
  - Ajuster les types de paramètres pour correspondre aux interfaces mises à jour



  - _Exigences: 5.4, 6.4_

- [x] 8. Remplacer les APIs dépréciées


  - Remplacer les méthodes crypto dépréciées par leurs équivalents modernes
  - Mettre à jour l'utilisation de PDFDocument pour la version actuelle
  - Corriger l'utilisation des APIs Firebase pour les versions récentes
  - _Exigences: 6.1, 6.2_

- [x] 9. Nettoyer les imports et variables inutilisés


  - Supprimer tous les imports inutilisés dans les fichiers
  - Enlever les variables déclarées mais non utilisées
  - Préfixer avec underscore les paramètres intentionnellement inutilisés
  - _Exigences: 8.1, 8.2, 8.3, 8.4_


- [x] 10. Valider et tester les corrections

  - Exécuter la compilation TypeScript pour vérifier qu'il n'y a plus d'erreurs
  - Tester que les fonctionnalités existantes continuent de fonctionner
  - Vérifier que les nouvelles propriétés sont correctement calculées
  - _Exigences: 9.1, 9.2, 9.3, 9.4_