# Composants Dashboard

Ce dossier contient les composants spécifiques au dashboard principal de l'application.

## Composants

### PersonalTasksEmailWidget ⭐ (Recommandé)

Widget moderne qui affiche les tâches personnelles dans un format type "email" avec toutes les informations détaillées.

**Fonctionnalités :**
- **Format email** : Affichage structuré avec référence, titre, description
- **Informations complètes** : Réf tâche, description, réf événement, dates de création et limite
- **Navigation intelligente** : Clic sur tâche → détail résolution, clic sur événement → page événement
- **Données temps réel** : Récupération des vrais noms d'événements via API
- **Gestion d'erreurs** : Message d'erreur clair si API indisponible
- **Indicateurs visuels** : Priorité, statut, retards, progression
- **Responsive** : Grille adaptative avec toutes les informations

**Props :**
- `className?: string` - Classes CSS additionnelles



### PersonalTasksStats

Composant de statistiques qui affiche le nombre de tâches actives de l'utilisateur.

**Fonctionnalités :**
- Compte des tâches actives (en attente + en cours)
- Indication des tâches en retard
- Intégration dans la grille de métriques du dashboard

**Props :**
- `className?: string` - Classes CSS additionnelles

## Utilisation

```tsx
import { PersonalTasksEmailWidget, PersonalTasksStats } from '@/components/dashboard'

// Dans le dashboard (version recommandée)
<PersonalTasksStats />
<PersonalTasksEmailWidget />
```

## Fonctionnalités du format "Email"

Le `PersonalTasksEmailWidget` affiche pour chaque tâche :

- **Réf tâche** : `#ABC123` (6 derniers caractères de l'ID)
- **Titre** : Nom de la tâche en gras
- **Description** : Texte complet avec ellipsis si trop long
- **Réf événement** : Nom de l'événement (cliquable)
- **Date mise en place** : Date de création formatée
- **Date limite** : Échéance avec indication de retard
- **Progression** : Barre de progression si disponible
- **Badges** : Statut et priorité colorés

## Dépendances

- `@/hooks/useResolutions` - Hook pour récupérer les tâches
- `@/hooks/useEvent` - Hook pour récupérer les informations d'événements
- `@/types/resolution.types` - Types et utilitaires pour les résolutions
- `@/services/eventsService` - Service pour récupérer les événements
- `@/components/ui/*` - Composants UI de base

## Navigation

Les composants incluent des liens vers :
- `/app/my-tasks` - Page complète des tâches personnelles
- `/app/events/[id]/resolutions?resolution=[id]` - Détail d'une résolution spécifique
- `/app/events/[id]` - Page de l'événement associé

## Gestion d'erreurs

- **API indisponible** : Message d'erreur clair avec instructions
- **Événements non trouvés** : Fallback vers nom générique avec ID
- **Erreurs réseau** : Gestion gracieuse avec retry automatique
- **Pas de données** : État vide informatif