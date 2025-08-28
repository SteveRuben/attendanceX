# Simple PowerShell script for creating GitHub issues
param(
    [switch]$DryRun
)

# Configuration
$REPO_OWNER = "SteveRuben"
$REPO_NAME = "attendanceX"
$ISSUES_DIR = "github-issues"

Write-Host "GitHub Issues Creator (Simple)" -ForegroundColor Blue
Write-Host "===============================" -ForegroundColor Blue
Write-Host ""

# Check GitHub CLI
try {
    gh --version | Out-Null
} catch {
    Write-Host "ERROR: GitHub CLI not installed" -ForegroundColor Red
    exit 1
}

# Check auth
try {
    gh auth status 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Host "ERROR: Not authenticated with GitHub CLI" -ForegroundColor Red
    exit 1
}

if ($DryRun) {
    Write-Host "DRY RUN MODE" -ForegroundColor Yellow
    Write-Host ""
}

# Find files
$files = Get-ChildItem -Path $ISSUES_DIR -Filter "*.md" | Sort-Object Name

if ($files.Count -eq 0) {
    Write-Host "No issue files found" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($files.Count) files:" -ForegroundColor Green
$files | ForEach-Object { Write-Host "  $($_.Name)" }
Write-Host ""

if (-not $DryRun) {
    $confirm = Read-Host "Create issues? (y/N)"
    if ($confirm -ne 'y') {
        Write-Host "Cancelled"
        exit 0
    }
    Write-Host ""
}

# Process each file
foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Blue
    
    # Simple title extraction
    $content = Get-Content $file.FullName
    $title = ""
    $foundTitle = $false
    
    foreach ($line in $content) {
        if ($line -eq "## Issue Title") {
            $foundTitle = $true
            continue
        }
        if ($foundTitle -and $line.Trim() -ne "" -and -not $line.StartsWith("##")) {
            $title = $line.Trim() -replace '`', ''
            break
        }
    }
    
    Write-Host "  Title: $title" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would create issue" -ForegroundColor Yellow
        continue
    }
    
    # Create issue with basic title and full file as body
    try {
        $result = gh issue create --repo "$REPO_OWNER/$REPO_NAME" --title $title --body-file $file.FullName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Created successfully" -ForegroundColor Green
            Write-Host "    $result" -ForegroundColor Cyan
        } else {
            Write-Host "  ✗ Failed: $result" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

if (-not $DryRun) {
    Write-Host "Completed!" -ForegroundColor Green
    Write-Host "View issues: https://github.com/$REPO_OWNER/$REPO_NAME/issues" -ForegroundColor Blue
}