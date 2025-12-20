# Configuration Backend pour les Tâches Personnelles

## Problème actuel

L'erreur 404 sur `/resolutions/my-tasks` indique que le backend n'est pas démarré ou que l'endpoint n'est pas accessible.

## Solution : Démarrer le Backend

### 1. Démarrer les émulateurs Firebase

```bash
cd backend/functions
npm run dev
```

Cette commande démarre :
- Firebase Functions (API)
- Firestore (base de données)
- Storage (stockage de fichiers)

### 2. Vérifier que le backend fonctionne

Une fois démarré, vous devriez voir :
```
✔  functions: Emulator started at http://127.0.0.1:5001
✔  firestore: Emulator started at http://127.0.0.1:8080
✔  storage: Emulator started at http://127.0.0.1:9199
```

### 3. Tester l'endpoint

L'endpoint des tâches personnelles sera disponible à :
```
http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1/resolutions/my-tasks
```

## Configuration Frontend

Le frontend est déjà configuré pour :
- ✅ Gérer les erreurs API gracieusement
- ✅ Afficher des données de démonstration si l'API n'est pas disponible
- ✅ Utiliser les vraies données dès que l'API est accessible

## Fonctionnalités implémentées

### Widget des Tâches (Format Email)

Le nouveau widget affiche uniquement les vraies données de l'API :
- **Réf tâche** : #ABC123
- **Titre et description** : Informations complètes
- **Réf événement** : Nom cliquable vers l'événement
- **Date mise en place** : Date de création
- **Date limite** : Échéance avec indication de retard
- **Progression** : Barre visuelle si disponible

### Navigation

- Clic sur tâche → `/app/events/[eventId]/resolutions?resolution=[resolutionId]`
- Clic sur événement → `/app/events/[eventId]`
- Bouton "Voir tout" → `/app/my-tasks`

### Statistiques

- Compteur de tâches actives dans les métriques du dashboard
- Indication des tâches en retard

## Prochaines étapes

1. **Démarrer le backend** avec `npm run dev`
2. **Rafraîchir le frontend** - les tâches apparaîtront automatiquement
3. **Tester la navigation** entre les différentes pages

## Comportement sans backend

Si le backend n'est pas démarré :
- Le widget affiche un message d'erreur clair
- Les statistiques montrent "—"
- Aucune donnée fictive n'est affichée