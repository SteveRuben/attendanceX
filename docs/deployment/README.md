# 📦 Documentation de Déploiement - AttendanceX

Ce dossier contient toute la documentation nécessaire pour déployer l'application AttendanceX sur Vercel.

---

## 📋 Guides de Déploiement

### 🚀 Guides Principaux

| Fichier | Description | Quand l'utiliser |
|---------|-------------|------------------|
| **DEPLOY_NOW.md** | ⭐ Guide de démarrage rapide | Première fois que vous déployez |
| **DEPLOYMENT_READY.md** | État de préparation du déploiement | Vérifier que tout est prêt |
| **DEPLOYMENT_STATUS.md** | Statut actuel du déploiement | Voir l'état des corrections |

### 🔧 Guides de Configuration

| Fichier | Description | Quand l'utiliser |
|---------|-------------|------------------|
| **VERCEL_DASHBOARD_SETUP.md** | Configuration via le dashboard Vercel | Déploiement via interface web |
| **VERCEL_ENV_SETUP.md** | Configuration des variables d'environnement | Configurer les env vars |
| **ENV_VARS_QUICK_COPY.txt** | Variables d'environnement à copier-coller | Référence rapide |

### 🆘 Guides de Dépannage

| Fichier | Description | Quand l'utiliser |
|---------|-------------|------------------|
| **VERCEL_FIX_ROOT_DIRECTORY.md** | Corriger l'erreur de Root Directory | Erreur "package.json not found" |
| **ROOT_DIRECTORY_FIX.txt** | Référence rapide Root Directory | Aide-mémoire rapide |
| **VERCEL_CACHE_FIX.md** | Corriger les problèmes de cache | Build échoue avec fichiers supprimés |
| **VERCEL_DEPLOYMENT.md** | Guide complet de déploiement | Documentation complète |

---

## 🎯 Démarrage Rapide

### Pour Déployer la Première Fois

1. **Lire** `DEPLOY_NOW.md`
2. **Vérifier** `DEPLOYMENT_READY.md`
3. **Suivre** les étapes du guide
4. **Référencer** `ENV_VARS_QUICK_COPY.txt` pour les variables

### En Cas de Problème

1. **Erreur "package.json not found"** → `VERCEL_FIX_ROOT_DIRECTORY.md`
2. **Build échoue avec fichiers supprimés** → `VERCEL_CACHE_FIX.md`
3. **Questions sur les env vars** → `VERCEL_ENV_SETUP.md`

---

## 🔑 Variables d'Environnement Requises

```
NEXT_PUBLIC_API_URL = https://api-rvnxjp7idq-ew.a.run.app/v1
API_URL = https://api-rvnxjp7idq-ew.a.run.app/v1
NEXTAUTH_SECRET = ZvPH5/ZOS7vPAKceGo7GwDwnqboF3/9KwaDKV7HnFc0=
NEXTAUTH_URL = https://your-project.vercel.app
```

Voir `ENV_VARS_QUICK_COPY.txt` pour plus de détails.

---

## ⚠️ Points Critiques

### Root Directory
**TOUJOURS** définir le Root Directory à `frontend-v2` dans Vercel!

### Cache
Si le build échoue avec des fichiers qui n'existent plus, voir `VERCEL_CACHE_FIX.md`.

### Variables d'Environnement
Toutes les 4 variables sont **OBLIGATOIRES** pour que l'application fonctionne.

---

## 📚 Documentation Connexe

- **Backend**: Voir `docs/setup/backend-setup.md`
- **Frontend**: Voir `frontend-v2/README.md`
- **Architecture**: Voir `docs/architecture/`
- **Sécurité**: Voir `docs/security/`

---

## 🆘 Support

Si vous rencontrez des problèmes non couverts par ces guides:

1. Vérifier les logs de build Vercel
2. Consulter la documentation Vercel: https://vercel.com/docs
3. Consulter la documentation Next.js: https://nextjs.org/docs

---

**Dernière mise à jour**: Janvier 2026
