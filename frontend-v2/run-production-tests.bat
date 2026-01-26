@echo off
REM Script pour exécuter les tests E2E contre la production (Windows)
REM Usage: run-production-tests.bat [test-type]
REM test-type: all, smoke, performance, journey (default: all)

setlocal enabledelayedexpansion

REM URL de production
set PRODUCTION_URL=https://attendance-x.vercel.app

REM Type de test (par défaut: all)
set TEST_TYPE=%1
if "%TEST_TYPE%"=="" set TEST_TYPE=all

echo ================================================================
echo   AttendanceX - Tests E2E Production
echo ================================================================
echo.

echo URL de production: %PRODUCTION_URL%
echo Type de test: %TEST_TYPE%
echo.

REM Vérifier que l'URL est accessible
echo Verification de l'accessibilite de la production...
curl -s --head --request GET "%PRODUCTION_URL%" | findstr /C:"200" /C:"301" /C:"302" >nul
if %errorlevel% equ 0 (
  echo [OK] Production accessible
) else (
  echo [ERREUR] Production non accessible
  exit /b 1
)

echo.

REM Compteurs de résultats
set TOTAL_TESTS=0
set PASSED_TESTS=0
set FAILED_TESTS=0

REM Fonction pour exécuter les tests
if "%TEST_TYPE%"=="smoke" (
  echo Execution des tests de fumee...
  echo.
  set TOTAL_TESTS=1
  set PLAYWRIGHT_BASE_URL=%PRODUCTION_URL%
  call npx playwright test tests/e2e/smoke.spec.ts --reporter=html
  if !errorlevel! equ 0 (
    set /a PASSED_TESTS+=1
    echo [OK] Tests Smoke reussis
  ) else (
    set /a FAILED_TESTS+=1
    echo [ERREUR] Tests Smoke echoues
  )
) else if "%TEST_TYPE%"=="performance" (
  echo Execution des tests de performance...
  echo.
  set TOTAL_TESTS=1
  set PLAYWRIGHT_BASE_URL=%PRODUCTION_URL%
  call npx playwright test tests/e2e/performance.spec.ts --reporter=html
  if !errorlevel! equ 0 (
    set /a PASSED_TESTS+=1
    echo [OK] Tests Performance reussis
  ) else (
    set /a FAILED_TESTS+=1
    echo [ERREUR] Tests Performance echoues
  )
) else if "%TEST_TYPE%"=="journey" (
  echo Execution des tests de parcours utilisateur...
  echo.
  set TOTAL_TESTS=1
  set PLAYWRIGHT_BASE_URL=%PRODUCTION_URL%
  call npx playwright test tests/e2e/user-journey.spec.ts --reporter=html
  if !errorlevel! equ 0 (
    set /a PASSED_TESTS+=1
    echo [OK] Tests User Journey reussis
  ) else (
    set /a FAILED_TESTS+=1
    echo [ERREUR] Tests User Journey echoues
  )
) else if "%TEST_TYPE%"=="public-events" (
  echo Execution des tests des pages publiques...
  echo.
  set TOTAL_TESTS=1
  set PLAYWRIGHT_BASE_URL=%PRODUCTION_URL%
  call npx playwright test tests/e2e/public-events.spec.ts --reporter=html
  if !errorlevel! equ 0 (
    set /a PASSED_TESTS+=1
    echo [OK] Tests Public Events reussis
  ) else (
    set /a FAILED_TESTS+=1
    echo [ERREUR] Tests Public Events echoues
  )
) else if "%TEST_TYPE%"=="all" (
  echo Execution de tous les tests...
  echo.
  set TOTAL_TESTS=4
  
  REM Tests de fumée
  echo --- Tests de fumee ---
  set PLAYWRIGHT_BASE_URL=%PRODUCTION_URL%
  call npx playwright test tests/e2e/smoke.spec.ts --reporter=html
  if !errorlevel! equ 0 (
    set /a PASSED_TESTS+=1
    echo [OK] Tests Smoke reussis
  ) else (
    set /a FAILED_TESTS+=1
    echo [ERREUR] Tests Smoke echoues
  )
  echo.
  
  REM Tests des pages publiques
  echo --- Tests des pages publiques ---
  set PLAYWRIGHT_BASE_URL=%PRODUCTION_URL%
  call npx playwright test tests/e2e/public-events.spec.ts --reporter=html
  if !errorlevel! equ 0 (
    set /a PASSED_TESTS+=1
    echo [OK] Tests Public Events reussis
  ) else (
    set /a FAILED_TESTS+=1
    echo [ERREUR] Tests Public Events echoues
  )
  echo.
  
  REM Tests de parcours utilisateur
  echo --- Tests de parcours utilisateur ---
  set PLAYWRIGHT_BASE_URL=%PRODUCTION_URL%
  call npx playwright test tests/e2e/user-journey.spec.ts --reporter=html
  if !errorlevel! equ 0 (
    set /a PASSED_TESTS+=1
    echo [OK] Tests User Journey reussis
  ) else (
    set /a FAILED_TESTS+=1
    echo [ERREUR] Tests User Journey echoues
  )
  echo.
  
  REM Tests de performance
  echo --- Tests de performance ---
  set PLAYWRIGHT_BASE_URL=%PRODUCTION_URL%
  call npx playwright test tests/e2e/performance.spec.ts --reporter=html
  if !errorlevel! equ 0 (
    set /a PASSED_TESTS+=1
    echo [OK] Tests Performance reussis
  ) else (
    set /a FAILED_TESTS+=1
    echo [ERREUR] Tests Performance echoues
  )
) else (
  echo [ERREUR] Type de test invalide: %TEST_TYPE%
  echo Types valides: all, smoke, performance, journey, public-events
  exit /b 1
)

echo.
echo ================================================================
echo   Resume des Tests
echo ================================================================
echo.
echo Total: %TOTAL_TESTS% suites de tests
echo Reussis: %PASSED_TESTS%
echo Echoues: %FAILED_TESTS%
echo.

REM Ouvrir le rapport HTML
echo Generation du rapport HTML...
call npx playwright show-report

REM Code de sortie
if %FAILED_TESTS% equ 0 (
  echo.
  echo ================================================================
  echo   Tous les tests sont passes avec succes !
  echo ================================================================
  exit /b 0
) else (
  echo.
  echo ================================================================
  echo   Certains tests ont echoue
  echo ================================================================
  exit /b 1
)
