@echo off
REM Simple GitHub Issues Creator for Windows
REM Usage: create-github-issues-simple.bat

echo.
echo GitHub Issues Creator (Simple Version)
echo =====================================
echo.

REM Configuration - MODIFY THESE VALUES
set REPO_OWNER=your-username
set REPO_NAME=attendance-management-system
set ISSUES_DIR=github-issues

REM Check GitHub CLI
gh --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: GitHub CLI not installed. Get it from https://cli.github.com/
    pause
    exit /b 1
)

REM Check authentication
gh auth status >nul 2>&1
if errorlevel 1 (
    echo ERROR: Not authenticated. Run: gh auth login
    pause
    exit /b 1
)

REM Check directory
if not exist "%ISSUES_DIR%" (
    echo ERROR: Directory '%ISSUES_DIR%' not found
    pause
    exit /b 1
)

REM List files
echo Found these issue files:
dir /b "%ISSUES_DIR%\*.md"
echo.

REM Confirm
set /p CONFIRM=Create issues? (y/N): 
if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo Creating issues...
echo.

REM Process each file
for %%f in ("%ISSUES_DIR%\*.md") do (
    echo Processing: %%~nxf
    
    REM Create issue with basic title and body
    gh issue create --repo %REPO_OWNER%/%REPO_NAME% --title "[AUTO] %%~nf" --body-file "%%f"
    
    if errorlevel 1 (
        echo   FAILED
    ) else (
        echo   SUCCESS
    )
    echo.
)

echo.
echo Done! Check your issues at:
echo https://github.com/%REPO_OWNER%/%REPO_NAME%/issues
echo.
pause