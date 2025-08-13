# Guide utilisateur : Connexion des intégrations

Ce guide vous explique comment connecter vos comptes de services tiers à Attendance-X.

## Prérequis

- Compte Attendance-X actif
- Comptes sur les services que vous souhaitez intégrer
- Permissions appropriées dans votre organisation

## Accéder aux intégrations

1. Connectez-vous à Attendance-X
2. Allez dans **Paramètres** > **Intégrations**
3. Vous verrez la liste des intégrations disponibles

## Connecter Google Workspace

### Étape 1 : Initier la connexion
1. Cliquez sur **Connecter** à côté de "Google Workspace"
2. Sélectionnez les permissions souhaitées :
   - ✅ **Calendrier** : Synchroniser vos événements
   - ✅ **Contacts** : Importer vos contacts
   - ✅ **Email** : Recevoir des notifications

### Étape 2 : Autorisation Google
1. Une nouvelle fenêtre s'ouvre avec la page d'autorisation Google
2. Connectez-vous avec votre compte Google
3. Examinez les permissions demandées
4. Cliquez sur **Autoriser**

### Étape 3 : Configuration
1. Retour automatique sur Attendance-X
2. Configurez vos préférences de synchronisation :
   - **Fréquence** : Temps réel, horaire, quotidienne
   - **Direction** : Unidirectionnelle ou bidirectionnelle
   - **Calendriers** : Sélectionnez quels calendriers synchroniser

### Étape 4 : Test de connexion
1. Cliquez sur **Tester la connexion**
2. Vérifiez que le statut affiche "✅ Connecté"
3. Lancez une synchronisation test

## Connecter Microsoft 365

### Étape 1 : Initier la connexion
1. Cliquez sur **Connecter** à côté de "Microsoft 365"
2. Sélectionnez les services :
   - ✅ **Outlook Calendar**
   - ✅ **Microsoft Teams**
   - ✅ **OneDrive**

### Étape 2 : Autorisation Microsoft
1. Nouvelle fenêtre avec Microsoft Login
2. Entrez vos identifiants Office 365
3. Acceptez les permissions demandées
4. Cliquez sur **Accepter**

### Étape 3 : Configuration Teams
1. Configurez les notifications Teams :
   - **Canal** : Sélectionnez le canal pour les notifications
   - **Mentions** : Activez/désactivez les mentions @
   - **Statut** : Synchronisation du statut de présence

### Étape 4 : Test et validation
1. Testez la connexion Outlook
2. Vérifiez la synchronisation Teams
3. Confirmez l'accès OneDrive

## Connecter Slack

### Étape 1 : Installation de l'app
1. Cliquez sur **Connecter** à côté de "Slack"
2. Sélectionnez votre workspace Slack
3. Cliquez sur **Installer l'application**

### Étape 2 : Configuration des notifications
1. Choisissez les canaux pour les notifications :
   - **#général** : Notifications d'équipe
   - **#présences** : Alertes de présence
   - **DM** : Messages privés
2. Configurez les types de notifications :
   - Arrivées/départs
   - Retards
   - Absences
   - Rappels

### Étape 3 : Commandes Slack
Apprenez les commandes disponibles :
- `/attendance checkin` : Marquer son arrivée
- `/attendance checkout` : Marquer son départ
- `/attendance status` : Voir son statut
- `/attendance help` : Aide complète

## Connecter Zoom

### Étape 1 : Autorisation Zoom
1. Cliquez sur **Connecter** à côté de "Zoom"
2. Connectez-vous à votre compte Zoom
3. Autorisez l'accès aux réunions et webinaires

### Étape 2 : Configuration des réunions
1. **Réunions automatiques** :
   - Créer des liens Zoom pour les événements
   - Paramètres par défaut (mot de passe, salle d'attente)
2. **Webinaires** :
   - Gestion des événements publics
   - Enregistrement automatique

### Étape 3 : Intégration calendrier
1. Liez Zoom à votre calendrier principal
2. Configuration des invitations automatiques
3. Gestion des rappels de réunion

## Gestion des permissions

### Révision des autorisations
Vous pouvez à tout moment :
1. Voir les permissions accordées
2. Modifier les paramètres de synchronisation
3. Révoquer l'accès à certaines données

### Sécurité et confidentialité
- 🔒 **Chiffrement** : Toutes les données sont chiffrées
- 🔑 **Tokens sécurisés** : Stockage sécurisé des tokens d'accès
- 🕒 **Expiration** : Renouvellement automatique des autorisations
- 🚫 **Révocation** : Possibilité de déconnecter à tout moment

## Vérification du statut

### Indicateurs de statut
- 🟢 **Connecté** : Intégration active et fonctionnelle
- 🟡 **Attention** : Problème mineur, synchronisation partielle
- 🔴 **Erreur** : Problème majeur, intervention requise
- ⚪ **Déconnecté** : Intégration non configurée

### Actions disponibles
- **Tester** : Vérifier la connexion
- **Synchroniser** : Lancer une sync manuelle
- **Configurer** : Modifier les paramètres
- **Déconnecter** : Supprimer l'intégration

## Bonnes pratiques

### Sécurité
- ✅ Utilisez des comptes professionnels
- ✅ Vérifiez régulièrement les permissions
- ✅ Déconnectez les intégrations inutilisées
- ✅ Signalez tout comportement suspect

### Performance
- ✅ Limitez le nombre de calendriers synchronisés
- ✅ Choisissez la fréquence de sync appropriée
- ✅ Nettoyez régulièrement l'historique

### Collaboration
- ✅ Informez votre équipe des intégrations actives
- ✅ Respectez les politiques de l'organisation
- ✅ Documentez vos configurations personnalisées

## Prochaines étapes

Une fois vos intégrations connectées :
1. [Configurez vos préférences de synchronisation](./managing-sync.md)
2. [Explorez les fonctionnalités avancées](./advanced-features.md)
3. [Consultez les conseils de dépannage](../troubleshooting/common-issues.md)

## Support

Besoin d'aide ? Contactez-nous :
- 💬 Chat en direct dans l'application
- 📧 Email : integrations@attendance-x.com
- 📞 Téléphone : +33 1 23 45 67 89