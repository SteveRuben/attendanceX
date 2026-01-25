@echo off
REM Script de déploiement complet pour AttendanceX Backend (Windows)
REM Déploie toutes les fonctions, jobs, triggers, règles et indexes

echo ==========================================
echo Deploiement Complet AttendanceX Backend
echo ==========================================
echo.

REM Vérifier qu'on est dans le bon répertoire
if not exist "firebase.json" (
    echo Erreur: firebase.json non trouve
    echo Executez ce script depuis le dossier backend/
    exit /b 1
)

REM Vérifier que Firebase CLI est installé
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Erreur: Firebase CLI n'est pas installe
    echo Installez-le avec: npm install -g firebase-tools
    exit /b 1
)

echo Verification de l'authentification Firebase...
firebase projects:list >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Erreur: Non authentifie sur Firebase
    echo Connectez-vous avec: firebase login
    exit /b 1
)

echo Authentification Firebase OK
echo.

REM Build du projet
echo ==========================================
echo Build du Projet TypeScript
echo ==========================================
cd functions
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Erreur lors du build
    exit /b 1
)
cd ..
echo Build reussi
echo.

REM 1. Déployer les règles Firestore
echo ==========================================
echo Deploiement des Regles Firestore
echo ==========================================
firebase deploy --only firestore:rules
echo.

REM 2. Déployer les indexes Firestore (peut échouer si indexes inutiles)
echo ==========================================
echo Deploiement des Indexes Firestore
echo ==========================================
firebase deploy --only firestore:indexes
if %ERRORLEVEL% NEQ 0 (
    echo Avertissement: Certains indexes n'ont pas pu etre deployes
)
echo.

REM 3. Déployer les règles Storage (optionnel)
echo ==========================================
echo Deploiement des Regles Storage
echo ==========================================
firebase deploy --only storage
if %ERRORLEVEL% NEQ 0 (
    echo Avertissement: Echec du deploiement Storage (peut etre desactive)
)
echo.

REM 4. Déployer TOUTES les Functions
echo ==========================================
echo Deploiement de TOUTES les Functions
echo ==========================================
echo    - API HTTP
echo    - Jobs Schedules
echo    - Triggers Firestore
echo    - Triggers Auth
echo    - Triggers Storage
echo.

firebase deploy --only functions
if %ERRORLEVEL% NEQ 0 (
    echo Erreur lors du deploiement des functions
    exit /b 1
)

echo.
echo ==========================================
echo Deploiement Complet Termine!
echo ==========================================
echo.
echo Resume:
echo    Regles Firestore deployees
echo    Indexes Firestore (certains peuvent etre ignores)
echo    Regles Storage (optionnel)
echo    Functions HTTP deployees
echo    Jobs Schedules deployes
echo    Triggers deployes
echo.
echo URLs:
echo    API: https://api-rvnxjp7idq-ew.a.run.app/v1
echo    Health: https://api-rvnxjp7idq-ew.a.run.app/v1/health
echo    Docs: https://api-rvnxjp7idq-ew.a.run.app/v1/docs
echo.
echo Prochaines etapes:
echo    1. Verifier les logs: firebase functions:log
echo    2. Tester l'API: curl https://api-rvnxjp7idq-ew.a.run.app/v1/health
echo    3. Verifier les jobs dans Firebase Console
echo.
