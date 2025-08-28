# Safe PowerShell script that handles missing milestones
param(
    [switch]$DryRun
)

# Configuration
$REPO_OWNER = "SteveRuben"
$REPO_NAME = "attendanceX"
$ISSUES_DIR = "github-issues"

Write-Host "GitHub Issues Creator (Safe)" -ForegroundColor Blue
Write-Host "============================" -ForegroundColor Blue
Write-Host ""

# Check GitHub CLI and auth
try {
    gh --version | Out-Null
    gh auth status 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Host "ERROR: GitHub CLI not installed or not authenticated" -ForegroundColor Red
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
    if ($confirm -ne 'y') { exit 0 }
    Write-Host ""
}

# Function to extract metadata
function Extract-Metadata {
    param([string]$FilePath)
    
    $lines = Get-Content $FilePath
    $title = ""
    $labels = @()
    $milestone = ""
    $bodyStarted = $false
    $bodyLines = @()
    
    for ($i = 0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        
        if ($line -eq "## Issue Title" -and $i + 1 -lt $lines.Length) {
            $title = $lines[$i + 1].Trim() -replace '`', ''
        }
        elseif ($line -eq "## Labels" -and $i + 1 -lt $lines.Length) {
            $labelsText = $lines[$i + 1].Trim() -replace '`', ''
            $labels = $labelsText -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
        }
        elseif ($line -eq "## Milestone" -and $i + 1 -lt $lines.Length) {
            $milestone = $lines[$i + 1].Trim()
        }
        elseif ($line -eq "## Issue Body") {
            $bodyStarted = $true
        }
        elseif ($bodyStarted) {
            $bodyLines += $line
        }
    }
    
    return @{
        Title = $title
        Labels = $labels
        Milestone = $milestone
        Body = $bodyLines -join "`n"
    }
}

# Process each file
$successCount = 0

foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Blue
    
    try {
        $metadata = Extract-Metadata -FilePath $file.FullName
        
        Write-Host "  Title: $($metadata.Title)" -ForegroundColor Yellow
        Write-Host "  Labels: $($metadata.Labels -join ', ')" -ForegroundColor Yellow
        Write-Host "  Milestone: $($metadata.Milestone)" -ForegroundColor Yellow
        
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would create issue" -ForegroundColor Yellow
            $successCount++
            continue
        }
        
        # Create body file
        $tempBodyFile = [System.IO.Path]::GetTempFileName()
        $metadata.Body | Out-File -FilePath $tempBodyFile -Encoding UTF8
        
        # Build command
        $ghArgs = @(
            "issue", "create",
            "--repo", "$REPO_OWNER/$REPO_NAME",
            "--title", $metadata.Title,
            "--body-file", $tempBodyFile
        )
        
        # Add labels
        foreach ($label in $metadata.Labels) {
            if ($label.Trim() -ne '') {
                $ghArgs += "--label"
                $ghArgs += $label.Trim()
            }
        }
        
        Write-Host "  Creating issue..." -ForegroundColor Yellow
        
        # Try with milestone first
        $ghArgsWithMilestone = $ghArgs + @("--milestone", $metadata.Milestone)
        $result = & gh @ghArgsWithMilestone 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Created with milestone" -ForegroundColor Green
            Write-Host "    $result" -ForegroundColor Cyan
            $successCount++
        } else {
            # Try without milestone
            Write-Host "  Milestone failed, trying without..." -ForegroundColor Yellow
            $result = & gh @ghArgs 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Created without milestone" -ForegroundColor Yellow
                Write-Host "    $result" -ForegroundColor Cyan
                $successCount++
            } else {
                Write-Host "  ✗ Failed completely: $result" -ForegroundColor Red
            }
        }
        
        Remove-Item $tempBodyFile -Force
        
    } catch {
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "Completed: $successCount/$($files.Count) issues created" -ForegroundColor Green
if ($successCount -gt 0) {
    Write-Host "View issues: https://github.com/$REPO_OWNER/$REPO_NAME/issues" -ForegroundColor Blue
}