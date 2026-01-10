# Intégration des Feuilles de Temps

## Vue d'ensemble

L'intégration complète du système de feuilles de temps (timesheet) a été ajoutée à l'application, permettant aux utilisateurs de :

- Suivre leurs heures de travail
- Gérer des projets et codes d'activité
- Créer des sessions de travail depuis les tâches accomplies
- Administrer les paramètres des feuilles de temps

## 🎯 Fonctionnalités implémentées

### 1. **Dashboard - Widget Feuilles de temps**
- **Localisation** : Dashboard principal
- **Fonctionnalités** :
  - Statistiques rapides (heures totales, taux facturable)
  - Aperçu des 3 dernières feuilles de temps
  - Navigation vers la vue complète
  - Création rapide de feuilles de temps

### 2. **Gestion des Feuilles de temps** (`/app/timesheets`)
- **Page principale** : Liste des feuilles de temps personnelles
- **Fonctionnalités** :
  - Filtrage par statut
  - Recherche par période
  - Statistiques globales
  - Actions : créer, modifier, soumettre, approuver

### 3. **Ajout de Sessions de Travail** (`/app/timesheets/add-session`)
- **Intégration avec les tâches** : Bouton "+" sur chaque tâche du dashboard
- **Fonctionnalités** :
  - Création automatique de feuilles de temps si nécessaire
  - Calcul automatique de durée (heures début/fin)
  - Association avec projets et codes d'activité
  - Liaison avec les tâches accomplies

### 4. **Administration** (`/app/admin/timesheet-settings`)
- **Gestion des projets** :
  - Création/modification de projets
  - Configuration des taux horaires
  - Paramètres d'approbation
- **Gestion des codes d'activité** :
  - Création/modification d'activités
  - Catégorisation
  - Taux spécifiques

## 📁 Structure des fichiers

### Types
```
frontend-v2/src/types/timesheet.types.ts
- Définitions TypeScript complètes
- Enums pour statuts et priorités
- Utilitaires de formatage
```

### Services
```
frontend-v2/src/services/timesheetService.ts
- API client pour toutes les opérations timesheet
- Gestion d'erreurs gracieuse
- Support des sessions depuis tâches
```

### Hooks
```
frontend-v2/src/hooks/useTimesheets.ts
- useTimesheets() - Gestion des feuilles de temps
- useMyTimesheets() - Feuilles de temps personnelles
- useTimeEntries() - Entrées de temps
- useProjects() - Projets
- useActivityCodes() - Codes d'activité
- useTimesheetStats() - Statistiques
```

### Composants Dashboard
```
frontend-v2/src/components/dashboard/TimesheetStatsWidget.tsx
- Widget pour le dashboard principal
- Statistiques et aperçu rapide
```

### Pages
```
frontend-v2/src/pages/app/timesheets/
├── index.tsx              # Liste des feuilles de temps
└── add-session.tsx        # Ajout de session de travail

frontend-v2/src/pages/app/admin/
└── timesheet-settings.tsx # Administration
```

## 🔗 Intégration avec les Tâches

### Workflow utilisateur
1. **Depuis le Dashboard** : L'utilisateur voit ses tâches personnelles
2. **Bouton "+"** : Clic sur le bouton "+" d'une tâche
3. **Formulaire de session** : Remplissage des détails (durée, projet, etc.)
4. **Création automatique** : 
   - Création d'une feuille de temps si nécessaire
   - Ajout de l'entrée de temps
   - Liaison avec la tâche originale

### API Backend requise
```typescript
// Endpoint pour créer une session depuis une tâche
POST /time-entries/from-task
{
  resolutionId: string,
  date: string,
  duration: number, // en minutes
  description?: string,
  projectId?: string,
  activityCodeId?: string
}
```

## 🎨 Interface utilisateur

### Dashboard
- **Widget intégré** dans la grille 4 colonnes
- **Statistiques visuelles** : heures totales, taux facturable
- **Navigation fluide** vers les pages détaillées

### Tâches personnelles
- **Bouton "+" ajouté** à chaque tâche
- **Navigation directe** vers le formulaire de session
- **Pré-remplissage** avec les informations de la tâche

### Administration
- **Interface complète** pour projets et activités
- **Formulaires intuitifs** avec validation
- **Gestion des paramètres** avancés

## 🔧 Configuration Backend

### Routes requises
```
/timesheets                    # CRUD feuilles de temps
/timesheets/my-timesheets      # Feuilles personnelles
/timesheets/:id/entries        # Entrées de temps
/projects                      # Gestion projets
/activity-codes               # Codes d'activité
/time-entries/from-task       # Sessions depuis tâches
```

### Modèles de données
- **Timesheet** : Feuilles de temps avec périodes
- **TimeEntry** : Entrées individuelles
- **Project** : Projets avec paramètres
- **ActivityCode** : Codes d'activité hiérarchiques

## 🚀 Démarrage

### 1. Backend
```bash
cd backend/functions
npm run dev
```

### 2. Frontend
Le frontend est déjà configuré et s'adapte automatiquement :
- **API disponible** : Utilise les vraies données
- **API indisponible** : Affichage d'erreurs gracieuses

### 3. Navigation
- **Dashboard** → Widget feuilles de temps
- **Tâches** → Bouton "+" → Formulaire session
- **Admin** → Paramètres feuilles de temps

## 📊 Fonctionnalités avancées

### Calculs automatiques
- **Durée** : Calcul automatique depuis heures début/fin
- **Totaux** : Agrégation des heures par feuille de temps
- **Taux facturable** : Pourcentage d'heures facturables

### Gestion des périodes
- **Création automatique** : Feuilles de temps hebdomadaires
- **Détection intelligente** : Association automatique par date
- **Validation** : Vérification des chevauchements

### Workflow d'approbation
- **Statuts** : Brouillon → Soumise → Approuvée/Rejetée
- **Permissions** : Contrôle d'accès par rôle
- **Historique** : Suivi des modifications

## 🎯 Prochaines étapes

1. **Tests** : Validation avec le backend démarré
2. **Personnalisation** : Adaptation aux besoins spécifiques
3. **Rapports** : Ajout de fonctionnalités de reporting
4. **Mobile** : Optimisation pour appareils mobiles

L'intégration est complète et prête à être utilisée dès que le backend est démarré !