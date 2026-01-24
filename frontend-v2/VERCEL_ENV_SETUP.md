# Vercel Environment Variables Setup Guide

## Generated Credentials

Your secure `NEXTAUTH_SECRET` has been generated:
```
ZvPH5/ZOS7vPAKceGo7GwDwnqboF3/9KwaDKV7HnFc0=
```

**⚠️ IMPORTANT: Keep this secret secure! Do not commit it to Git.**

## Step-by-Step Setup

### Method 1: Via Vercel Dashboard (Recommended)

#### Step 1: Access Environment Variables
1. Go to https://vercel.com/dashboard
2. Select your project (or create it first by importing from Git)
3. Click on **Settings** tab
4. Click on **Environment Variables** in the left sidebar

#### Step 2: Add Each Variable

Add these 4 environment variables one by one:

**Variable 1: NEXT_PUBLIC_API_URL**
- **Key**: `NEXT_PUBLIC_API_URL`
- **Value**: `https://api-rvnxjp7idq-ew.a.run.app/v1`
- **Environment**: Select all (Production, Preview, Development)
- Click **Save**

**Variable 2: API_URL**
- **Key**: `API_URL`
- **Value**: `https://api-rvnxjp7idq-ew.a.run.app/v1`
- **Environment**: Select all (Production, Preview, Development)
- Click **Save**

**Variable 3: NEXTAUTH_SECRET**
- **Key**: `NEXTAUTH_SECRET`
- **Value**: `ZvPH5/ZOS7vPAKceGo7GwDwnqboF3/9KwaDKV7HnFc0=`
- **Environment**: Select all (Production, Preview, Development)
- Click **Save**

**Variable 4: NEXTAUTH_URL** (Update after first deployment)
- **Key**: `NEXTAUTH_URL`
- **Value**: `https://your-project-name.vercel.app` (temporary - update after deployment)
- **Environment**: Production only
- Click **Save**

#### Step 3: Deploy
After adding all variables, trigger a new deployment:
- Go to **Deployments** tab
- Click **Redeploy** on the latest deployment
- Or push a new commit to trigger automatic deployment

#### Step 4: Update NEXTAUTH_URL
After your first successful deployment:
1. Copy your actual Vercel URL (e.g., `https://attendance-x.vercel.app`)
2. Go back to **Settings** → **Environment Variables**
3. Find `NEXTAUTH_URL` and click **Edit**
4. Update the value with your actual URL
5. Click **Save**
6. Redeploy the project

---

### Method 2: Via Vercel CLI

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Login
```bash
vercel login
```

#### Step 3: Link Project
```bash
cd frontend-v2
vercel link
```

#### Step 4: Add Environment Variables
```bash
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
# When prompted, enter: https://your-project-name.vercel.app
```

#### Step 5: Deploy
```bash
vercel --prod
```

#### Step 6: Update NEXTAUTH_URL
After deployment, update with your actual URL:
```bash
vercel env rm NEXTAUTH_URL production
vercel env add NEXTAUTH_URL production
# Enter your actual Vercel URL
```

Then redeploy:
```bash
vercel --prod
```

---

## Environment Variables Summary

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api-rvnxjp7idq-ew.a.run.app/v1` | Public API endpoint (accessible in browser) |
| `API_URL` | `https://api-rvnxjp7idq-ew.a.run.app/v1` | Server-side API endpoint |
| `NEXTAUTH_SECRET` | `ZvPH5/ZOS7vPAKceGo7GwDwnqboF3/9KwaDKV7HnFc0=` | Secret for NextAuth.js session encryption |
| `NEXTAUTH_URL` | `https://your-actual-url.vercel.app` | Your deployed application URL |

---

## Verification Checklist

After deployment, verify everything works:

### ✅ Homepage Test
- [ ] Visit your Vercel URL
- [ ] Pricing section loads and displays 4 plans
- [ ] Toggle between monthly/yearly works
- [ ] Language selector works (EN, FR, ES, DE)

### ✅ Pricing Page Test
- [ ] Visit `/pricing` page
- [ ] All 4 plans display correctly
- [ ] FAQ section is visible
- [ ] No authentication required

### ✅ Authentication Test
- [ ] Visit `/auth/login`
- [ ] Login form displays
- [ ] Can attempt login (should connect to backend)

### ✅ API Connection Test
- [ ] Open browser console (F12)
- [ ] Check Network tab
- [ ] Look for API calls to `https://api-rvnxjp7idq-ew.a.run.app/v1`
- [ ] Verify no CORS errors

---

## Troubleshooting

### Issue: Pricing doesn't load
**Solution**: Check that `NEXT_PUBLIC_API_URL` is set correctly and the backend API is accessible.

### Issue: Authentication fails
**Solution**: Verify `NEXTAUTH_URL` matches your actual deployment URL and `NEXTAUTH_SECRET` is set.

### Issue: CORS errors
**Solution**: Ensure your backend API has CORS configured to allow requests from your Vercel domain.

### Issue: Environment variables not working
**Solution**: 
1. Verify variables are set in Vercel dashboard
2. Trigger a new deployment (environment changes require redeployment)
3. Check build logs for any errors

---

## Security Notes

🔒 **NEXTAUTH_SECRET**: This is a sensitive credential. Never commit it to Git or share it publicly.

🔒 **Regenerate if compromised**: If you suspect the secret has been exposed, generate a new one:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

🔒 **Use different secrets**: Use different `NEXTAUTH_SECRET` values for development, preview, and production environments.

---

## Next Steps

1. ✅ Add all environment variables to Vercel
2. ✅ Deploy your project
3. ✅ Update `NEXTAUTH_URL` with actual URL
4. ✅ Redeploy
5. ✅ Test all functionality
6. 🎉 Your app is live!

---

## Quick Copy-Paste for Vercel Dashboard

```
Variable 1:
Key: NEXT_PUBLIC_API_URL
Value: https://api-rvnxjp7idq-ew.a.run.app/v1

Variable 2:
Key: API_URL
Value: https://api-rvnxjp7idq-ew.a.run.app/v1

Variable 3:
Key: NEXTAUTH_SECRET
Value: ZvPH5/ZOS7vPAKceGo7GwDwnqboF3/9KwaDKV7HnFc0=

Variable 4:
Key: NEXTAUTH_URL
Value: [Your Vercel URL after first deployment]
```

---

Need help? Check the main deployment guide in `VERCEL_DEPLOYMENT.md`
