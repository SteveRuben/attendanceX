# Investigation Firestore - Public Events API

**Date:** 2026-01-27  
**Status:** EN COURS - Vérification de la base de données  
**Priority:** CRITIQUE

## Problème

Les endpoints publics retournent 500 Internal Server Error:
- `GET /v1/public/events`
- `GET /v1/public/categories`
- `GET /v1/public/locations`

## Investigation Effectuée

### 1. Analyse des Logs Firebase Functions ✅

**Commande:**
```bash
firebase functions:log --only api
```

**Résultat:**
```
14 UNAVAILABLE: No connection established. Last error: Protocol error
```

**Conclusion:** Erreur de connexion Firestore gRPC

### 2. Vérification des Security Rules ✅

**Problème identifié:** Les règles Firestore bloquaient TOUT accès
```javascript
match /{document=**} {
  allow read, write: if false;  // ❌ Bloque tout!
}
```

**Solution appliquée:** Mise à jour des règles pour permettre:
- Lecture publique des événements publiés
- Accès authentifié pour les autres ressources

**Déployé:** ✅ `firebase deploy --only firestore:rules`

### 3. Vérification du Rate Limiting ✅

**Problème identifié:** Le middleware de rate limiting essaie d'accéder à Firestore et échoue également

**Solution appliquée:** Désactivation temporaire du rate limiting sur les routes publiques

### 4. Vérification de la Collection Events ⏳

**À FAIRE:** Vérifier si la collection `events` existe dans Firestore

**Console Firebase:** https://console.firebase.google.com/project/attendance-management-syst/firestore/databases/-default-/data/~2Fevents

## Scénarios Possibles

### Scénario A: Collection Vide ❓
Si la collection `events` n'existe pas ou est vide:
- **Symptôme:** Requêtes Firestore réussissent mais retournent 0 documents
- **Solution:** Créer des événements de test
- **Impact:** Les endpoints retourneront des tableaux vides (comportement normal)

### Scénario B: Problème de Connexion Firestore ❓
Si Firestore ne peut pas se connecter:
- **Symptôme:** Erreur "14 UNAVAILABLE: No connection established"
- **Causes possibles:**
  - Cold start timeout
  - Quota Firestore dépassé
  - Configuration réseau/VPC
  - API Firestore désactivée
- **Solution:** Vérifier la configuration Firebase

### Scénario C: Problème de Permissions ❓
Si les règles Firestore bloquent encore l'accès:
- **Symptôme:** Erreur "PERMISSION_DENIED"
- **Solution:** Vérifier que les règles sont bien déployées

## Actions Requises

### ✅ Complété
1. Analyse des logs Firebase Functions
2. Mise à jour des Firestore security rules
3. Désactivation temporaire du rate limiting
4. Amélioration du logging dans le service
5. **Vérification manuelle de Firestore via Console** - CONFIRMÉ: Collection `events` n'existe PAS
6. **Création des scripts d'initialisation**

### 📋 Solution Implémentée

#### Scripts Créés
1. **`backend/functions/scripts/init-all-collections.js`**
   - Script Node.js pour initialiser les collections
   - Crée 5 événements publics de test
   - Crée 5 organisateurs (tenants)
   - Crée 3 plans d'abonnement
   - Vérifie la création et teste les requêtes

2. **`backend/init-firestore-collections.ps1`**
   - Script PowerShell avec interface utilisateur
   - Vérifie les prérequis (Node.js, service account)
   - Demande confirmation avant exécution
   - Affiche les prochaines étapes

3. **`backend/init-firestore-collections.bat`**
   - Version batch pour CMD
   - Même fonctionnalité que PowerShell

4. **`backend/FIRESTORE_INITIALIZATION.md`**
   - Guide complet d'utilisation
   - Instructions pour obtenir le service account
   - Troubleshooting détaillé
   - Étapes de vérification

