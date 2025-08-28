# GitHub Issues Creation Scripts

Ce dossier contient des scripts pour automatiser la création de tickets GitHub à partir des fichiers markdown de spécification.

## 📋 Scripts Disponibles

### 1. `create-github-issues.sh` (Linux/macOS)
Script Bash pour systèmes Unix/Linux/macOS.

### 2. `create-github-issues.bat` (Windows CMD)
Script batch pour Windows Command Prompt.

### 3. `create-github-issues.ps1` (Windows PowerShell)
Script PowerShell avancé pour Windows (recommandé).

## 🚀 Prérequis

### Installation GitHub CLI
Tous les scripts nécessitent GitHub CLI (gh) :

**Windows :**
```powershell
# Via Chocolatey
choco install gh

# Via Scoop
scoop install gh

# Via winget
winget install GitHub.cli

# Ou télécharger depuis https://cli.github.com/
```

**macOS :**
```bash
# Via Homebrew
brew install gh

# Via MacPorts
sudo port install gh
```

**Linux :**
```bash
# Ubuntu/Debian
sudo apt install gh

# Fedora/CentOS
sudo dnf install gh

# Arch Linux
sudo pacman -S github-cli
```

### Authentification
Après installation, authentifiez-vous :
```bash
gh auth login
```

## ⚙️ Configuration

Avant d'utiliser les scripts, modifiez les variables de configuration :

```bash
# Dans le script de votre choix
REPO_OWNER="your-username"           # Votre nom d'utilisateur GitHub
REPO_NAME="attendance-management-system"  # Nom de votre repository
```

## 📁 Structure des Fichiers

Les scripts recherchent les fichiers markdown dans le dossier `github-issues/` avec la structure suivante :

```markdown
## Issue Title
`[FEATURE] Titre de votre ticket`

## Labels
`enhancement`, `phase/3`, `module/crm`, `priority/high`

## Milestone
Phase 3 - Business Modules (Q3 2024)

## Issue Body

---

# Contenu de votre ticket
Description détaillée, critères d'acceptation, etc.
```

## 🎯 Utilisation

### PowerShell (Recommandé pour Windows)
```powershell
# Test (dry run)
.\scripts\create-github-issues.ps1 -DryRun

# Création réelle des tickets
.\scripts\create-github-issues.ps1

# Aide
.\scripts\create-github-issues.ps1 -Help
```

### Bash (Linux/macOS)
```bash
# Rendre le script exécutable
chmod +x scripts/create-github-issues.sh

# Test (dry run)
./scripts/create-github-issues.sh --dry-run

# Création réelle des tickets
./scripts/create-github-issues.sh

# Aide
./scripts/create-github-issues.sh --help
```

### Batch (Windows CMD)
```cmd
# Test (dry run)
scripts\create-github-issues.bat --dry-run

# Création réelle des tickets
scripts\create-github-issues.bat

# Aide
scripts\create-github-issues.bat --help
```

## 📊 Tickets Disponibles

Les fichiers suivants sont prêts à être convertis en tickets GitHub :

### Phase 2 (Q2 2024)
- `phase-2-integration-ui.md` - Interface utilisateur des intégrations (90% complet)
- `phase-2-integration-testing.md` - Tests d'intégration complets (75% complet)

### Phase 3 (Q3 2024)
- `phase-3-appointment-management.md` - Système de gestion des rendez-vous
- `phase-3-crm-system.md` - Système CRM complet
- `phase-3-sales-product-management.md` - Gestion des ventes et produits
- `phase-3-mobile-pwa.md` - Application mobile PWA

### Phase 4 (Q4 2024)
- `phase-4-ai-recommendations.md` - Système d'IA et recommandations
- `phase-4-public-api-sdk.md` - API publique et SDKs
- `phase-4-marketplace-extensions.md` - Marketplace d'extensions

## 🔧 Fonctionnalités des Scripts

### Extraction Automatique
- **Titre** : Extrait automatiquement depuis `## Issue Title`
- **Labels** : Parse les labels depuis `## Labels`
- **Milestone** : Assigne le milestone depuis `## Milestone`
- **Corps** : Utilise tout le contenu après `## Issue Body`

### Validation
- Vérification de l'installation GitHub CLI
- Validation de l'authentification
- Vérification de l'existence des fichiers
- Gestion d'erreurs complète

### Mode Dry Run
- Prévisualisation des tickets sans création
- Validation de la structure des fichiers
- Test de la configuration

### Feedback Utilisateur
- Affichage coloré des statuts
- Progression en temps réel
- Résumé des opérations
- Liens directs vers les tickets créés

## 🚨 Dépannage

### Erreur d'authentification
```bash
# Re-authentifiez-vous
gh auth logout
gh auth login
```

### Permissions insuffisantes
Vérifiez que vous avez les droits d'écriture sur le repository :
```bash
gh repo view OWNER/REPO
```

### Erreur de parsing
Vérifiez la structure de vos fichiers markdown :
- Sections obligatoires : `## Issue Title`, `## Issue Body`
- Sections optionnelles : `## Labels`, `## Milestone`

### Problèmes de caractères
Assurez-vous que vos fichiers sont encodés en UTF-8.

## 📈 Exemple d'Utilisation Complète

```powershell
# 1. Configuration
# Modifiez REPO_OWNER et REPO_NAME dans le script

# 2. Test préliminaire
.\scripts\create-github-issues.ps1 -DryRun

# 3. Vérification des résultats du dry run
# Examinez la sortie pour détecter d'éventuels problèmes

# 4. Création des tickets
.\scripts\create-github-issues.ps1

# 5. Vérification sur GitHub
# Visitez https://github.com/OWNER/REPO/issues
```

## 🎯 Résultat Attendu

Après exécution, vous devriez avoir :
- ✅ 8 nouveaux tickets GitHub créés
- ✅ Labels appropriés assignés
- ✅ Milestones configurés
- ✅ Descriptions complètes avec critères d'acceptation
- ✅ Liens entre les tickets (dépendances)

## 📞 Support

En cas de problème :
1. Vérifiez les prérequis (GitHub CLI, authentification)
2. Testez avec `--dry-run` d'abord
3. Consultez les logs d'erreur
4. Vérifiez la structure des fichiers markdown

---

*Ces scripts automatisent la création de tickets pour la roadmap complète d'Attendance-X, facilitant la gestion de projet et le suivi des développements.*