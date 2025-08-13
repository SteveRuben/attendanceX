# PowerShell script to create GitHub issues from markdown templates
# Usage: .\create-github-issues.ps1 [-DryRun] [-Help]

param(
    [switch]$DryRun,
    [switch]$Help
)

# Configuration
$REPO_OWNER = "SteveRuben"  # Replace with your GitHub username/organization
$REPO_NAME = "attendanceX"  # Replace with your repository name
$ISSUES_DIR = "github-issues"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Show-Help {
    Write-ColorOutput "GitHub Issues Creator (PowerShell)" $Colors.Blue
    Write-ColorOutput "====================================" $Colors.Blue
    Write-Host ""
    Write-Host "Usage: .\create-github-issues.ps1 [-DryRun] [-Help]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -DryRun    Show what would be created without actually creating issues"
    Write-Host "  -Help      Show this help message"
    Write-Host ""
    Write-Host "Prerequisites:"
    Write-Host "1. Install GitHub CLI from https://cli.github.com/"
    Write-Host "2. Run 'gh auth login' to authenticate"
    Write-Host "3. Update REPO_OWNER and REPO_NAME variables in this script"
    Write-Host "4. Place your issue markdown files in the $ISSUES_DIR directory"
    Write-Host ""
    exit 0
}

function Test-Prerequisites {
    # Check if GitHub CLI is installed
    try {
        $null = Get-Command gh -ErrorAction Stop
    }
    catch {
        Write-ColorOutput "ERROR: GitHub CLI (gh) is not installed." $Colors.Red
        Write-Host "Please install it from: https://cli.github.com/"
        exit 1
    }

    # Check if user is authenticated
    try {
        $authStatus = gh auth status 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Not authenticated"
        }
    }
    catch {
        Write-ColorOutput "ERROR: Not authenticated with GitHub CLI." $Colors.Red
        Write-Host "Please run: gh auth login"
        exit 1
    }
}

function Extract-IssueData {
    param([string]$FilePath)
    
    $content = Get-Content $FilePath -Raw
    $lines = Get-Content $FilePath
    
    $issueData = @{
        Title = ""
        Labels = ""
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
                elseif ($currentSection -eq "Title" -and $line.Trim() -ne "" -and $issueData.Title -eq "") {
                    $issueData.Title = $line.Trim() -replace '`', ''
                }
                elseif ($currentSection -eq "Labels" -and $line.Trim() -ne "" -and $issueData.Labels -eq "") {
                    $issueData.Labels = $line.Trim() -replace '`', ''
                }
                elseif ($currentSection -eq "Milestone" -and $line.Trim() -ne "" -and $issueData.Milestone -eq "") {
                    $issueData.Milestone = $line.Trim()
                }
            }
        }
    }
    
    $issueData.Body = $bodyLines -join "`n"
    return $issueData
}

function Create-Issue {
    param(
        [string]$FilePath,
        [bool]$DryRunMode
    )
    
    Write-ColorOutput "Processing: $FilePath" $Colors.Blue
    
    try {
        $issueData = Extract-IssueData -FilePath $FilePath
        
        Write-Host "  Title: $($issueData.Title)" -ForegroundColor $Colors.Yellow
        Write-Host "  Labels: $($issueData.Labels)" -ForegroundColor $Colors.Yellow
        Write-Host "  Milestone: $($issueData.Milestone)" -ForegroundColor $Colors.Yellow
        
        if ($DryRunMode) {
            Write-ColorOutput "  [DRY RUN] Would create issue with above details" $Colors.Yellow
            return $true
        }
        
        # Create temporary file for body content
        $tempBodyFile = [System.IO.Path]::GetTempFileName()
        $issueData.Body | Out-File -FilePath $tempBodyFile -Encoding UTF8
        
        # Build GitHub CLI command
        $ghArgs = @(
            "issue", "create",
            "--repo", "$REPO_OWNER/$REPO_NAME",
            "--title", $issueData.Title,
            "--body-file", $tempBodyFile
        )
        
        # Add labels if specified
        if ($issueData.Labels -and $issueData.Labels.Trim() -ne "") {
            $ghArgs += "--label"
            $ghArgs += $issueData.Labels
        }
        
        # Add milestone if specified
        if ($issueData.Milestone -and $issueData.Milestone.Trim() -ne "") {
            $ghArgs += "--milestone"
            $ghArgs += $issueData.Milestone
        }
        
        Write-Host "  Creating issue..." -ForegroundColor $Colors.Yellow
        
        # Execute GitHub CLI command
        $result = & gh @ghArgs 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  ✓ Issue created successfully" $Colors.Green
            Write-Host "    URL: $result"
            return $true
        }
        else {
            Write-ColorOutput "  ✗ Failed to create issue" $Colors.Red
            Write-Host "    Error: $result" -ForegroundColor $Colors.Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "  ✗ Error processing file: $($_.Exception.Message)" $Colors.Red
        return $false
    }
    finally {
        # Clean up temporary file
        if (Test-Path $tempBodyFile) {
            Remove-Item $tempBodyFile -Force
        }
    }
}

# Main execution
function Main {
    if ($Help) {
        Show-Help
    }
    
    Write-ColorOutput "GitHub Issues Creator (PowerShell)" $Colors.Blue
    Write-ColorOutput "====================================" $Colors.Blue
    Write-Host ""
    
    if ($DryRun) {
        Write-ColorOutput "Running in DRY RUN mode - no issues will be created" $Colors.Yellow
        Write-Host ""
    }
    
    # Test prerequisites
    Test-Prerequisites
    
    # Check if issues directory exists
    if (-not (Test-Path $ISSUES_DIR)) {
        Write-ColorOutput "ERROR: Issues directory '$ISSUES_DIR' not found" $Colors.Red
        exit 1
    }
    
    # Find all markdown files
    $issueFiles = Get-ChildItem -Path $ISSUES_DIR -Filter "*.md" | Sort-Object Name
    
    if ($issueFiles.Count -eq 0) {
        Write-ColorOutput "No issue files found in $ISSUES_DIR" $Colors.Yellow
        exit 0
    }
    
    Write-ColorOutput "Found $($issueFiles.Count) issue files:" $Colors.Green
    foreach ($file in $issueFiles) {
        Write-Host "  $($file.Name)"
    }
    Write-Host ""
    
    # Confirm before proceeding (unless dry run)
    if (-not $DryRun) {
        $confirmation = Read-Host "Do you want to create these issues? (y/N)"
        if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
            Write-Host "Cancelled."
            exit 0
        }
        Write-Host ""
    }
    
    # Process each file
    $successCount = 0
    $totalCount = $issueFiles.Count
    
    foreach ($file in $issueFiles) {
        $success = Create-Issue -FilePath $file.FullName -DryRunMode $DryRun
        if ($success) {
            $successCount++
        }
        Write-Host ""
    }
    
    # Summary
    if ($DryRun) {
        Write-ColorOutput "Dry run completed. Use without -DryRun to create actual issues." $Colors.Yellow
    }
    else {
        Write-ColorOutput "Completed: $successCount/$totalCount issues created successfully!" $Colors.Green
        if ($successCount -gt 0) {
            Write-ColorOutput "View issues at: https://github.com/$REPO_OWNER/$REPO_NAME/issues" $Colors.Blue
        }
    }
}

# Execute main function
Main