# PowerShell script to deploy frontend to Vercel
# This script helps automate the Vercel deployment process

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         🚀 AttendanceX - Vercel Deployment Tool          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Function to display environment variables
function Show-EnvVars {
    Write-Host "`n📋 Required Environment Variables:" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "1. NEXT_PUBLIC_API_URL = https://api-rvnxjp7idq-ew.a.run.app/v1" -ForegroundColor White
    Write-Host "2. API_URL             = https://api-rvnxjp7idq-ew.a.run.app/v1" -ForegroundColor White
    Write-Host "3. NEXTAUTH_SECRET     = ZvPH5/ZOS7vPAKceGo7GwDwnqboF3/9KwaDKV7HnFc0=" -ForegroundColor White
    Write-Host "4. NEXTAUTH_URL        = [Your Vercel URL after deployment]" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
}

# Check if Vercel CLI is installed
Write-Host "🔍 Checking Vercel CLI..." -ForegroundColor Cyan
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found." -ForegroundColor Red
    Write-Host "📦 Installing Vercel CLI globally..." -ForegroundColor Yellow
    npm install -g vercel
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Vercel CLI!" -ForegroundColor Red
        Write-Host "Please install manually: npm install -g vercel" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Vercel CLI installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✅ Vercel CLI found!" -ForegroundColor Green
}

# Display deployment options
Write-Host "`n📋 Deployment Options:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "1. 🌐 Deploy via Vercel Dashboard (RECOMMENDED - Easiest)" -ForegroundColor White
Write-Host "2. 💻 Deploy via Vercel CLI (Advanced)" -ForegroundColor White
Write-Host "3. 📖 Show Environment Variables" -ForegroundColor White
Write-Host "4. ❌ Exit" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host "`n🌐 Opening Vercel Dashboard Deployment Guide..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📝 Follow these steps:" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "1. Go to: https://vercel.com/new" -ForegroundColor White
        Write-Host "2. Import your Git repository" -ForegroundColor White
        Write-Host "3. Set Root Directory to: frontend-v2" -ForegroundColor White
        Write-Host "4. Add environment variables (see below)" -ForegroundColor White
        Write-Host "5. Click Deploy!" -ForegroundColor White
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        
        Show-EnvVars
        
        Write-Host "📖 For detailed instructions, see: DEPLOY_NOW.md" -ForegroundColor Cyan
        Write-Host ""
        
        $openBrowser = Read-Host "Open Vercel in browser? (y/n)"
        if ($openBrowser -eq "y") {
            Start-Process "https://vercel.com/new"
        }
    }
    
    "2" {
        Write-Host "`n💻 Starting CLI Deployment..." -ForegroundColor Cyan
        
        # Check if logged in
        Write-Host "`n🔐 Checking Vercel login status..." -ForegroundColor Cyan
        $loginCheck = vercel whoami 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Not logged in to Vercel." -ForegroundColor Red
            Write-Host "🔐 Please login to Vercel..." -ForegroundColor Yellow
            vercel login
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Login failed!" -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "✅ Logged in as: $loginCheck" -ForegroundColor Green
        }
        
        # Install dependencies
        Write-Host "`n📦 Installing dependencies..." -ForegroundColor Cyan
        npm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Dependencies installed!" -ForegroundColor Green
        
        # Build project (optional - Vercel will build)
        Write-Host "`n🔨 Testing build locally..." -ForegroundColor Cyan
        Write-Host "⚠️  Note: Build may show warnings, but deployment will work" -ForegroundColor Yellow
        npm run build
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Local build had issues, but Vercel may still succeed" -ForegroundColor Yellow
            $continue = Read-Host "Continue with deployment? (y/n)"
            if ($continue -ne "y") {
                Write-Host "❌ Deployment cancelled." -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "✅ Build successful!" -ForegroundColor Green
        }
        
        # Deploy
        Write-Host "`n🚀 Deploying to Vercel..." -ForegroundColor Cyan
        Write-Host "Choose deployment type:" -ForegroundColor Yellow
        Write-Host "1. Production (--prod)" -ForegroundColor White
        Write-Host "2. Preview" -ForegroundColor White
        
        $deployChoice = Read-Host "Enter choice (1 or 2)"
        
        if ($deployChoice -eq "1") {
            Write-Host "`n🚀 Deploying to PRODUCTION..." -ForegroundColor Cyan
            vercel --prod
        } else {
            Write-Host "`n🚀 Deploying PREVIEW..." -ForegroundColor Cyan
            vercel
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
            Write-Host ""
            Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "║                    🎉 NEXT STEPS 🎉                       ║" -ForegroundColor Green
            Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
            
            Show-EnvVars
            
            Write-Host "📝 Important:" -ForegroundColor Yellow
            Write-Host "1. Add environment variables in Vercel dashboard" -ForegroundColor White
            Write-Host "2. Update NEXTAUTH_URL with your actual Vercel URL" -ForegroundColor White
            Write-Host "3. Redeploy after setting environment variables" -ForegroundColor White
            Write-Host "4. Test your deployment thoroughly" -ForegroundColor White
            Write-Host ""
            Write-Host "📖 See DEPLOY_NOW.md for detailed instructions" -ForegroundColor Cyan
        } else {
            Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
            Write-Host "Check the error messages above for details." -ForegroundColor Yellow
        }
    }
    
    "3" {
        Show-EnvVars
        Write-Host "📖 For detailed setup instructions, see: VERCEL_ENV_SETUP.md" -ForegroundColor Cyan
    }
    
    "4" {
        Write-Host "`n👋 Goodbye!" -ForegroundColor Cyan
        exit 0
    }
    
    default {
        Write-Host "`n❌ Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
