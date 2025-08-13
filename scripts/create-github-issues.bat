@echo off
setlocal enabledelayedexpansion

REM Script to create GitHub issues from markdown templates
REM Usage: create-github-issues.bat [--dry-run]

REM Configuration
set "REPO_OWNER=SteveRuben"
set "REPO_NAME=attendanceX"
set "ISSUES_DIR=github-issues"

echo.
echo ========================================
echo    GitHub Issues Creator (Windows)
echo ========================================
echo.

REM Check if GitHub CLI is installed
gh --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: GitHub CLI (gh) is not installed.
    echo Please install it from: https://cli.github.com/
    echo.
    pause
    exit /b 1
)

REM Check if user is authenticated
gh auth status >nul 2>&1
if errorlevel 1 (
    echo ERROR: Not authenticated with GitHub CLI.
    echo Please run: gh auth login
    echo.
    pause
    exit /b 1
)

REM Parse arguments
set "DRY_RUN=false"
if "%1"=="--dry-run" set "DRY_RUN=true"
if "%1"=="-h" goto :help
if "%1"=="--help" goto :help

if "%DRY_RUN%"=="true" (
    echo Running in DRY RUN mode - no issues will be created
    echo.
)

REM Check if issues directory exists
if not exist "%ISSUES_DIR%" (
    echo ERROR: Issues directory '%ISSUES_DIR%' not found
    pause
    exit /b 1
)

REM Count markdown files
set "FILE_COUNT=0"
for %%f in ("%ISSUES_DIR%\*.md") do (
    set /a FILE_COUNT+=1
)

if %FILE_COUNT%==0 (
    echo No issue files found in %ISSUES_DIR%
    pause
    exit /b 0
)

echo Found %FILE_COUNT% issue files in %ISSUES_DIR%:
for %%f in ("%ISSUES_DIR%\*.md") do (
    echo   %%f
)
echo.

REM Confirm before proceeding (unless dry run)
if "%DRY_RUN%"=="false" (
    set /p "CONFIRM=Do you want to create these issues? (y/N): "
    if /i not "!CONFIRM!"=="y" (
        echo Cancelled.
        pause
        exit /b 0
    )
    echo.
)

REM Process each markdown file
for %%f in ("%ISSUES_DIR%\*.md") do (
    call :create_issue "%%f"
)

if "%DRY_RUN%"=="false" (
    echo.
    echo All issues created successfully!
    echo View issues at: https://github.com/%REPO_OWNER%/%REPO_NAME%/issues
) else (
    echo.
    echo Dry run completed. Use without --dry-run to create actual issues.
)

echo.
pause
exit /b 0

:create_issue
set "FILE=%~1"
echo Processing: %FILE%

REM Simple extraction - get title from file
set "TITLE="
set "BODY_FILE=%TEMP%\gh_issue_body_%RANDOM%.txt"

REM Extract title (look for line after "Issue Title")
set "FOUND_TITLE=false"
for /f "usebackq delims=" %%a in ("%FILE%") do (
    set "LINE=%%a"
    if "!FOUND_TITLE!"=="true" (
        if not "!LINE!"=="" (
            if not "!LINE:~0,2!"=="##" (
                set "TITLE=!LINE!"
                set "TITLE=!TITLE:`=!"
                set "FOUND_TITLE=false"
            )
        )
    )
    if "!LINE!"=="## Issue Title" set "FOUND_TITLE=true"
)

REM Create body file (everything after "Issue Body")
set "FOUND_BODY=false"
for /f "usebackq delims=" %%a in ("%FILE%") do (
    set "LINE=%%a"
    if "!FOUND_BODY!"=="true" (
        if not "!LINE!"=="## Issue Body" (
            echo !LINE! >> "%BODY_FILE%"
        )
    )
    if "!LINE!"=="## Issue Body" set "FOUND_BODY=true"
)

echo   Title: !TITLE!

if "%DRY_RUN%"=="true" (
    echo   [DRY RUN] Would create issue with above details
    goto :cleanup
)

REM Create the GitHub issue
echo   Creating issue...

gh issue create --repo %REPO_OWNER%/%REPO_NAME% --title "!TITLE!" --body-file "%BODY_FILE%"
if errorlevel 1 (
    echo   ERROR: Failed to create issue
) else (
    echo   SUCCESS: Issue created successfully
)

:cleanup
REM Clean up temporary files
if exist "%BODY_FILE%" del "%BODY_FILE%"
echo.
goto :eof

:help
echo Usage: %0 [--dry-run]
echo.
echo Options:
echo   --dry-run    Show what would be created without actually creating issues
echo   -h, --help   Show this help message
echo.
echo Before running this script:
echo 1. Install GitHub CLI from https://cli.github.com/
echo 2. Run 'gh auth login' to authenticate
echo 3. Update REPO_OWNER and REPO_NAME variables in this script
echo 4. Place your issue markdown files in the %ISSUES_DIR% directory
echo.
pause
exit /b 0