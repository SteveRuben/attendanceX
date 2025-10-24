# Guide de Formation Utilisateur - Architecture Multi-Tenant

## Introduction

Ce guide de formation s'adresse aux utilisateurs finaux et administrateurs qui découvrent les nouvelles fonctionnalités multi-tenant du système de gestion de présence.

## Module 1 : Concepts de Base

### Qu'est-ce qu'un Tenant ?

Un **tenant** (ou locataire) représente votre organisation dans le système. Chaque tenant dispose de :
- Ses propres données complètement isolées
- Sa configuration personnalisée
- Ses utilisateurs et permissions
- Son abonnement et facturation

### Avantages du Multi-Tenant

1. **Isolation complète** : Vos données sont totalement séparées des autres organisations
2. **Personnalisation** : Configuration adaptée à vos besoins spécifiques
3. **Évolutivité** : Ressources partagées pour une meilleure performance
4. **Coût optimisé** : Facturation basée sur votre usage réel

## Module 2 : Interface Utilisateur

### Connexion et Sélection du Tenant

#### Nouvelle Interface de Connexion

1. **Saisie de l'email** : Entrez votre adresse email
2. **Sélection automatique du tenant** : Le système détecte automatiquement votre organisation
3. **Authentification** : Saisissez votre mot de passe
4. **Accès au tableau de bord** : Redirection vers votre espace organisation

```
┌─────────────────────────────────────┐
│           Connexion                 │
├─────────────────────────────────────┤
│ Email: user@monentreprise.com       │
│ Organisation: Mon Entreprise        │
│ Mot de passe: ••••••••••           │
│                                     │
│ [Se connecter]                      │
└─────────────────────────────────────┘
```

#### Utilisateurs Multi-Tenant

Si vous appartenez à plusieurs organisations :

1. **Sélection du tenant** : Choisissez l'organisation souhaitée
2. **Changement de contexte** : Utilisez le sélecteur en haut à droite
3. **Permissions différentes** : Vos droits peuvent varier selon l'organisation

### Nouveau Tableau de Bord

#### Informations du Tenant

Le tableau de bord affiche maintenant :
- **Nom de l'organisation** en en-tête
- **Plan d'abonnement** actuel
- **Usage des ressources** (utilisateurs, événements, stockage)
- **Statut de facturation**

#### Indicateurs d'Usage

```
┌─────────────────────────────────────┐
│ Mon Entreprise - Plan Professional  │
├─────────────────────────────────────┤
│ Utilisateurs: 45/100 ████████░░     │
│ Événements: 120/500 ███░░░░░░░      │
│ Stockage: 2.5/5 GB ████░░░░░░       │
│                                     │
│ Prochaine facturation: 15/02/2024   │
└─────────────────────────────────────┘
```

## Module 3 : Gestion des Utilisateurs

### Invitation d'Utilisateurs

#### Processus d'Invitation

1. **Accès au menu** : Paramètres > Utilisateurs
2. **Bouton "Inviter"** : Cliquez sur "Inviter un utilisateur"
3. **Saisie des informations** :
   - Email de l'utilisateur
   - Rôle (Administrateur, Manager, Membre, Observateur)
   - Permissions spécifiques (optionnel)
4. **Envoi de l'invitation** : L'utilisateur reçoit un email d'invitation
5. **Acceptation** : L'utilisateur clique sur le lien pour rejoindre l'organisation

#### Rôles et Permissions

| Rôle | Permissions | Description |
|------|-------------|-------------|
| **Administrateur** | Toutes | Gestion complète de l'organisation |
| **Manager** | Gestion équipe, événements | Gestion d'équipe et planification |
| **Membre** | Participation, création limitée | Utilisateur standard |
| **Observateur** | Lecture seule | Consultation uniquement |

### Gestion des Équipes

#### Création d'Équipes

1. **Menu Équipes** : Accédez à la section Équipes
2. **Nouvelle équipe** : Cliquez sur "Créer une équipe"
3. **Configuration** :
   - Nom de l'équipe
   - Description
   - Manager responsable
   - Membres de l'équipe
4. **Permissions d'équipe** : Définissez les droits spécifiques

## Module 4 : Facturation et Abonnements

### Comprendre Votre Plan

#### Types de Plans

