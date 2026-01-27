@echo off
REM Script de déploiement du fix backend (Windows)
REM Corrige le problème d'authentification sur les routes publiques

echo 🚀 Déploiement du fix backend - Routes publiques
echo ================================================
echo.

REM Vérifier qu'on est dans le bon répertoire
if not exist "firebase.json" (
    echo ❌ Erreur: Ce script doit être exécuté depuis le dossier backend/
    exit /b 1
)

REM Build du code TypeScript
echo 📦 Build du code TypeScript...
cd functions
call npm run build

if errorlevel 1 (
    echo ❌ Erreur lors du build
    exit /b 1
)

echo ✅ Build réussi
echo.

REM Retour au dossier backend
cd ..

REM Déploiement sur Firebase
echo 🚀 Déploiement sur Firebase Functions...
call firebase deploy --only functions

if errorlevel 1 (
    echo ❌ Erreur lors du déploiement
    exit /b 1
)

echo.
echo ✅ Déploiement réussi!
echo.
echo 🧪 Test de l'API...
echo Attente de 10 secondes pour que les fonctions soient actives...
timeout /t 10 /nobreak > nul

REM Test de l'API
echo.
echo Test: GET /v1/public/events
curl -s "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?page=1&limit=5"

echo.
echo ================================================
echo ✅ Déploiement terminé!
echo.
echo Prochaines étapes:
echo 1. Vérifier que l'API retourne des événements (pas d'erreur 401)
echo 2. Tester sur https://attendance-x.vercel.app/fr/events
echo 3. Corriger les traductions manquantes
echo 4. Harmoniser le design avec Evelya.co
