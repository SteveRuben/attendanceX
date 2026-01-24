# 🚀 Deploy to Vercel - Quick Start Guide

## Prerequisites Check

Before deploying, ensure you have:
- ✅ Vercel account (sign up at https://vercel.com if needed)
- ✅ Git repository pushed to GitHub/GitLab/Bitbucket
- ✅ Backend API running at: `https://api-rvnxjp7idq-ew.a.run.app/v1`

## Option 1: Deploy via Vercel Dashboard (RECOMMENDED - Easiest)

### Step 1: Go to Vercel
1. Visit https://vercel.com/new
2. Sign in with your GitHub/GitLab/Bitbucket account

### Step 2: Import Your Repository
1. Click **"Import Project"** or **"Add New..."** → **"Project"**
2. Select your Git provider (GitHub/GitLab/Bitbucket)
3. Find and select your `attendance-management-system` repository
4. Click **"Import"**

### Step 3: Configure Project Settings
1. **Root Directory**: Set to `frontend-v2` (IMPORTANT!)
2. **Framework Preset**: Should auto-detect as "Next.js" ✅
3. **Build Command**: `npm run build` (should be auto-filled)
4. **Output Directory**: `.next` (should be auto-filled)
5. **Install Command**: `npm install` (should be auto-filled)

### Step 4: Add Environment Variables (CRITICAL!)

**⚠️ IMPORTANT**: Environment variables must be added in the Vercel Dashboard during setup.

Click **"Environment Variables"** section and add these 4 variables:

#### Variable 1: NEXT_PUBLIC_API_URL
- **Name**: `NEXT_PUBLIC_API_URL`
- **Value**: `https://api-rvnxjp7idq-ew.a.run.app/v1`
- **Environment**: Check all boxes (Production, Preview, Development)

#### Variable 2: API_URL
- **Name**: `API_URL`
- **Value**: `https://api-rvnxjp7idq-ew.a.run.app/v1`
- **Environment**: Check all boxes (Production, Preview, Development)

#### Variable 3: NEXTAUTH_SECRET
- **Name**: `NEXTAUTH_SECRET`
- **Value**: `ZvPH5/ZOS7vPAKceGo7GwDwnqboF3/9KwaDKV7HnFc0=`
- **Environment**: Check all boxes (Production, Preview, Development)

#### Variable 4: NEXTAUTH_URL (Temporary)
- **Name**: `NEXTAUTH_URL`
- **Value**: `https://attendance-x.vercel.app` (temporary placeholder)
- **Environment**: Check **Production** only

*Note: You'll update this with your actual Vercel URL after the first deployment*

**📖 For detailed screenshots and step-by-step guide, see `VERCEL_DASHBOARD_SETUP.md`**

### Step 5: Deploy!
1. Click **"Deploy"** button
2. Wait for the build to complete (2-5 minutes)
3. ✅ Your site will be live!

### Step 6: Update NEXTAUTH_URL
1. After deployment, copy your Vercel URL (e.g., `https://attendance-x.vercel.app`)
2. Go to **Project Settings** → **Environment Variables**
3. Find `NEXTAUTH_URL` and click **Edit**
4. Update the value with your actual Vercel URL
5. Click **Save**
6. Go to **Deployments** tab and click **Redeploy** on the latest deployment

---

## Option 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI
```powershell
npm install -g vercel
```

### Step 2: Login to Vercel
```powershell
vercel login
```

### Step 3: Navigate to Frontend Directory
```powershell
cd frontend-v2
```

### Step 4: Deploy
```powershell
# For production deployment
vercel --prod

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No (first time) or Yes (subsequent deploys)
# - What's your project's name? attendance-x (or your preferred name)
# - In which directory is your code located? ./ (current directory)
```

### Step 5: Add Environment Variables via CLI
```powershell
# Add NEXT_PUBLIC_API_URL
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: https://api-rvnxjp7idq-ew.a.run.app/v1

# Add API_URL
vercel env add API_URL production
# When prompted, enter: https://api-rvnxjp7idq-ew.a.run.app/v1

# Add NEXTAUTH_SECRET
vercel env add NEXTAUTH_SECRET production
# When prompted, enter: ZvPH5/ZOS7vPAKceGo7GwDwnqboF3/9KwaDKV7HnFc0=

# Add NEXTAUTH_URL (temporary)
vercel env add NEXTAUTH_URL production
# When prompted, enter: https://your-project.vercel.app
```

### Step 6: Redeploy with Environment Variables
```powershell
vercel --prod
```

### Step 7: Update NEXTAUTH_URL
After deployment, update with your actual URL:
```powershell
vercel env rm NEXTAUTH_URL production
vercel env add NEXTAUTH_URL production
# Enter your actual Vercel URL

# Redeploy
vercel --prod
```

---

## Post-Deployment Verification

### ✅ Test Checklist

Visit your Vercel URL and verify:

1. **Homepage** (`/`)
   - [ ] Page loads without errors
   - [ ] Pricing section displays 4 plans (Free, Starter, Professional, Enterprise)
   - [ ] Toggle between Monthly/Yearly works
   - [ ] Language selector works (EN, FR, ES, DE)
   - [ ] All translations display correctly

2. **Pricing Page** (`/pricing`)
   - [ ] Page loads without authentication
   - [ ] All 4 plans display with correct pricing
   - [ ] FAQ section is visible
   - [ ] CTA buttons work

3. **Authentication Pages**
   - [ ] `/auth/login` - Login form displays
   - [ ] `/auth/register` - Registration form displays
   - [ ] Terms and Privacy links work

4. **API Connection**
   - [ ] Open browser console (F12)
   - [ ] Go to Network tab
   - [ ] Refresh the homepage
   - [ ] Look for API call to `/public/plans`
   - [ ] Verify it returns 200 OK with plan data
   - [ ] No CORS errors

5. **Internationalization**
   - [ ] Change language to French - content updates
   - [ ] Change to Spanish - content updates
   - [ ] Change to German - content updates
   - [ ] Change back to English - content updates

---

## Troubleshooting

### Build Fails with TypeScript Errors
**Solution**: The build is configured to ignore TypeScript errors. If it still fails:
1. Check the build logs in Vercel dashboard
2. Look for actual runtime errors (not type errors)
3. Verify all dependencies are in `package.json`

### Pricing Doesn't Load
**Solution**: 
1. Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel
2. Check that backend API is accessible: https://api-rvnxjp7idq-ew.a.run.app/v1/public/plans
3. Check browser console for errors

### Authentication Fails
**Solution**:
1. Verify `NEXTAUTH_URL` matches your actual Vercel URL
2. Verify `NEXTAUTH_SECRET` is set
3. Check that backend authentication endpoints are working

### CORS Errors
**Solution**:
1. Backend must allow requests from your Vercel domain
2. Check backend CORS configuration
3. Verify API URL is correct

### Language Switching Doesn't Work
**Solution**:
1. Verify all translation files are in `public/locales/`
2. Check browser console for missing translation errors
3. Clear browser cache and try again

---

## Environment Variables Quick Reference

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api-rvnxjp7idq-ew.a.run.app/v1` | Public API endpoint |
| `API_URL` | `https://api-rvnxjp7idq-ew.a.run.app/v1` | Server-side API endpoint |
| `NEXTAUTH_SECRET` | `ZvPH5/ZOS7vPAKceGo7GwDwnqboF3/9KwaDKV7HnFc0=` | NextAuth session secret |
| `NEXTAUTH_URL` | `https://your-actual-url.vercel.app` | Your deployment URL |

---

## Custom Domain (Optional)

After successful deployment, you can add a custom domain:

1. Go to **Project Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `app.yourdomain.com`)
4. Follow DNS configuration instructions
5. Update `NEXTAUTH_URL` to use your custom domain
6. Redeploy

---

## Monitoring and Analytics

Vercel provides built-in monitoring:
- **Analytics**: View page views, performance metrics
- **Logs**: Real-time function logs
- **Deployments**: History of all deployments
- **Speed Insights**: Performance monitoring

Access these from your Vercel dashboard.

---

## Need Help?

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Deployment Guide**: See `VERCEL_DEPLOYMENT.md`
- **Environment Setup**: See `VERCEL_ENV_SETUP.md`

---

## 🎉 Success!

Once deployed and verified, your AttendanceX frontend is live and accessible worldwide via Vercel's global CDN!

**Your deployment URL**: `https://your-project.vercel.app`

Share it with your team and start testing! 🚀
