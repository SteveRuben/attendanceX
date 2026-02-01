# Guide de Déploiement - 1er Février 2026

## 📊 État Actuel du Projet

### ✅ Fixes Appliqués Aujourd'hui (Localement)

#### 1. **Onboarding Page - Infinite Loop Fix**
- **Problème**: 25+ appels API répétitifs
- **Solution**: `useCallback` + `useRef` pour éviter les re-renders
- **Fichier**: `frontend/src/pages/onboarding/setup.tsx`
- **Status**: ✅ Corrigé localement

#### 2. **Rate Limit Middleware Bug**
- **Problème**: `field.toLowerCase is not a function`
- **Solution**: Remplacé `res.set({...})` par `res.setHeader()`
- **Fichier**: `backend/functions/src/middleware/rateLimit.memory.ts`
- **Status**: ✅ Corrigé localement, ❌ PAS en production

#### 3. **Dashboard Scroll Fix**
- **Problème**: Pas de scroll sur le dashboard
- **Solution**: Ajouté `overflow-y-auto` dans AppShell
- **Fichiers**: 
  - `frontend/src/components/layout/AppShell.tsx`
  - `frontend/src/pages/app/dashboard.tsx`
- **Status**: ✅ Corrigé localement

### ⚠️ Problèmes en Production

#### Backend API (CRITIQUE)
- ❌ **500 Internal Server Error** sur `/v1/events`
- ❌ **500 Internal Server Error** sur `/v1/users`
- ❌ Rate limit middleware crash
- **Cause**: Code de production utilise l'ancien code avec le bug
- **Solution**: Déployer le backend immédiatement

#### Frontend
- ✅ Fonctionne mais utilise l'API cassée
- ✅ Tous les fixes UI sont prêts
- **Action**: Déployer après le backend

---

## 🚀 Plan de Déploiement

### Étape 1: Déployer le Backend (PRIORITÉ HAUTE)

```bash
# 1. Aller dans le dossier backend
cd backend/functions

# 2. Installer les dépendances (si nécessaire)
npm install

# 3. Build le code TypeScript
npm run build

# 4. Retourner à la racine
cd ../..

# 5. Déployer les fonctions Firebase
firebase deploy --only functions

# OU déployer seulement l'API (plus rapide)
firebase deploy --only functions:api
```

**Temps estimé**: 5-10 minutes

**Vérification après déploiement**:
```bash
# Surveiller les logs
firebase functions:log --only api

# Tester l'API
curl https://api-rvnxjp7idq-bq.a.run.app/v1/health
```

### Étape 2: Déployer le Frontend

```bash
# 1. Aller dans le dossier frontend
cd frontend

# 2. Vérifier les variables d'environnement
cat .env.production

# Variables requises:
# NEXT_PUBLIC_API_URL=https://api-rvnxjp7idq-bq.a.run.app
# NEXT_PUBLIC_FIREBASE_API_KEY=...
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# etc.

# 3. Build le frontend
npm run build

# 4. Déployer sur Vercel (si configuré)
vercel --prod

# OU déployer sur Firebase Hosting
cd ..
firebase deploy --only hosting
```

**Temps estimé**: 3-5 minutes

---

## 📋 Checklist de Déploiement

### Pré-Déploiement Backend
- [ ] Code compilé sans erreurs (`npm run build`)
- [ ] Variables d'environnement configurées
- [ ] Firebase CLI connecté au bon projet
- [ ] Backup de la base de données (si nécessaire)

