# scripts/test-backend.ps1 - Script PowerShell pour les tests backend

param(
    [Parameter(Position=0)]
    [string]$Action = "help"
)

# Couleurs pour l'affichage
function Write-Step {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Fonction d'aide
function Show-Help {
    Write-Host "Usage: .\scripts\test-backend.ps1 [OPTION]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  unit                 Exécuter les tests unitaires"
    Write-Host "  integration          Exécuter les tests d'intégration"
    Write-Host "  all                  Exécuter tous les tests backend"
    Write-Host "  coverage             Exécuter les tests avec couverture"
    Write-Host "  watch                Exécuter les tests en mode watch"
    Write-Host "  setup                Configurer l'environnement de test"
    Write-Host "  clean                Nettoyer les fichiers de test"
    Write-Host "  help                 Afficher cette aide"
    Write-Host ""
    Write-Host "Exemples:"
    Write-Host "  .\scripts\test-backend.ps1 unit              # Tests unitaires seulement"
    Write-Host "  .\scripts\test-backend.ps1 coverage          # Tests avec rapport de couverture"
    Write-Host "  .\scripts\test-backend.ps1 setup             # Configuration initiale"
}

# Vérification des prérequis
function Test-Prerequisites {
    Write-Step "Vérification des prérequis..."
    
    # Vérifier Node.js
    try {
        $nodeVersion = node --version
        Write-Step "Node.js version: $nodeVersion"
    }
    catch {
        Write-Error "Node.js n'est pas installé"
        exit 1
    }
    
    # Vérifier npm
    try {
        $npmVersion = npm --version
        Write-Step "npm version: $npmVersion"
    }
    catch {
        Write-Error "npm n'est pas installé"
        exit 1
    }
    
    # Vérifier que nous sommes à la racine du projet
    if (-not (Test-Path "package.json")) {
        Write-Error "Ce script doit être exécuté depuis la racine du projet"
        exit 1
    }
    
    Write-Success "Prérequis vérifiés"
}

# Configuration de l'environnement
function Initialize-Environment {
    Write-Step "Configuration de l'environnement de test..."
    
    # Installer les dépendances si nécessaire
    if (-not (Test-Path "node_modules")) {
        Write-Step "Installation des dépendances principales..."
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Échec de l'installation des dépendances principales"
            exit 1
        }
    }
    
    # Installer les dépendances backend
    if (-not (Test-Path "backend\functions\node_modules")) {
        Write-Step "Installation des dépendances backend..."
        Push-Location "backend\functions"
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Échec de l'installation des dépendances backend"
            Pop-Location
            exit 1
        }
        Pop-Location
    }
    
    # Créer les dossiers de rapports si nécessaire
    New-Item -ItemType Directory -Force -Path "tests\reports\coverage" | Out-Null
    New-Item -ItemType Directory -Force -Path "tests\reports\junit" | Out-Null
    
    # Vérifier la configuration Jest
    if (-not (Test-Path "tests\config\jest.backend.config.js")) {
        Write-Error "Configuration Jest backend manquante"
        exit 1
    }
    
    Write-Success "Environnement configuré"
}

# Nettoyage
function Clear-TestFiles {
    Write-Step "Nettoyage des fichiers de test..."
    
    # Supprimer les rapports précédents
    if (Test-Path "tests\reports\coverage") {
        Remove-Item -Recurse -Force "tests\reports\coverage\*" -ErrorAction SilentlyContinue
    }
    if (Test-Path "tests\reports\junit") {
        Remove-Item -Recurse -Force "tests\reports\junit\*" -ErrorAction SilentlyContinue
    }
    
    # Supprimer les fichiers temporaires
    Get-ChildItem -Recurse -Name "*.log" | Remove-Item -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Recurse -Name ".nyc_output" -Directory | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Success "Nettoyage terminé"
}

# Tests unitaires
function Invoke-UnitTests {
    Write-Step "Exécution des tests unitaires backend..."
    
    npm run test:backend:unit
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Tests unitaires réussis"
    } else {
        Write-Error "Échec des tests unitaires"
        exit 1
    }
}