1. **Gratuit** (0€/mois)
   - 5 utilisateurs maximum
   - 10 événements par mois
   - 100 MB de stockage
   - Support communautaire

2. **Basic** (29€/mois)
   - 25 utilisateurs
   - 100 événements par mois
   - 1 GB de stockage
   - Support email

3. **Professional** (99€/mois)
   - 100 utilisateurs
   - 500 événements par mois
   - 5 GB de stockage
   - Fonctionnalités avancées
   - Support prioritaire

4. **Enterprise** (299€/mois)
   - Utilisateurs illimités
   - Événements illimités
   - 50 GB de stockage
   - Toutes les fonctionnalités
   - Support dédié

### Surveillance de l'Usage

#### Dashboard de Facturation

Accédez à **Paramètres > Facturation** pour voir :

1. **Usage actuel** : Graphiques en temps réel
2. **Historique des factures** : Téléchargement PDF
3. **Méthodes de paiement** : Gestion des cartes
4. **Prévisions** : Estimation de la prochaine facture

#### Alertes d'Usage

Le système vous alerte automatiquement :
- **80% d'usage** : Notification par email
- **90% d'usage** : Alerte dans l'interface
- **100% d'usage** : Blocage des nouvelles créations

### Changement de Plan

#### Processus de Mise à Niveau

1. **Accès aux plans** : Facturation > Changer de plan
2. **Comparaison** : Tableau comparatif des fonctionnalités
3. **Sélection** : Choisissez le nouveau plan
4. **Facturation** : Choix mensuel ou annuel (-20%)
5. **Confirmation** : Validation et paiement
6. **Activation** : Immédiate avec proratisation

#### Rétrogradation

⚠️ **Attention** : La rétrogradation peut entraîner :
- Perte d'accès à certaines fonctionnalités
- Suppression des données excédentaires
- Limitation des utilisateurs actifs

## Module 5 : Fonctionnalités Avancées

### Personnalisation de l'Organisation

#### Branding (Plans Pro et Enterprise)

1. **Logo personnalisé** : Upload de votre logo (formats PNG, JPG)
2. **Couleurs** : Personnalisation des couleurs principales
3. **Domaine personnalisé** : votre-entreprise.attendance-x.com
4. **Emails personnalisés** : Templates avec votre branding

#### Paramètres Avancés

- **Fuseau horaire** : Configuration globale de l'organisation
- **Langue** : Interface en français, anglais, etc.
- **Notifications** : Préférences email, SMS, push
- **Sécurité** : Politique de mots de passe, 2FA obligatoire

### Intégrations

#### Connexions Disponibles

1. **Calendriers** : Google Calendar, Outlook, Apple Calendar
2. **Communication** : Slack, Microsoft Teams, Discord
3. **RH** : BambooHR, Workday, ADP
4. **Comptabilité** : QuickBooks, Sage, Cegid

#### Configuration d'une Intégration

1. **Menu Intégrations** : Paramètres > Intégrations
2. **Sélection du service** : Choisissez l'application à connecter
3. **Authentification** : Autorisez l'accès (OAuth)
4. **Configuration** : Paramètres de synchronisation
5. **Test** : Vérification du bon fonctionnement

### API et Webhooks

#### Clés API (Plans Pro et Enterprise)

1. **Génération** : Paramètres > API > Nouvelle clé
2. **Permissions** : Définissez les droits d'accès
3. **Utilisation** : Intégration dans vos applications
4. **Monitoring** : Suivi de l'usage API

#### Webhooks

Configuration des notifications automatiques :
- **URL de destination** : Votre endpoint
- **Événements** : Sélection des événements à recevoir
- **Sécurité** : Signature des payloads
- **Test** : Validation du fonctionnement

## Module 6 : Sécurité et Conformité

### Bonnes Pratiques de Sécurité

#### Gestion des Mots de Passe

1. **Politique forte** : Minimum 12 caractères, majuscules, chiffres, symboles
2. **Authentification à deux facteurs** : Activation recommandée
3. **Renouvellement** : Changement régulier (tous les 90 jours)
4. **Gestionnaire de mots de passe** : Utilisation recommandée

#### Contrôle d'Accès

1. **Principe du moindre privilège** : Permissions minimales nécessaires
2. **Révision régulière** : Audit trimestriel des accès
3. **Départ d'employés** : Désactivation immédiate des comptes
4. **Sessions** : Déconnexion automatique après inactivité