### Déploiement Backend
- [ ] `firebase deploy --only functions` exécuté
- [ ] Déploiement terminé sans erreurs
- [ ] Logs vérifiés (pas d'erreurs au démarrage)
- [ ] Health check endpoint répond: `/v1/health`
- [ ] API endpoints testés: `/v1/events`, `/v1/users`

### Pré-Déploiement Frontend
- [ ] Variables d'environnement production configurées
- [ ] Build réussi (`npm run build`)
- [ ] Pas d'erreurs TypeScript
- [ ] Pas d'erreurs de linting

### Déploiement Frontend
- [ ] Déploiement sur Vercel/Firebase Hosting
- [ ] Site accessible
- [ ] Connexion à l'API fonctionne
- [ ] Pages principales testées:
  - [ ] Page d'accueil
  - [ ] Login/Register
  - [ ] Dashboard
  - [ ] Onboarding
  - [ ] Events

### Post-Déploiement
- [ ] Monitoring des logs backend (15 min)
- [ ] Test complet du flow utilisateur
- [ ] Vérification des erreurs dans Sentry/monitoring
- [ ] Performance acceptable (< 3s load time)

---

## 🔧 Commandes Rapides

### Backend

```bash
# Build + Deploy en une commande
cd backend/functions && npm run build && cd ../.. && firebase deploy --only functions

# Voir les logs en temps réel
firebase functions:log --only api --follow

# Rollback si problème
firebase functions:delete api
firebase deploy --only functions:api
```

### Frontend

```bash
# Build + Deploy Vercel
cd frontend && npm run build && vercel --prod

# Build + Deploy Firebase Hosting
cd frontend && npm run build && cd .. && firebase deploy --only hosting

# Preview avant production
vercel
```

---

## 🐛 Résolution de Problèmes

### Backend ne démarre pas

```bash
# Vérifier les logs
firebase functions:log --only api

# Vérifier la configuration
firebase functions:config:get

# Redéployer avec verbose
firebase deploy --only functions --debug
```

### Frontend ne se connecte pas à l'API

1. Vérifier `.env.production`:
   ```bash
   cat frontend/.env.production
   ```

2. Vérifier que `NEXT_PUBLIC_API_URL` est correct

3. Vérifier CORS dans le backend

4. Tester l'API directement:
   ```bash
   curl https://api-rvnxjp7idq-bq.a.run.app/v1/health
   ```

### Erreurs 500 persistent

1. Vérifier que le build est à jour:
   ```bash
   cd backend/functions
   npm run build
   ls -la lib/  # Vérifier que les fichiers sont récents
   ```

2. Vérifier les variables d'environnement:
   ```bash
   firebase functions:config:get
   ```

3. Vérifier les logs détaillés:
   ```bash
   firebase functions:log --only api --limit 100
   ```

---

## 📊 État des Fonctionnalités

### Backend
| Fonctionnalité | Status | Notes |
|----------------|--------|-------|
| Authentication | ✅ | JWT + Firebase Auth |
| Events API | ⚠️ | 500 errors en prod |
| Users API | ⚠️ | 500 errors en prod |
| Tenants API | ✅ | Fonctionne |
| Rate Limiting | ⚠️ | Bug fixé localement |
| CORS | ✅ | Configuré |
| Email (Resend) | ✅ | Intégré |

### Frontend
| Fonctionnalité | Status | Notes |
|----------------|--------|-------|
| Homepage | ✅ | Design Evelya |
| Auth Pages | ✅ | Login/Register |
| Dashboard | ✅ | Scroll fixé |
| Onboarding | ✅ | Infinite loop fixé |
| Events | ✅ | Liste + détails |
| Public Layout | ✅ | Bottom menu |
| Responsive | ✅ | Mobile/Tablet/Desktop |

---

## 🎯 Priorités de Déploiement

### 1. URGENT - Backend API
**Pourquoi**: API cassée en production, bloque tout
**Action**: `firebase deploy --only functions`
**Temps**: 5-10 min

### 2. IMPORTANT - Frontend
**Pourquoi**: Nouveaux fixes UI à déployer
**Action**: `vercel --prod` ou `firebase deploy --only hosting`
**Temps**: 3-5 min

### 3. MONITORING - Logs
**Pourquoi**: Surveiller la stabilité
**Action**: `firebase functions:log --follow`
**Temps**: 15-30 min de surveillance

---

## 📝 Notes Importantes

### Variables d'Environnement

**Backend** (Firebase Functions Config):
```bash
firebase functions:config:set \
  resend.api_key="re_..." \
  app.env="production" \
  cors.origin="https://attendancex.vercel.app"
```

**Frontend** (`.env.production`):
```env
NEXT_PUBLIC_API_URL=https://api-rvnxjp7idq-bq.a.run.app
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### Rollback Plan

Si le déploiement cause des problèmes:

```bash
# Backend: Revenir à la version précédente
firebase functions:delete api
# Puis redéployer l'ancienne version depuis Git

# Frontend: Rollback Vercel
vercel rollback

# Frontend: Rollback Firebase Hosting
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION TARGET_SITE_ID
```

---

## ✅ Résumé

### À Faire Maintenant
1. ✅ **Déployer le backend** - Corrige les 500 errors
2. ✅ **Déployer le frontend** - Nouveaux fixes UI
3. ✅ **Surveiller les logs** - Vérifier la stabilité

### Commandes Essentielles
```bash
# Backend
cd backend/functions && npm run build && cd ../.. && firebase deploy --only functions

# Frontend  
cd frontend && npm run build && vercel --prod

# Monitoring
firebase functions:log --only api --follow
```

---

**Date**: 1er Février 2026  
**Priorité**: 🔴 HAUTE - API cassée en production  
**Temps estimé total**: 15-20 minutes  
**Risque**: Faible (fixes testés localement)
