# Robust PowerShell script for creating GitHub issues
param(
    [switch]$DryRun
)

# Configuration
$REPO_OWNER = "SteveRuben"
$REPO_NAME = "attendanceX"
$ISSUES_DIR = "github-issues"

Write-Host "GitHub Issues Creator (Robust)" -ForegroundColor Blue
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

# Function to extract metadata
function Extract-IssueMetadata {
    param([string]$FilePath)
    
    $content = Get-Content $FilePath -Raw
    $lines = Get-Content $FilePath
    
    $metadata = @{
        Title = ""
        Labels = @()
        Milestone = ""
        Body = ""
    }
    
    $currentSection = ""
    $bodyStarted = $false
    $bodyLines = @()
    
    foreach ($line in $lines) {
        switch -Regex ($line) {
            "^## Issue Title$" { $currentSection = "Title"; continue }
            "^## Labels$" { $currentSection = "Labels"; continue }
            "^## Milestone$" { $currentSection = "Milestone"; continue }
            "^## Issue Body$" { $bodyStarted = $true; continue }
            default {
                if ($bodyStarted) {
                    $bodyLines += $line
                }
                elseif ($currentSection -eq "Title" -and $line.Trim() -ne "" -and $metadata.Title -eq "") {
                    $metadata.Title = $line.Trim() -replace '`', ''
                }
                elseif ($currentSection -eq "Labels" -and $line.Trim() -ne "" -and $metadata.Labels.Count -eq 0) {
                    $labelsText = $line.Trim() -replace '`', ''
                    $metadata.Labels = $labelsText -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
                }
                elseif ($currentSection -eq "Milestone" -and $line.Trim() -ne "" -and $metadata.Milestone -eq "") {
                    $metadata.Milestone = $line.Trim()
                }
            }
        }
    }
    
    $metadata.Body = $bodyLines -join "`n"
    return $metadata
}

# Process each file
foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Blue
    
    try {
        $metadata = Extract-IssueMetadata -FilePath $file.FullName
        
        Write-Host "  Title: $($metadata.Title)" -ForegroundColor Yellow
        Write-Host "  Labels: $($metadata.Labels -join ', ')" -ForegroundColor Yellow
        Write-Host "  Milestone: $($metadata.Milestone)" -ForegroundColor Yellow
        
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would create issue" -ForegroundColor Yellow
            continue
        }
        
        # Create temporary file for body
        $tempBodyFile = [System.IO.Path]::GetTempFileName()
        $metadata.Body | Out-File -FilePath $tempBodyFile -Encoding UTF8
        
        # Build GitHub CLI arguments
        $ghArgs = @(
            "issue", "create",
            "--repo", "$REPO_OWNER/$REPO_NAME",
            "--title", $metadata.Title,
            "--body-file", $tempBodyFile
        )
        
        # Add labels individually
        foreach ($label in $metadata.Labels) {
            if ($label.Trim() -ne "") {
                $ghArgs += "--label"
                $ghArgs += $label.Trim()
            }
        }
        
        # Add milestone if present
        if ($metadata.Milestone -and $metadata.Milestone.Trim() -ne "") {
            $ghArgs += "--milestone"
            $ghArgs += $metadata.Milestone.Trim()
        }
        
        Write-Host "  Creating issue..." -ForegroundColor Yellow
        
        # Execute GitHub CLI command
        $result = & gh @ghArgs 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Created successfully" -ForegroundColor Green
            Write-Host "    $result" -ForegroundColor Cyan
        } else {
            Write-Host "  ✗ Failed: $result" -ForegroundColor Red
        }
        
        # Clean up
        if (Test-Path $tempBodyFile) {
            Remove-Item $tempBodyFile -Force
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