# Script PowerShell pour exécuter les tests complets du backend AttendanceX
# Usage: .\run-backend-tests.ps1 [option]

param(
    [string]$TestType = "comprehensive",
    [switch]$Coverage,
    [switch]$Watch,
    [switch]$CI,
    [switch]$Debug,
    [switch]$Clean,
    [switch]$Help
)

# Couleurs pour l'affichage
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$Cyan = "Cyan"

# Fonction d'aide
function Show-Help {
    Write-Host "🧪 Script de Tests Backend AttendanceX" -ForegroundColor $Blue
    Write-Host ""
    Write-Host "Usage: .\run-backend-tests.ps1 [options]"
    Write-Host ""
    Write-Host "Options disponibles:"
    Write-Host "  -TestType <type>      Type de tests à exécuter (défaut: comprehensive)"
    Write-Host "                        Values: comprehensive, auth, invitations, tenants, events, integration, unit, e2e"
    Write-Host "  -Coverage             Exécuter avec rapport de couverture détaillé"
    Write-Host "  -Watch                Mode watch pour développement"
    Write-Host "  -CI                   Mode CI/CD (sans watch, avec rapports)"
    Write-Host "  -Debug                Mode debug avec logs détaillés"
    Write-Host "  -Clean                Nettoyer les rapports et cache avant les tests"
    Write-Host "  -Help                 Afficher cette aide"
    Write-Host ""
    Write-Host "Exemples:"
    Write-Host "  .\run-backend-tests.ps1                           # Tous les tests complets"
    Write-Host "  .\run-backend-tests.ps1 -TestType auth           # Tests d'authentification seulement"
    Write-Host "  .\run-backend-tests.ps1 -Coverage               # Avec rapport de couverture"
    Write-Host "  .\run-backend-tests.ps1 -Watch                  # Mode développement"
    Write-Host ""
}

# Fonctions de log
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Red
}

# Vérifier les prérequis
function Test-Prerequisites {
    Write-Info "Vérification des prérequis..."
    
    # Vérifier Node.js
    try {
        $nodeVersion = node --version
        Write-Success "Node.js détecté: $nodeVersion"
    }
    catch {
        Write-Error "Node.js n'est pas installé ou n'est pas dans le PATH"
        exit 1
    }
    
    # Vérifier npm
    try {
        $npmVersion = npm --version
        Write-Success "npm détecté: $npmVersion"
    }
    catch {
        Write-Error "npm n'est pas installé ou n'est pas dans le PATH"
        exit 1
    }
    
    # Vérifier que nous sommes dans le bon répertoire
    if (-not (Test-Path "package.json")) {
        Write-Error "Ce script doit être exécuté depuis la racine du projet"
        exit 1
    }
    
    # Vérifier que le dossier tests/backend existe
    if (-not (Test-Path "tests/backend")) {
        Write-Error "Le dossier tests/backend n'existe pas"
        exit 1
    }
    
    Write-Success "Prérequis vérifiés"
}

# Installer les dépendances si nécessaire
function Install-Dependencies {
    Write-Info "Vérification des dépendances..."
    
    # Dépendances principales
    if (-not (Test-Path "node_modules")) {
        Write-Info "Installation des dépendances principales..."
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Échec de l'installation des dépendances principales"
            exit 1
        }
    }
    
    # Dépendances des tests
    if (-not (Test-Path "tests/backend/node_modules")) {
        Write-Info "Installation des dépendances de test..."
        Push-Location "tests/backend"
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Échec de l'installation des dépendances de test"
            Pop-Location
            exit 1
        }
        Pop-Location
    }
    
    Write-Success "Dépendances installées"
}

# Nettoyer les fichiers temporaires
function Clear-TempFiles {
    Write-Info "Nettoyage des fichiers temporaires..."
    
    # Nettoyer les rapports précédents
    if (Test-Path "test-results/backend") {
        Remove-Item -Recurse -Force "test-results/backend/*" -ErrorAction SilentlyContinue
    }
    if (Test-Path "coverage/backend") {
        Remove-Item -Recurse -Force "coverage/backend/*" -ErrorAction SilentlyContinue
    }
    if (Test-Path "tests/backend/coverage") {
        Remove-Item -Recurse -Force "tests/backend/coverage/*" -ErrorAction SilentlyContinue
    }
    
    # Nettoyer le cache Jest
    if (Test-Path "tests/backend/node_modules/.cache") {
        Remove-Item -Recurse -Force "tests/backend/node_modules/.cache" -ErrorAction SilentlyContinue
    }
    
    Write-Success "Nettoyage terminé"
}

# Démarrer l'émulateur Firebase si nécessaire
function Start-FirebaseEmulator {
    Write-Info "Vérification de l'émulateur Firebase..."
    
    # Vérifier si l'émulateur est déjà en cours d'exécution
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 5 -ErrorAction Stop
        Write-Success "Émulateur Firebase déjà en cours d'exécution"
        return $true
    }
    catch {
        # L'émulateur n'est pas en cours d'exécution
    }
    
    # Démarrer l'émulateur en arrière-plan
    Write-Info "Démarrage de l'émulateur Firebase..."
    Push-Location "backend"
    
    # Vérifier si firebase-tools est installé
    try {
        firebase --version | Out-Null
        $firebaseCmd = "firebase"
    }
    catch {
        Write-Warning "Firebase CLI n'est pas installé globalement"
        Write-Info "Utilisation de la version locale..."
        $firebaseCmd = "npx firebase"
    }
    
    # Démarrer l'émulateur
    $emulatorJob = Start-Job -ScriptBlock {
        param($cmd)
        Invoke-Expression "$cmd emulators:start --only firestore,auth"
    } -ArgumentList $firebaseCmd
    
    Pop-Location
    
    # Attendre que l'émulateur soit prêt
    Write-Info "Attente du démarrage de l'émulateur..."
    $maxAttempts = 30
    $attempt = 0
    
    do {
        Start-Sleep -Seconds 2
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 5 -ErrorAction Stop
            Write-Success "Émulateur Firebase prêt"
            return $emulatorJob
        }
        catch {
            # Continuer à attendre
        }
    } while ($attempt -lt $maxAttempts)
    
    Write-Error "Impossible de démarrer l'émulateur Firebase"
    Stop-Job $emulatorJob -ErrorAction SilentlyContinue
    Remove-Job $emulatorJob -ErrorAction SilentlyContinue
    return $null
}

