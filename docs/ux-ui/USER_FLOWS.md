# 🔄 AttendanceX - User Flows & Parcours Utilisateur

**Document pour Designers UX/UI**  
**Version :** 1.0  
**Date :** Janvier 2025

---

## 📋 Table des Matières

1. [Flows Critiques à Créer](#flows-critiques-à-créer)
2. [Flows Existants à Améliorer](#flows-existants-à-améliorer)
3. [Diagrammes de Navigation](#diagrammes-de-navigation)

---

## 🚨 Flows Critiques à Créer

### Flow 1: Achat de Billets (Nouveau)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLOW ACHAT BILLETS                            │
└─────────────────────────────────────────────────────────────────┘

[Découverte Événement]
        │
        ├─→ Via Marketplace (recherche/navigation)
        ├─→ Via Lien Direct (partage)
        └─→ Via Email Marketing
        │
        ↓
[Page Détail Événement]
   • Informations complètes
   • Types de billets disponibles
   • Avis participants
        │
        ↓
[Sélection Billets]
   • Choix type(s) de billet
   • Quantité par type
   • Application code promo
   • Résumé panier (sidebar)
        │
        ├─→ [Panier Vide] → Retour sélection
        └─→ [Panier Rempli]
        │
        ↓
[Informations Acheteur]
   • Nom, prénom, email, téléphone
   • Informations participants (si multiple)
   • Questions personnalisées
   • Acceptation CGV
        │
        ├─→ [Validation Échouée] → Correction erreurs
        └─→ [Validation OK]
        │
        ↓
[Paiement]
   • Stripe Elements (carte)
   • Apple Pay / Google Pay
   • Récapitulatif final
        │
        ├─→ [Paiement Échoué] → Retry / Autre méthode
        └─→ [Paiement Réussi]
        │
        ↓
[Confirmation]
   • Animation succès
   • Numéro commande
   • Email confirmation envoyé
   • Téléchargement billets (PDF)
   • QR codes affichés
   • Ajout calendrier
        │
        ↓
[Email Confirmation]
   • Récapitulatif commande
   • Billets PDF attachés
   • Lien ajout calendrier
   • Instructions accès événement

┌─────────────────────────────────────────────────────────────────┐
│ POINTS DE FRICTION À ÉVITER                                     │
├─────────────────────────────────────────────────────────────────┤
│ ❌ Trop d'étapes (max 4)                                        │
│ ❌ Formulaires trop longs                                       │
│ ❌ Pas de sauvegarde panier                                     │
│ ❌ Pas de guest checkout                                        │
│ ❌ Processus paiement complexe                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ OPTIMISATIONS UX                                                │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Barre de progression visible                                 │
│ ✅ Sauvegarde automatique                                       │
│ ✅ Validation en temps réel                                     │
│ ✅ Récapitulatif toujours visible                               │
│ ✅ Retour en arrière possible                                   │
│ ✅ Guest checkout (pas de compte obligatoire)                   │
│ ✅ Paiement en 1 clic (Apple/Google Pay)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flow 2: Découverte Événement (Marketplace)

```
┌─────────────────────────────────────────────────────────────────┐
│                 FLOW DÉCOUVERTE MARKETPLACE                      │
└─────────────────────────────────────────────────────────────────┘

[Landing Marketplace]
   • Hero avec recherche
   • Catégories populaires
   • Événements à la une
        │
        ├─→ [Recherche Directe]
        │      │
        │      ↓
        │   [Résultats Recherche]
        │      • Filtres appliqués
        │      • Tri pertinence
        │
        ├─→ [Navigation Catégorie]
        │      │
        │      ↓
        │   [Événements par Catégorie]
        │      • Filtres spécifiques
        │      • Sous-catégories
        │
        └─→ [Événements Recommandés]
               │
               ↓
            [Pour Vous]
               • Basé sur historique
               • Basé sur localisation
        │
        ↓
[Grille Événements]
   • Cartes événements
   • Filtres sidebar
   • Tri dropdown
   • Pagination infinie
        │
        ├─→ [Hover Carte] → Aperçu rapide
        └─→ [Click Carte]
        │
        ↓
[Page Détail Événement]
   • Toutes informations
   • CTA "Acheter billets"
   • Événements similaires
        │
        ├─→ [Sauvegarder] → Ajout favoris
        ├─→ [Partager] → Réseaux sociaux
        └─→ [Acheter] → Flow achat billets

┌─────────────────────────────────────────────────────────────────┐
│ MÉTRIQUES SUCCÈS                                                │
├─────────────────────────────────────────────────────────────────┤
│ • Temps moyen découverte: < 2 minutes                           │
│ • Taux de clic: > 10%                                           │
│ • Taux de conversion: > 5%                                      │
│ • Taux de rebond: < 40%                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flow 3: Création Événement avec IA

```
┌─────────────────────────────────────────────────────────────────┐
│              FLOW CRÉATION ÉVÉNEMENT IA                          │
└─────────────────────────────────────────────────────────────────┘

[Dashboard]
        │
        ↓
[Choix Méthode Création]
   • Création manuelle
   • Création avec IA ⭐
        │
        ↓
[Générateur IA]
   • Textarea description naturelle
   • Exemples suggestions
   • Bouton "Générer"
        │
        ↓
[Génération en cours]
   • Loader animé (30s)
   • Messages progression
   • Annulation possible
        │
        ├─→ [Erreur] → Retry / Support
        └─→ [Succès]
        │
        ↓
[Aperçu Événement Généré]
   • Carte événement structuré
   • Tâches suggérées (liste)
   • Budget estimé
   • Score confiance
   • Suggestions améliorations
        │
        ├─→ [Régénérer] → Nouvelles suggestions
        ├─→ [Affiner] → Prompt raffinement
        └─→ [Créer]
        │
        ↓
[Validation Finale]
   • Formulaire pré-rempli
   • Ajustements possibles
   • Validation champs
        │
        ↓
[Création Événement]
   • Sauvegarde en base
   • Génération QR code
   • Configuration initiale
        │
        ↓
[Confirmation Succès]
   • Animation succès
   • Notification verte
   • Lien "Voir tous les événements"
        │
        ↓
[Page Détail Événement]
   • Événement créé visible
   • Badge "Généré par IA"
   • Actions disponibles

┌─────────────────────────────────────────────────────────────────┐
│ MOMENTS MAGIQUES                                                │
├─────────────────────────────────────────────────────────────────┤
│ ✨ Description naturelle → Événement structuré (30s)            │
│ ✨ Tâches automatiquement générées et priorisées               │
│ ✨ Budget estimé intelligent                                    │
│ ✨ Suggestions d'amélioration contextuelles                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Flows Existants à Améliorer

### Flow 4: Onboarding Amélioré

```
┌─────────────────────────────────────────────────────────────────┐
│                  FLOW ONBOARDING AMÉLIORÉ                        │
└─────────────────────────────────────────────────────────────────┘

[Inscription]
   • Email + Password
   • Ou OAuth (Google, Microsoft)
        │
        ↓
[Vérification Email]
   • Email envoyé
   • Click lien confirmation
        │
        ↓
[Bienvenue Personnalisée]
   • Animation accueil
   • Question: "Quel est votre rôle ?"
     - Organisateur événements
     - Agence événementielle
     - Entreprise
     - Éducation
     - Autre
   • Barre progression (1/5)
        │
        ↓
[Configuration Organisation]
   • Nom organisation
   • Upload logo (drag & drop)
   • Fuseau horaire
   • Barre progression (2/5)
        │
        ↓
[Import Contacts]
   • Google Contacts (OAuth)
   • CSV/Excel upload
   • Saisie manuelle
   • Ou "Passer cette étape"
   • Barre progression (3/5)
        │
        ↓
[Premier Événement]
   • Formulaire simplifié:
     - Titre
     - Date
     - Lieu
     - Participants estimés
   • Ou "Créer avec IA"
   • Barre progression (4/5)
        │
        ↓
[Configuration Paiements]
   • Connexion Stripe (OAuth)
   • Ou "Configurer plus tard"
   • Barre progression (5/5)
        │
        ↓
[Félicitations]
   • Animation confettis
   • Résumé configuration
   • Prochaines étapes:
     - Inviter équipe
     - Personnaliser branding
     - Explorer fonctionnalités
   • Bouton "Aller au dashboard"
        │
        ↓
[Dashboard]
   • Tour guidé interactif
   • Tooltips contextuels
   • Checklist progression

┌─────────────────────────────────────────────────────────────────┐
│ AMÉLIORATIONS vs. VERSION ACTUELLE                              │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Wizard guidé (vs. formulaire unique)                         │
│ ✅ Personnalisation selon rôle                                  │
│ ✅ Import contacts facilité                                     │
│ ✅ Création premier événement intégrée                          │
│ ✅ Barre de progression visible                                 │
│ ✅ Possibilité de passer étapes                                 │
│ ✅ Temps estimé: 5 min (vs. 15 min)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flow 5: Check-in Événement (Mobile)

```
┌─────────────────────────────────────────────────────────────────┐
│                   FLOW CHECK-IN MOBILE                           │
└─────────────────────────────────────────────────────────────────┘

[App Mobile]
        │
        ↓
[Événements à Venir]
   • Liste événements du jour
   • Carte événement actif
        │
        ↓
[Sélection Événement]
   • Tap sur événement
        │
        ↓
[Détail Événement]
   • Informations complètes
   • Bouton "Check-in" (CTA)
   • Participants présents (live)
        │
        ↓
[Choix Méthode Check-in]
   • Scanner QR code
   • GPS (si activé)
   • Manuel (si autorisé)
        │
        ├─→ [QR Code]
        │      │
        │      ↓
        │   [Scanner]
        │      • Caméra plein écran
        │      • Cadre de scan
        │      • Instructions
        │      │
        │      ├─→ [QR Invalide] → Message erreur
        │      └─→ [QR Valide]
        │
        ├─→ [GPS]
        │      │
        │      ↓
        │   [Vérification Position]
        │      • Carte avec rayon
        │      • Distance du lieu
        │      │
        │      ├─→ [Hors Rayon] → Message erreur
        │      └─→ [Dans Rayon]
        │
        └─→ [Manuel]
               │
               ↓
            [Recherche Participant]
               • Barre de recherche
               • Liste participants
               • Sélection
        │
        ↓
[Confirmation Check-in]
   • Animation checkmark
   • Nom participant
   • Heure check-in
   • Vibration + son
        │
        ↓
[Retour Liste]
   • Participant marqué présent
   • Mise à jour compteurs
   • Notification organisateur

┌─────────────────────────────────────────────────────────────────┐
│ FONCTIONNALITÉS SPÉCIFIQUES MOBILE                              │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Mode hors-ligne (sync ultérieure)                            │
│ ✅ Scan continu (pas de bouton)                                 │
│ ✅ Feedback haptique (vibration)                                │
│ ✅ Historique scans (swipe up)                                  │
│ ✅ Switch caméra (avant/arrière)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Diagrammes de Navigation

### Architecture Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE NAVIGATION                       │
└─────────────────────────────────────────────────────────────────┘

[Landing Public]
        │
        ├─→ [Marketplace] (nouveau)
        │      ├─→ Découverte événements
        │      ├─→ Recherche
        │      └─→ Détail événement → Achat billets
        │
        ├─→ [Connexion/Inscription]
        │      └─→ Onboarding
        │
        └─→ [Documentation]
               └─→ Guides, API docs

[App Authentifiée]
        │
        ├─→ [Dashboard]
        │      ├─→ Métriques
        │      ├─→ Événements à venir
        │      └─→ Actions rapides
        │
        ├─→ [Événements]
        │      ├─→ Liste/Calendrier
        │      ├─→ Créer (manuel/IA)
        │      ├─→ Détail
        │      └─→ Gestion participants
        │
        ├─→ [Participants]
        │      ├─→ Liste
        │      ├─→ Import/Export
        │      └─→ Profils
        │
        ├─→ [Présences]
        │      ├─→ Dashboard temps réel
        │      ├─→ Check-in (QR/GPS)
        │      └─→ Historique
        │
        ├─→ [Rapports]
        │      ├─→ Prédéfinis
        │      ├─→ Constructeur
        │      └─→ Programmés
        │
        ├─→ [Marketing] (nouveau)
        │      ├─→ Landing pages
        │      ├─→ Email campaigns
        │      ├─→ Social media
        │      └─→ Widgets
        │
        ├─→ [Facturation]
        │      ├─→ Abonnement
        │      ├─→ Factures
        │      └─→ Paiements
        │
        └─→ [Paramètres]
               ├─→ Organisation
               ├─→ Équipe
               ├─→ Intégrations
               └─→ Sécurité
```

---

## 📱 Navigation Mobile

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOTTOM TAB BAR (Mobile)                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  Home   │ Events  │  Scan   │  Notif  │ Profile │
│   🏠    │   📅    │   📷    │   🔔    │   👤    │
└─────────┴─────────┴─────────┴─────────┴─────────┘
     │         │         │         │         │
     │         │         │         │         └─→ Profil
     │         │         │         │             Paramètres
     │         │         │         │             Déconnexion
     │         │         │         │
     │         │         │         └─→ Notifications
     │         │         │             Centre notifications
     │         │         │             Préférences
     │         │         │
     │         │         └─→ Scanner QR
     │         │             Check-in rapide
     │         │             Historique scans
     │         │
     │         └─→ Événements
     │             Liste
     │             Calendrier
     │             Créer
     │
     └─→ Dashboard
         Métriques
         Actions rapides
         Événements à venir
```

---

## 🎯 Points de Décision Utilisateur

### Matrice de Décision: Création Événement

```
┌─────────────────────────────────────────────────────────────────┐
│         QUAND UTILISER CRÉATION MANUELLE vs. IA ?               │
└─────────────────────────────────────────────────────────────────┘

Création MANUELLE si:
✅ Événement simple et rapide
✅ Informations précises déjà connues
✅ Événement récurrent (template existant)
✅ Contrôle total souhaité

Création IA si:
✅ Événement complexe (multi-jours, multi-sessions)
✅ Besoin d'inspiration/suggestions
✅ Première fois (guidance nécessaire)
✅ Gain de temps prioritaire
✅ Génération automatique de tâches souhaitée

┌─────────────────────────────────────────────────────────────────┐
│ RECOMMANDATION UX                                               │
├─────────────────────────────────────────────────────────────────┤
│ Proposer les DEUX options avec guidance contextuelle:           │
│ "Créez rapidement" → Manuel                                     │
│ "Laissez l'IA vous guider" → IA                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Métriques par Flow

### Objectifs de Performance

| Flow | Temps Moyen | Taux Completion | Taux Abandon |
|------|-------------|-----------------|--------------|
| Onboarding | < 5 min | > 80% | < 20% |
| Achat billets | < 3 min | > 15% | < 30% |
| Création événement (manuel) | < 5 min | > 90% | < 10% |
| Création événement (IA) | < 2 min | > 85% | < 15% |
| Check-in QR | < 10 sec | > 95% | < 5% |
| Découverte marketplace | < 2 min | > 10% clic | < 40% rebond |

---

**Document maintenu par:** Product & Design Team  
**Dernière mise à jour:** Janvier 2025  
**Version:** 1.0