# Tests d'intégration
function Invoke-IntegrationTests {
    Write-Step "Exécution des tests d'intégration backend..."
    
    npm run test:backend:integration
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Tests d'intégration réussis"
    } else {
        Write-Error "Échec des tests d'intégration"
        exit 1
    }
}

# Tous les tests
function Invoke-AllTests {
    Write-Step "Exécution de tous les tests backend..."
    
    npm run test:backend
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Tous les tests réussis"
    } else {
        Write-Error "Échec des tests"
        exit 1
    }
}

# Tests avec couverture
function Invoke-CoverageTests {
    Write-Step "Exécution des tests avec couverture..."
    
    npm run test:backend:coverage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Tests avec couverture réussis"
        Write-Step "Rapport de couverture disponible dans tests\reports\coverage\"
        
        # Ouvrir le rapport HTML si possible
        $reportPath = "tests\reports\coverage\lcov-report\index.html"
        if (Test-Path $reportPath) {
            try {
                Start-Process $reportPath
            }
            catch {
                Write-Warning "Impossible d'ouvrir automatiquement le rapport de couverture"
            }
        }
    } else {
        Write-Error "Échec des tests de couverture"
        exit 1
    }
}

# Tests en mode watch
function Invoke-WatchTests {
    Write-Step "Démarrage des tests en mode watch..."
    Write-Warning "Appuyez sur Ctrl+C pour arrêter"
    
    npm run test:backend:watch
}

# Démarrage des émulateurs Firebase (optionnel)
function Start-Emulators {
    Write-Step "Vérification des émulateurs Firebase..."
    
    try {
        $firebaseVersion = firebase --version
        Write-Step "Firebase CLI version: $firebaseVersion"
        
        Write-Step "Démarrage des émulateurs Firebase..."
        Start-Process -FilePath "firebase" -ArgumentList "emulators:start", "--only", "firestore,auth" -NoNewWindow -PassThru | Out-File -FilePath ".emulator.pid" -Encoding ASCII
        
        # Attendre que les émulateurs démarrent
        Start-Sleep -Seconds 5
        
        Write-Success "Émulateurs Firebase démarrés"
    }
    catch {
        Write-Warning "Firebase CLI non installé ou erreur de démarrage des émulateurs"
    }
}

# Arrêt des émulateurs
function Stop-Emulators {
    if (Test-Path ".emulator.pid") {
        try {
            $processes = Get-Process -Name "firebase" -ErrorAction SilentlyContinue
            if ($processes) {
                Write-Step "Arrêt des émulateurs Firebase..."
                $processes | Stop-Process -Force
                Remove-Item ".emulator.pid" -ErrorAction SilentlyContinue
                Write-Success "Émulateurs arrêtés"
            }
        }
        catch {
            Write-Warning "Erreur lors de l'arrêt des émulateurs"
        }
    }
}

# Fonction principale
function Main {
    param([string]$Action)
    
    switch ($Action.ToLower()) {
        "unit" {
            Test-Prerequisites
            Initialize-Environment
            Invoke-UnitTests
        }
        "integration" {
            Test-Prerequisites
            Initialize-Environment
            Start-Emulators
            try {
                Invoke-IntegrationTests
            }
            finally {
                Stop-Emulators
            }
        }
        "all" {
            Test-Prerequisites
            Initialize-Environment
            Start-Emulators
            try {
                Invoke-AllTests
            }
            finally {
                Stop-Emulators
            }
        }
        "coverage" {
            Test-Prerequisites
            Initialize-Environment
            Start-Emulators
            try {
                Invoke-CoverageTests
            }
            finally {
                Stop-Emulators
            }
        }
        "watch" {
            Test-Prerequisites
            Initialize-Environment
            Invoke-WatchTests
        }
        "setup" {
            Test-Prerequisites
            Initialize-Environment
            Write-Success "Configuration terminée"
        }
        "clean" {
            Clear-TestFiles
        }
        default {
            Show-Help
        }
    }
}

# Gestion des erreurs
$ErrorActionPreference = "Stop"

try {
    Main -Action $Action
}
catch {
    Write-Error "Erreur lors de l'exécution: $($_.Exception.Message)"
    exit 1
}
finally {
    # Nettoyage final
    Stop-Emulators
}