# Arrêter l'émulateur Firebase
function Stop-FirebaseEmulator {
    param($EmulatorJob)
    
    if ($EmulatorJob) {
        Write-Info "Arrêt de l'émulateur Firebase..."
        Stop-Job $EmulatorJob -ErrorAction SilentlyContinue
        Remove-Job $EmulatorJob -ErrorAction SilentlyContinue
        Write-Success "Émulateur Firebase arrêté"
    }
}

# Exécuter les tests
function Invoke-Tests {
    param(
        [string]$TestType,
        [string]$AdditionalArgs
    )
    
    Push-Location "tests/backend"
    
    $command = switch ($TestType) {
        "comprehensive" { "npm run test:comprehensive $AdditionalArgs" }
        "auth" { "npm run test:auth $AdditionalArgs" }
        "invitations" { "npm run test:invitations $AdditionalArgs" }
        "tenants" { "npm run test:tenants $AdditionalArgs" }
        "events" { "npm run test:events $AdditionalArgs" }
        "integration" { "npm run test:integration $AdditionalArgs" }
        "unit" { "npm run test:unit $AdditionalArgs" }
        "e2e" { "npm run test:e2e $AdditionalArgs" }
        "coverage" { "npm run test:coverage $AdditionalArgs" }
        "watch" { "npm run test:watch $AdditionalArgs" }
        "ci" { "npm run test:ci $AdditionalArgs" }
        default {
            Write-Error "Type de test non reconnu: $TestType"
            Pop-Location
            return $false
        }
    }
    
    Write-Info "Exécution: $command"
    Invoke-Expression $command
    $exitCode = $LASTEXITCODE
    
    Pop-Location
    return ($exitCode -eq 0)
}

# Générer le rapport final
function New-Report {
    Write-Info "Génération du rapport final..."
    
    # Créer le dossier de rapports s'il n'existe pas
    if (-not (Test-Path "test-results/backend")) {
        New-Item -ItemType Directory -Path "test-results/backend" -Force | Out-Null
    }
    
    # Copier les rapports depuis le dossier des tests
    if (Test-Path "tests/backend/coverage") {
        Copy-Item -Recurse "tests/backend/coverage/*" "test-results/backend/" -ErrorAction SilentlyContinue
    }
    
    # Afficher le résumé
    if (Test-Path "test-results/backend/comprehensive-test-report.json") {
        Write-Success "Rapport détaillé disponible dans: test-results/backend/"
        Write-Info "Rapport HTML: test-results/backend/comprehensive-test-report.html"
        Write-Info "Rapport JSON: test-results/backend/comprehensive-test-report.json"
    }
    
    if (Test-Path "test-results/backend/lcov-report") {
        Write-Info "Rapport de couverture: test-results/backend/lcov-report/index.html"
    }
}

# Fonction principale
function Main {
    # Afficher l'aide si demandée
    if ($Help) {
        Show-Help
        return
    }
    
    # Afficher le header
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $Blue
    Write-Host "║                    🧪 Tests Backend AttendanceX              ║" -ForegroundColor $Blue
    Write-Host "║                                                              ║" -ForegroundColor $Blue
    Write-Host "║  Suite de tests complète pour le backend                    ║" -ForegroundColor $Blue
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor $Blue
    Write-Host ""
    
    # Déterminer le type de test
    if ($Coverage) { $TestType = "coverage" }
    if ($Watch) { $TestType = "watch" }
    if ($CI) { $TestType = "ci" }
    
    # Arguments additionnels
    $additionalArgs = ""
    if ($Debug) {
        $additionalArgs += " --verbose --detectOpenHandles"
        $env:DEBUG = "*"
    }
    
    try {
        # Exécuter les étapes
        Test-Prerequisites
        Install-Dependencies
        
        if ($Clean) {
            Clear-TempFiles
        }
        
        # Démarrer l'émulateur si nécessaire (pas en mode watch)
        $emulatorJob = $null
        if (-not $Watch) {
            $emulatorJob = Start-FirebaseEmulator
        }
        
        # Exécuter les tests
        Write-Info "Démarrage des tests: $TestType"
        $success = Invoke-Tests -TestType $TestType -AdditionalArgs $additionalArgs
        
        if ($success) {
            Write-Success "Tests terminés avec succès!"
            New-Report
            exit 0
        }
        else {
            Write-Error "Certains tests ont échoué"
            New-Report
            exit 1
        }
    }
    catch {
        Write-Error "Erreur lors de l'exécution: $($_.Exception.Message)"
        exit 1
    }
    finally {
        # Nettoyage
        if ($emulatorJob) {
            Stop-FirebaseEmulator -EmulatorJob $emulatorJob
        }
        
        # Tuer tous les processus Node.js liés aux tests si nécessaire
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*jest*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}

# Exécuter le script principal
Main