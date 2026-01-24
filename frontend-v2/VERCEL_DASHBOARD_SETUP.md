# 🚀 Vercel Dashboard Setup - Step by Step

## ⚠️ IMPORTANT: How to Add Environment Variables

Environment variables MUST be added in the Vercel Dashboard, not in `vercel.json`. Follow these exact steps:

---

## Step 1: Import Your Project

1. Go to https://vercel.com/new
2. Click **"Import Project"** or **"Add New..."** → **"Project"**
3. Select your Git provider (GitHub/GitLab/Bitbucket)
4. Find your `attendance-management-system` repository
5. Click **"Import"**

---

## Step 2: Configure Build Settings

On the "Configure Project" screen:

### Root Directory
```
frontend-v2
```
**IMPORTANT**: Click the **"Edit"** button next to "Root Directory" and type `frontend-v2`

### Framework Preset
```
Next.js
```
Should be auto-detected ✅

### Build Command
```
npm run build
```
Should be auto-filled ✅

### Output Directory
```
.next
```
Should be auto-filled ✅

### Install Command
```
npm install
```
Should be auto-filled ✅

---

## Step 3: Add Environment Variables

**DO NOT CLICK DEPLOY YET!**

Scroll down to the **"Environment Variables"** section.

### Add Variable 1: NEXT_PUBLIC_API_URL

1. Click **"Add"** or the **"+"** button
2. Fill in:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://api-rvnxjp7idq-ew.a.run.app/v1`
   - **Environment**: Check all boxes (Production, Preview, Development)
3. Click **"Add"** or **"Save"**

### Add Variable 2: API_URL

1. Click **"Add"** or the **"+"** button again
2. Fill in:
   - **Name**: `API_URL`
   - **Value**: `https://api-rvnxjp7idq-ew.a.run.app/v1`
   - **Environment**: Check all boxes (Production, Preview, Development)
3. Click **"Add"** or **"Save"**

### Add Variable 3: NEXTAUTH_SECRET

1. Click **"Add"** or the **"+"** button again
2. Fill in:
   - **Name**: `NEXTAUTH_SECRET`
   - **Value**: `ZvPH5/ZOS7vPAKceGo7GwDwnqboF3/9KwaDKV7HnFc0=`
   - **Environment**: Check all boxes (Production, Preview, Development)
3. Click **"Add"** or **"Save"**

### Add Variable 4: NEXTAUTH_URL (Temporary)

1. Click **"Add"** or the **"+"** button again
2. Fill in:
   - **Name**: `NEXTAUTH_URL`
   - **Value**: `https://attendance-x.vercel.app` (temporary placeholder)
   - **Environment**: Check **Production** only
3. Click **"Add"** or **"Save"**

**Note**: You'll update this with your actual Vercel URL after deployment.

---

## Step 4: Deploy!

1. Verify all 4 environment variables are added
2. Click the **"Deploy"** button
3. Wait for the build to complete (2-5 minutes)
4. ✅ Your site will be live!

---

## Step 5: Update NEXTAUTH_URL

After your first deployment:

1. **Copy your Vercel URL** from the deployment success screen
   - Example: `https://attendance-x-abc123.vercel.app`
   
2. **Go to Project Settings**:
   - Click on your project name
   - Click **"Settings"** tab
   - Click **"Environment Variables"** in the left sidebar

3. **Find NEXTAUTH_URL**:
   - Locate the `NEXTAUTH_URL` variable
   - Click the **"⋮"** (three dots) menu
   - Click **"Edit"**

4. **Update the value**:
   - Replace `https://attendance-x.vercel.app` with your actual URL
   - Click **"Save"**

5. **Redeploy**:
   - Go to **"Deployments"** tab
   - Find the latest deployment
   - Click the **"⋮"** (three dots) menu
   - Click **"Redeploy"**
   - Confirm the redeployment

---

## Step 6: Verify Deployment

Visit your Vercel URL and test:

### ✅ Homepage Test
- [ ] Page loads without errors
- [ ] Pricing section displays 4 plans
- [ ] Toggle Monthly/Yearly works
- [ ] Language selector works (EN, FR, ES, DE)

### ✅ Pricing Page Test
- [ ] Visit `/pricing`
- [ ] Page loads without authentication
- [ ] All plans display correctly

### ✅ Authentication Test
- [ ] Visit `/auth/login`
- [ ] Login form displays
- [ ] Visit `/auth/register`
- [ ] Registration form displays

### ✅ API Connection Test
- [ ] Open browser console (F12)
- [ ] Go to Network tab
- [ ] Refresh homepage
- [ ] Look for API call to `/public/plans`
- [ ] Verify 200 OK response
- [ ] No CORS errors

---

## 🎉 Success!

Your frontend is now deployed and live on Vercel!

---

## 📸 Visual Guide

### Where to Find Environment Variables

```
Vercel Dashboard
  └─ Your Project
      └─ Settings (tab)
          └─ Environment Variables (sidebar)
              └─ Add Variable button
```

### What Your Environment Variables Should Look Like

```
┌─────────────────────────────────────────────────────────────┐
│ Environment Variables                                       │
├─────────────────────────────────────────────────────────────┤
│ NEXT_PUBLIC_API_URL                                         │
│ https://api-rvnxjp7idq-ew.a.run.app/v1                     │
│ Production, Preview, Development                            │
├─────────────────────────────────────────────────────────────┤
│ API_URL                                                     │
│ https://api-rvnxjp7idq-ew.a.run.app/v1                     │
│ Production, Preview, Development                            │
├─────────────────────────────────────────────────────────────┤
│ NEXTAUTH_SECRET                                             │
│ ZvPH5/ZOS7vPAKceGo7GwDwnqboF3/9KwaDKV7HnFc0=               │
│ Production, Preview, Development                            │
├─────────────────────────────────────────────────────────────┤
│ NEXTAUTH_URL                                                │
│ https://your-actual-url.vercel.app                          │
│ Production                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🆘 Troubleshooting

### Error: "Environment Variable references Secret"
**Solution**: Don't use `@secret_name` syntax. Add variables directly in the dashboard as shown above.

### Error: "Build Failed"
**Solution**: Check build logs. The build is configured to ignore TypeScript errors, so look for actual runtime errors.

### Error: "Pricing doesn't load"
**Solution**: Verify `NEXT_PUBLIC_API_URL` is set correctly and backend API is accessible.

### Error: "Authentication fails"
**Solution**: Verify `NEXTAUTH_URL` matches your actual Vercel URL exactly.

---

## 📞 Need Help?

- **Vercel Support**: https://vercel.com/support
- **Documentation**: See `DEPLOY_NOW.md` for more details
- **Environment Variables**: See `ENV_VARS_QUICK_COPY.txt` for quick reference

---

**Ready to deploy? Follow the steps above and you'll be live in minutes! 🚀**
