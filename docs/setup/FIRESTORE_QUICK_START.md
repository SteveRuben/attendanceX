# 🚀 Quick Start - Initialiser Firestore

## Étape 1: Obtenir le Service Account Key

1. Ouvrir: https://console.firebase.google.com/
2. Sélectionner le projet: **attendance-management-syst**
3. Cliquer sur l'icône ⚙️ (Settings) > **Project Settings**
4. Aller dans l'onglet **Service Accounts**
5. Cliquer sur **Generate New Private Key**
6. Sauvegarder le fichier téléchargé dans:
   ```
   backend/functions/serviceAccountKey.json
   ```

## Étape 2: Exécuter le Script

### Windows (PowerShell)
```powershell
cd backend
.\init-firestore-collections.ps1
```

### Windows (CMD)
```cmd
cd backend
init-firestore-collections.bat
```

## Étape 3: Vérifier

### A. Firebase Console
https://console.firebase.google.com/project/attendance-management-syst/firestore

Vérifier que ces collections existent:
- ✅ `events` (5 documents)
- ✅ `tenants` (5 documents)
- ✅ `subscription_plans` (3 documents)

### B. Tester l'API
```bash
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events"
```

Devrait retourner:
```json
{
  "success": true,
  "data": {
    "events": [...],
    "pagination": { "total": 5 }
  }
}
```

### C. Vérifier le Frontend
https://attendance-x.vercel.app/fr/events

Devrait afficher 5 événements.

## Étape 4: Commit et Deploy

Si tout fonctionne:

```bash
git add .
git commit -m "fix: initialize Firestore collections and fix public events API"
git push origin master

cd backend
.\deploy-backend-fix.bat
```

## ❓ Problèmes?

Voir le guide complet: `backend/FIRESTORE_INITIALIZATION.md`

---

**Temps estimé:** 5-10 minutes  
**Difficulté:** Facile  
**Prérequis:** Accès Firebase Console
