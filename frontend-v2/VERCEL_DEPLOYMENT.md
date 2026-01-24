# Deploying Frontend to Vercel

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed: `npm install -g vercel`

## Method 1: Deploy via Vercel CLI (Recommended)

### Step 1: Login to Vercel
```bash
vercel login
```

### Step 2: Navigate to frontend directory
```bash
cd frontend-v2
```

### Step 3: Deploy
```bash
# For production deployment
vercel --prod

# Or for preview deployment
vercel
```

### Step 4: Set Environment Variables
After first deployment, set these environment variables in Vercel dashboard:

1. Go to your project settings on Vercel
2. Navigate to "Environment Variables"
3. Add the following variables:

**Required Variables:**
- `NEXT_PUBLIC_API_URL` = `https://api-rvnxjp7idq-ew.a.run.app/v1`
- `NEXTAUTH_URL` = `https://your-vercel-domain.vercel.app` (your actual Vercel URL)
- `NEXTAUTH_SECRET` = Generate a secure secret: `openssl rand -base64 32`
- `API_URL` = `https://api-rvnxjp7idq-ew.a.run.app/v1`

### Step 5: Redeploy
After setting environment variables, trigger a new deployment:
```bash
vercel --prod
```

## Method 2: Deploy via Vercel Dashboard (Git Integration)

### Step 1: Push to Git
Make sure your code is pushed to GitHub, GitLab, or Bitbucket.

### Step 2: Import Project
1. Go to https://vercel.com/new
2. Click "Import Project"
3. Select your Git repository
4. Choose the `frontend-v2` directory as the root directory

### Step 3: Configure Build Settings
Vercel should auto-detect Next.js. Verify these settings:
- **Framework Preset**: Next.js
- **Root Directory**: `frontend-v2`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Step 4: Add Environment Variables
In the deployment configuration, add:
- `NEXT_PUBLIC_API_URL` = `https://api-rvnxjp7idq-ew.a.run.app/v1`
- `NEXTAUTH_URL` = `https://your-project.vercel.app`
- `NEXTAUTH_SECRET` = (generate with `openssl rand -base64 32`)
- `API_URL` = `https://api-rvnxjp7idq-ew.a.run.app/v1`

### Step 5: Deploy
Click "Deploy" and wait for the build to complete.

## Post-Deployment Steps

### 1. Update NEXTAUTH_URL
After first deployment, update the `NEXTAUTH_URL` environment variable with your actual Vercel URL:
```
NEXTAUTH_URL=https://your-actual-domain.vercel.app
```

### 2. Configure Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` to use your custom domain

### 3. Test the Deployment
Visit your Vercel URL and test:
- ✅ Homepage loads with pricing
- ✅ `/pricing` page is accessible
- ✅ Language selector works
- ✅ Login/Register pages work
- ✅ API calls to backend work

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### API Calls Fail
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings on backend
- Ensure backend API is accessible

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your deployment URL
- Ensure backend authentication endpoints are working

### i18n Issues
- Verify all translation files are in `public/locales/`
- Check `next-i18next.config.js` is properly configured
- Ensure `_app.tsx` has `appWithTranslation` wrapper

## Vercel CLI Commands

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# List deployments
vercel ls

# View logs
vercel logs

# Remove deployment
vercel rm [deployment-url]

# Link to existing project
vercel link

# Pull environment variables
vercel env pull

# Add environment variable
vercel env add
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Public API endpoint | `https://api-rvnxjp7idq-ew.a.run.app/v1` |
| `NEXTAUTH_URL` | Your app URL | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Secret for NextAuth | Generate with `openssl rand -base64 32` |
| `API_URL` | Server-side API endpoint | Same as `NEXT_PUBLIC_API_URL` |

## Performance Optimization

Vercel automatically optimizes:
- ✅ Image optimization
- ✅ Code splitting
- ✅ Edge caching
- ✅ Automatic HTTPS
- ✅ Global CDN

## Monitoring

- View analytics in Vercel dashboard
- Check deployment logs for errors
- Monitor API response times
- Track user sessions

## Support

- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Project Issues: Create an issue in your repository