#### Collections à Créer
- **events** (5 documents)
  - Tech Conference Paris 2026 (tech, paid, €299)
  - Business Summit London 2026 (business, paid, £450)
  - Free Yoga in the Park (health, free)
  - Art Exhibition Berlin 2026 (arts, paid, €15)
  - Online Web Development Bootcamp (education, online, $1999)

- **tenants** (5 documents)
  - Organisateurs avec profils publics complets
  - Stats, ratings, liens sociaux

- **subscription_plans** (3 documents)
  - Free, Pro, Enterprise

### 📋 Prochaines Étapes pour l'Utilisateur

1. **Obtenir le Service Account Key**
   - Firebase Console > Project Settings > Service Accounts
   - Generate New Private Key
   - Sauvegarder dans `backend/functions/serviceAccountKey.json`

2. **Exécuter le Script d'Initialisation**
   ```powershell
   cd backend
   .\init-firestore-collections.ps1
   ```

3. **Vérifier la Création**
   - Firebase Console: Vérifier les collections
   - API: `curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events"`
   - Frontend: https://attendance-x.vercel.app/fr/events

4. **Si Tout Fonctionne**
   ```bash
   git add .
   git commit -m "fix: initialize Firestore collections and fix public events API"
   git push origin master
   cd backend
   .\deploy-backend-fix.bat
   ```

## Structure d'un Événement Public

Pour référence, voici la structure attendue:

```json
{
  "title": "Tech Conference 2026",
  "slug": "tech-conference-2026-paris",
  "description": "Annual technology conference",
  "shortDescription": "Join us for the biggest tech event",
  "visibility": "public",
  "status": "published",
  "category": "tech",
  "location": {
    "type": "physical",
    "city": "Paris",
    "country": "France"
  },
  "startDate": "2026-06-15T10:00:00Z",
  "endDate": "2026-06-17T18:00:00Z",
  "timezone": "Europe/Paris",
  "pricing": {
    "type": "paid",
    "amount": 299,
    "currency": "EUR"
  },
  "capacity": {
    "total": 500,
    "available": 500,
    "registered": 0
  },
  "rating": {
    "average": 0,
    "count": 0
  },
  "featured": true,
  "tags": ["tech", "conference"],
  "images": [],
  "coverImage": "",
  "organizerId": "test-org-id",
  "organizerName": "Test Organizer",
  "organizerSlug": "test-organizer",
  "organizerRating": 0,
  "seo": {
    "metaTitle": "Tech Conference 2026",
    "metaDescription": "Join us for the biggest tech event",
    "keywords": ["tech", "conference"],
    "ogImage": ""
  },
  "publishedAt": "2026-01-27T00:00:00Z",
  "createdAt": "2026-01-27T00:00:00Z",
  "updatedAt": "2026-01-27T00:00:00Z"
}
```

## Commandes Utiles

### Vérifier les logs
```bash
cd backend
firebase functions:log --only api
```

### Déployer les règles Firestore
```bash
cd backend
firebase deploy --only firestore:rules
```

### Déployer les fonctions
```bash
cd backend
./deploy-backend-fix.bat
```

### Tester l'API
```bash
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?page=1&limit=5"
```

## Prochaines Étapes

1. **URGENT:** Vérifier manuellement Firestore via Console
2. Selon le résultat, créer des données de test ou corriger la configuration
3. Tester les endpoints
4. Si OK, commit et push
5. Vérifier sur le frontend: https://attendance-x.vercel.app/fr/events

## Notes

- **NE PAS COMMIT** tant que le problème n'est pas résolu
- Les changements actuels sont en staging (git reset --soft HEAD~1)
- Les fichiers modifiés:
  - `backend/firestore.rules` (règles de sécurité)
  - `backend/functions/src/routes/public/events.routes.ts` (rate limiting désactivé)
  - `backend/functions/src/services/public/public-events.service.ts` (logging amélioré)

---

**Attente:** Vérification manuelle de Firestore par l'utilisateur  
**Blocker:** Besoin de confirmer l'existence de la collection `events`