### Conformité RGPD

#### Droits des Utilisateurs

1. **Droit d'accès** : Export des données personnelles
2. **Droit de rectification** : Modification des informations
3. **Droit à l'effacement** : Suppression des données
4. **Droit à la portabilité** : Export dans un format standard

#### Procédures

- **Export de données** : Paramètres > Confidentialité > Exporter mes données
- **Suppression de compte** : Demande via support@attendance-x.com
- **Consentement** : Gestion des préférences de communication

## Module 7 : Résolution de Problèmes

### Problèmes Courants

#### Connexion Impossible

**Symptômes** : Impossible de se connecter
**Solutions** :
1. Vérifiez votre email et mot de passe
2. Contrôlez que votre compte n'est pas suspendu
3. Videz le cache de votre navigateur
4. Essayez en navigation privée
5. Contactez votre administrateur

#### Données Manquantes

**Symptômes** : Événements ou utilisateurs non visibles
**Solutions** :
1. Vérifiez que vous êtes dans la bonne organisation
2. Contrôlez vos permissions d'accès
3. Vérifiez les filtres appliqués
4. Actualisez la page (F5)

#### Limites Atteintes

**Symptômes** : Impossible de créer de nouveaux éléments
**Solutions** :
1. Vérifiez votre usage dans Facturation
2. Supprimez des éléments inutiles
3. Considérez une mise à niveau de plan
4. Contactez votre administrateur

### Support Technique

#### Canaux de Support

1. **Documentation** : https://docs.attendance-x.com
2. **Base de connaissances** : FAQ et tutoriels
3. **Email** : support@attendance-x.com
4. **Chat en ligne** : Disponible dans l'application
5. **Téléphone** : +33 1 XX XX XX XX (Plans Pro et Enterprise)

#### Informations à Fournir

Lors d'une demande de support, incluez :
- **ID de votre organisation** (visible dans Paramètres)
- **Description détaillée** du problème
- **Étapes pour reproduire** le problème
- **Captures d'écran** si pertinentes
- **Navigateur et version** utilisés

## Module 8 : Bonnes Pratiques

### Organisation des Données

#### Structure Recommandée

1. **Équipes par département** : RH, IT, Commercial, etc.
2. **Événements par type** : Réunions, formations, événements
3. **Utilisateurs par rôle** : Attribution claire des responsabilités
4. **Projets par client** : Séparation des activités client

#### Nommage Cohérent

- **Événements** : [Type] - [Sujet] - [Date] (ex: "Réunion - Équipe IT - 15/01")
- **Équipes** : [Département] - [Spécialité] (ex: "IT - Développement")
- **Projets** : [Client] - [Nom Projet] (ex: "ACME Corp - Site Web")

### Optimisation des Performances

#### Bonnes Pratiques

1. **Archivage régulier** : Archivez les anciens événements
2. **Nettoyage des données** : Supprimez les éléments inutiles
3. **Optimisation des images** : Compressez les fichiers uploadés
4. **Utilisation du cache** : Actualisez seulement si nécessaire

### Formation Continue

#### Ressources d'Apprentissage

1. **Webinaires mensuels** : Nouvelles fonctionnalités
2. **Tutoriels vidéo** : Bibliothèque de formations
3. **Certification** : Programme de certification utilisateur
4. **Communauté** : Forum d'entraide entre utilisateurs

## Conclusion

L'architecture multi-tenant apporte de nombreux avantages :
- **Isolation sécurisée** de vos données
- **Personnalisation** adaptée à vos besoins
- **Évolutivité** selon votre croissance
- **Optimisation des coûts** basée sur l'usage

### Prochaines Étapes

1. **Explorez** votre nouveau tableau de bord
2. **Configurez** les paramètres de votre organisation
3. **Invitez** vos collaborateurs
4. **Personnalisez** selon vos besoins
5. **Formez** votre équipe aux nouvelles fonctionnalités

### Ressources Supplémentaires

- **Guide administrateur** : Documentation avancée
- **API Documentation** : Pour les intégrations
- **Changelog** : Suivi des nouvelles fonctionnalités
- **Roadmap** : Fonctionnalités à venir

---

*Ce guide sera mis à jour régulièrement. Dernière mise à jour : Janvier 2024*