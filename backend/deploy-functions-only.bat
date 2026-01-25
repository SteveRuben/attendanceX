@echo off
REM Script de déploiement simplifié - Functions uniquement
REM Ignore les erreurs TypeScript temporaires

echo ==========================================
echo Deploiement Functions AttendanceX
echo ==========================================
echo.

REM Vérifier qu'on est dans le bon répertoire
if not exist "firebase.json" (
    echo Erreur: firebase.json non trouve
    exit /b 1
)

echo Deploiement des Functions (sans build)...
echo.

REM Déployer directement sans rebuild
firebase deploy --only functions

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Erreur lors du deploiement
    echo.
    echo Note: Si vous voyez des erreurs TypeScript, vous devez les corriger d'abord.
    echo Les erreurs connues sont dans:
    echo   - src/controllers/attendance/attendance.controller.ts
    echo   - src/controllers/auth/api-key.controller.ts
    echo   - src/controllers/event/event.controller.ts
    echo   - src/controllers/timesheet/activity-code.controller.ts
    echo.
    exit /b 1
)

echo.
echo ==========================================
echo Deploiement Termine!
echo ==========================================
echo.
echo URLs:
echo    API: https://api-rvnxjp7idq-ew.a.run.app/v1
echo    Health: https://api-rvnxjp7idq-ew.a.run.app/v1/health
echo.
echo Verifier les logs:
echo    firebase functions:log
echo.
echo Verifier le warmup job:
echo    firebase functions:log --only warmupJob
echo.
