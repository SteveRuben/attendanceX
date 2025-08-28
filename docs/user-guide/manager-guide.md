# Guide Utilisateur - Manager

## Table des matières
1. [Introduction](#introduction)
2. [Dashboard Manager](#dashboard-manager)
3. [Gestion d'équipe](#gestion-déquipe)
4. [Validation des congés](#validation-des-congés)
5. [Gestion des anomalies](#gestion-des-anomalies)
6. [Rapports et analyses](#rapports-et-analyses)
7. [Gestion des plannings](#gestion-des-plannings)
8. [Administration](#administration)
9. [Bonnes pratiques](#bonnes-pratiques)
10. [Support](#support)

## Introduction

En tant que manager, vous avez accès à des fonctionnalités avancées pour gérer la présence de votre équipe, valider les demandes de congé et analyser les données de présence.

### Responsabilités du manager
- 👥 Supervision de l'équipe
- ✅ Validation des congés
- 🔍 Gestion des anomalies
- 📊 Analyse des données
- ⚙️ Configuration des paramètres d'équipe

## Dashboard Manager

### Vue d'ensemble

Le dashboard manager vous donne une vue temps réel de votre équipe :

**Indicateurs clés** :
- Employés présents / absents
- Retards du jour
- Heures supplémentaires
- Demandes en attente

**Widgets disponibles** :
- 📊 Graphique de présence
- ⏰ Timeline des pointages
- 🚨 Alertes et anomalies
- 📈 Tendances de l'équipe

### Personnalisation du dashboard

1. **Cliquez sur "Personnaliser"** en haut à droite
2. **Sélectionnez les widgets** à afficher
3. **Organisez la disposition** par glisser-déposer
4. **Sauvegardez votre configuration**

Widgets disponibles :
- Présence en temps réel
- Statistiques hebdomadaires
- Demandes de congé
- Anomalies récentes
- Performance d'équipe
- Calendrier des absences

## Gestion d'équipe

### Liste des employés

Accédez à la liste complète de votre équipe :
- **Statut actuel** de chaque employé
- **Heures de travail** de la journée
- **Localisation** (si activée)
- **Actions rapides** disponibles

### Statuts d'équipe

| Statut | Icône | Description |
|--------|-------|-------------|
| Présent | 🟢 | Employé au travail |
| En pause | 🟡 | En pause déjeuner/café |
| Absent | 🔴 | Pas encore arrivé |
| En congé | 🏖️ | Congé approuvé |
| Maladie | 🤒 | Arrêt maladie |
| Télétravail | 🏠 | Travail à domicile |

### Actions sur les employés

Pour chaque employé, vous pouvez :
- **Voir le détail** de sa journée
- **Consulter l'historique** de présence
- **Envoyer un message** ou rappel
- **Modifier le statut** si nécessaire
- **Générer un rapport** individuel

### Corrections manuelles

En cas d'oubli ou d'erreur de pointage :

1. **Sélectionnez l'employé** concerné
2. **Cliquez sur "Corriger le pointage"**
3. **Saisissez les informations** :
   - Heure d'arrivée/départ
   - Motif de la correction
   - Commentaire (optionnel)
4. **Validez la correction**

> ⚠️ **Important** : Toutes les corrections sont tracées dans l'audit.

## Validation des congés

### File d'attente des demandes

Accédez aux demandes en attente :
- **Tri par priorité** : Urgence, date de demande
- **Filtres disponibles** : Type, employé, période
- **Actions groupées** : Approuver/refuser plusieurs demandes

### Processus de validation

1. **Cliquez sur une demande** pour voir les détails
2. **Vérifiez les informations** :
   - Période demandée
   - Type de congé
   - Solde disponible
   - Conflits potentiels
3. **Prenez une décision** :
   - Approuver
   - Refuser avec motif
   - Demander des modifications
4. **Ajoutez un commentaire** (optionnel)
5. **Validez votre décision**

### Critères de validation

**Points à vérifier** :
- ✅ Solde de congés suffisant
- ✅ Préavis respecté
- ✅ Pas de conflit avec d'autres absences
- ✅ Charge de travail de l'équipe
- ✅ Périodes de forte activité

**Conflits possibles** :
- 🚫 Trop d'absences simultanées
- 🚫 Période de fermeture
- 🚫 Projet critique en cours
- 🚫 Formation obligatoire prévue

### Gestion des conflits

En cas de conflit :
1. **Identifiez le problème** (affiché automatiquement)
2. **Proposez des alternatives** :
   - Dates différentes
   - Durée réduite
   - Congé partiel
3. **Communiquez avec l'employé**
4. **Documentez la décision**

### Calendrier d'équipe

Le calendrier vous permet de :
- **Visualiser les absences** de l'équipe
- **Identifier les conflits** potentiels
- **Planifier les remplacements**
- **Exporter le planning**

## Gestion des anomalies

### Types d'anomalies

L'système détecte automatiquement :
- 🕐 **Retards** : Arrivée après l'heure prévue
- 🏃 **Départs anticipés** : Sortie avant l'heure
- ⏰ **Heures supplémentaires** : Dépassement du temps de travail
- 📍 **Géolocalisation** : Pointage hors zone
- ❌ **Pointages manqués** : Oubli de pointer
- 🔄 **Pointages multiples** : Plusieurs pointages suspects

### Traitement des anomalies

1. **Accédez à l'onglet "Anomalies"**
2. **Triez par priorité** ou date
3. **Cliquez sur une anomalie** pour voir les détails
4. **Choisissez une action** :
   - Valider (anomalie justifiée)
   - Corriger (modifier les données)
   - Signaler (escalader vers RH)
   - Ignorer (anomalie non significative)
5. **Ajoutez un commentaire** explicatif

### Seuils d'alerte

Configurez les seuils pour votre équipe :
- **Retard** : 15 minutes par défaut
- **Départ anticipé** : 15 minutes par défaut
- **Heures supplémentaires** : 30 minutes par défaut
- **Géolocalisation** : 100 mètres par défaut

### Notifications d'anomalies

Recevez des alertes pour :
- **Anomalies critiques** : Immédiatement
- **Anomalies récurrentes** : Résumé quotidien
- **Tendances** : Rapport hebdomadaire
- **Seuils dépassés** : Alerte temps réel

## Rapports et analyses

### Types de rapports

**Rapports de présence** :
- Présence quotidienne/hebdomadaire/mensuelle
- Heures travaillées par employé
- Taux de présence de l'équipe
- Évolution des tendances

**Rapports de congés** :
- Soldes de congés par employé
- Congés pris par période
- Taux d'utilisation des congés
- Prévisions de congés

**Rapports d'anomalies** :
- Retards et absences
- Heures supplémentaires
- Corrections effectuées
- Tendances comportementales

### Génération de rapports

1. **Accédez à "Rapports"**
2. **Sélectionnez le type** de rapport
3. **Configurez les paramètres** :
   - Période
   - Employés concernés
   - Niveau de détail
   - Format de sortie
4. **Générez le rapport**
5. **Téléchargez ou partagez**

### Formats disponibles

- **PDF** : Présentation professionnelle
- **Excel** : Analyse de données
- **CSV** : Import dans d'autres outils
- **Email** : Envoi automatique

### Analyses avancées

**Tableaux de bord analytiques** :
- 📊 Graphiques de tendances
- 📈 Indicateurs de performance
- 🎯 Objectifs vs réalisé
- 🔍 Analyses comparatives

**Métriques clés** :
- Taux de présence moyen
- Temps de travail effectif
- Ponctualité de l'équipe
- Utilisation des congés
- Productivité horaire

## Gestion des plannings

### Création de plannings

1. **Accédez à "Plannings"**
2. **Sélectionnez la période**
3. **Choisissez les employés**
4. **Définissez les horaires** :
   - Heures de début/fin
   - Pauses
   - Jours de travail
5. **Sauvegardez le planning**

### Modèles de planning

Créez des modèles réutilisables :
- **Planning standard** : 35h/semaine
- **Planning réduit** : Temps partiel
- **Planning flexible** : Horaires variables
- **Planning saisonnier** : Adaptations temporaires

### Gestion des exceptions

Pour les cas particuliers :
- **Horaires spéciaux** : Événements, formations
- **Remplacements** : Absences prévues
- **Heures supplémentaires** : Surcharge temporaire
- **Télétravail** : Jours à domicile

### Publication des plannings

- **Notification automatique** aux employés
- **Délai de préavis** configurable
- **Demandes de modification** par les employés
- **Validation des changements**

## Administration

### Paramètres d'équipe

Configurez les règles pour votre équipe :

**Horaires de travail** :
- Heures standard par jour
- Jours de travail dans la semaine
- Pauses obligatoires
- Flexibilité horaire

**Géolocalisation** :
- Zones de travail autorisées
- Précision requise
- Exceptions géographiques
- Télétravail autorisé

**Notifications** :
- Rappels de pointage
- Alertes d'anomalies
- Rapports automatiques
- Escalades vers RH

### Gestion des droits

Définissez les permissions :
- **Consultation** : Voir les données
- **Modification** : Corriger les pointages
- **Validation** : Approuver les congés
- **Administration** : Modifier les paramètres

### Intégrations

Connectez avec d'autres systèmes :
- **SIRH** : Synchronisation des données
- **Paie** : Export des heures
- **Planning** : Import des horaires
- **Messagerie** : Notifications email

## Bonnes pratiques

### Communication avec l'équipe

**Transparence** :
- Expliquez les règles de présence
- Communiquez les changements
- Partagez les objectifs d'équipe
- Donnez du feedback régulier

**Équité** :
- Appliquez les règles uniformément
- Traitez les demandes rapidement
- Documentez vos décisions
- Restez objectif dans l'évaluation

### Gestion des congés

**Planification** :
- Anticipez les périodes de forte demande
- Encouragez l'étalement des congés
- Maintenez un niveau de service
- Préparez les remplacements

**Validation** :
- Respectez les délais de réponse
- Justifiez les refus
- Proposez des alternatives
- Suivez les soldes de congés

### Traitement des anomalies

**Réactivité** :
- Traitez rapidement les anomalies
- Contactez l'employé si nécessaire
- Documentez les corrections
- Identifiez les récidives

**Bienveillance** :
- Écoutez les explications
- Considérez le contexte
- Accompagnez les employés
- Prévenez plutôt que sanctionner

### Analyse des données

**Régularité** :
- Consultez les rapports hebdomadaires
- Identifiez les tendances
- Anticipez les problèmes
- Ajustez les paramètres

**Action** :
- Transformez les insights en actions
- Partagez les bonnes pratiques
- Corrigez les dysfonctionnements
- Célébrez les améliorations

## Support

### Ressources manager

**Formation** :
- 📚 Guide d'utilisation avancé
- 🎥 Webinaires mensuels
- 👥 Communauté de managers
- 📞 Support dédié

**Outils** :
- 📊 Templates de rapports
- 📋 Checklist de validation
- 📝 Modèles de communication
- 🔧 Scripts d'automatisation

### Escalade vers RH

Contactez les RH pour :
- **Problèmes disciplinaires** récurrents
- **Conflits** non résolus
- **Modifications** de contrat
- **Questions légales** sur les congés

### Support technique manager

**Contact prioritaire** :
- 📧 Email : manager-support@votre-entreprise.com
- 📞 Téléphone : 01 23 45 67 88
- 💬 Chat : Canal dédié managers
- 🕒 Horaires : 24h/7j pour les urgences

### Formation continue

**Sessions disponibles** :
- Gestion d'équipe à distance
- Analyse des données RH
- Communication managériale
- Outils de productivité

---

*Guide Manager - Version 1.0 - Janvier 2024*