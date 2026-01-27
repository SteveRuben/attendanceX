# Corrections Urgentes - 27 Janvier 2026

## 🚨 Problèmes Critiques Identifiés

### 1. API Publique Bloquée par Authentification ✅ CORRIGÉ
**Status:** ✅ **CORRIGÉ** (Commit: daed63f)

**Problème:**
- L'API publique `/v1/public/events` retourne une erreur 401 "Token d'authentification requis"
- Les événements ne se chargent pas sur https://attendance-x.vercel.app/fr/events
- Message d'erreur: "Aucun événement trouvé" avec chargement infini

**Cause:**
Le middleware `authenticate` dans `backend/functions/src/middleware/auth.ts` était appliqué sur **toutes** les routes, y compris les routes publiques.

**Solution Appliquée:**
Ajout d'une whitelist de routes publiques dans le middleware `authenticate` :
```typescript
// Skip authentication for public routes
const publicRoutes = ['/public/', '/health', '/status', '/api', '/docs', '/swagger'];
const isPublicRoute = publicRoutes.some(route => req.path.includes(route));

if (isPublicRoute) {
  return next(); // Bypass authentication
}
```

**Fichier Modifié:**
- `backend/functions/src/middleware/auth.ts`

**Déploiement Requis:**
```bash
cd backend
firebase deploy --only functions
```

---

### 2. Traductions Manquantes ⏳ À CORRIGER
**Status:** ⏳ **EN ATTENTE**

**Problème:**
Plusieurs sections de la page événements ne sont pas traduites en français :
- Textes hardcodés en anglais
- Clés de traduction manquantes
- Fallback vers l'anglais

**Sections Affectées:**
- Filtres (Category, Location, Price)
- Messages d'erreur
- Boutons d'action
- Descriptions

**Solution:**
1. Identifier toutes les chaînes hardcodées
2. Ajouter les clés de traduction dans `frontend-v2/public/locales/fr/common.json`
3. Remplacer les textes par `t('key')`

**Fichiers à Modifier:**
- `frontend-v2/src/pages/events/index.tsx`
- `frontend-v2/src/components/events/EventCard.tsx`
- `frontend-v2/public/locales/fr/common.json`

---

### 3. Design Non Conforme à Evelya.co ⏳ À CORRIGER
**Status:** ⏳ **EN ATTENTE**

**Problème:**
Le design actuel ne ressemble pas à https://evelya.co/ :
- Police différente (doit être Inter)
- Couleurs différentes (doit utiliser la palette Evelya)
- Icônes différentes (doit utiliser Lucide React comme Evelya)
- Pas de géolocalisation
- Layout différent

**Éléments à Harmoniser:**

#### A. Police et Typographie
**Actuel:** Mélange de polices  
**Requis:** Inter (comme Evelya)

**Solution:**
```typescript
// tailwind.config.ts
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
}
```

#### B. Palette de Couleurs
**Actuel:** Gradients vert/orange  
**Requis:** Palette Evelya (bleus/neutres)

**Couleurs Evelya:**
```css
--primary: #3b82f6 (blue-500)
--primary-dark: #2563eb (blue-600)
--neutral: #64748b (slate-500)
--background: #f8fafc (slate-50)
```

**Fichiers à Modifier:**
- `frontend-v2/tailwind.config.ts`
- `frontend-v2/src/pages/events/index.tsx`
- `frontend-v2/src/components/events/EventCard.tsx`

#### C. Icônes
**Actuel:** Lucide React (correct)  
**Requis:** Utiliser les mêmes icônes qu'Evelya

**Icônes Evelya:**
- MapPin (localisation)
- Calendar (date)
- Users (participants)
- Tag (catégorie)
- DollarSign (prix)

#### D. Géolocalisation
**Actuel:** Pas de géolocalisation  
**Requis:** Bouton "Près de moi" avec géolocalisation

**Solution:**
```typescript
const handleNearMe = async () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Filter events by proximity
        setFilters(prev => ({ ...prev, lat: latitude, lng: longitude }));
      },
      (error) => {
        toast.error('Impossible d\'accéder à votre position');
      }
    );
  }
};
```

#### E. Layout et Composants
**Actuel:** Layout custom  
**Requis:** Layout similaire à Evelya

**Éléments Evelya:**
- Hero section avec image de fond
- Barre de recherche proéminente
- Filtres en sidebar (desktop) ou drawer (mobile)
- Cards événements avec image, titre, date, lieu, prix
- Pagination en bas

---

## 📋 Plan d'Action

### Phase 1: Backend (URGENT - Aujourd'hui)
1. ✅ **Corriger l'authentification des routes publiques** - FAIT
2. ⏳ **Déployer le backend sur Firebase**
   ```bash
   cd backend
   firebase deploy --only functions
   ```
3. ⏳ **Vérifier que l'API fonctionne**
   ```bash
   curl https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?page=1&limit=5
   ```

### Phase 2: Traductions (URGENT - Aujourd'hui)
1. ⏳ **Identifier toutes les chaînes hardcodées**
2. ⏳ **Ajouter les traductions françaises**
3. ⏳ **Remplacer les textes par t('key')**
4. ⏳ **Tester en français et anglais**

### Phase 3: Design Evelya (Cette Semaine)
1. ⏳ **Harmoniser la palette de couleurs**
2. ⏳ **Changer la police pour Inter**
3. ⏳ **Ajuster les icônes**
4. ⏳ **Implémenter la géolocalisation**
5. ⏳ **Refaire le layout pour ressembler à Evelya**

---

## 🔧 Commandes Utiles

### Backend
```bash
# Build
cd backend/functions
npm run build

# Deploy
cd backend
firebase deploy --only functions

# Logs
firebase functions:log
```

### Frontend
```bash
# Dev
cd frontend-v2
npm run dev

# Build
npm run build

# Deploy (Vercel auto-deploy on push)
git push origin master
```

### Tests
```bash
# Health check
cd frontend-v2
node quick-health-check.js

# API test
curl https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?page=1&limit=5
```

---

## 📊 Priorités

| Priorité | Tâche | Temps Estimé | Status |
|----------|-------|--------------|--------|
| 🔴 P0 | Déployer le fix backend | 10 min | ⏳ En attente |
| 🔴 P0 | Vérifier l'API fonctionne | 5 min | ⏳ En attente |
| 🟡 P1 | Corriger les traductions | 2-3 heures | ⏳ À faire |
| 🟡 P1 | Harmoniser les couleurs | 1-2 heures | ⏳ À faire |
| 🟢 P2 | Implémenter géolocalisation | 2-3 heures | ⏳ À faire |
| 🟢 P2 | Refaire le layout Evelya | 4-6 heures | ⏳ À faire |

---

## 🎯 Résultat Attendu

### Après Phase 1 (Backend)
- ✅ API publique accessible sans authentification
- ✅ Événements se chargent sur la page
- ✅ Pas d'erreur 401

### Après Phase 2 (Traductions)
- ✅ Toutes les sections traduites en français
- ✅ Pas de texte en anglais sur la version FR
- ✅ Traductions cohérentes

### Après Phase 3 (Design)
- ✅ Design identique à Evelya.co
- ✅ Police Inter partout
- ✅ Couleurs Evelya (bleus/neutres)
- ✅ Géolocalisation fonctionnelle
- ✅ Layout moderne et professionnel

---

**Date:** 27 janvier 2026  
**Responsable:** Équipe Dev AttendanceX  
**Deadline Phase 1:** Aujourd'hui (critique)  
**Deadline Phase 2:** Aujourd'hui  
**Deadline Phase 3:** Cette semaine
