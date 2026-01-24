# ⚠️ CRITICAL: Fix Root Directory Error

## The Error You're Seeing

```
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/vercel/package.json'
Error: Command "npm install --prefix=../.." exited with 254
```

## The Problem

Vercel is looking for `package.json` in the wrong location because the **Root Directory** is not set correctly.

## The Solution

You MUST set the Root Directory to `frontend-v2` in Vercel. Here's how:

---

## Method 1: During Initial Import (RECOMMENDED)

### Step 1: Start Fresh
1. Go to https://vercel.com/dashboard
2. If you already imported the project, **DELETE IT** first:
   - Click on the project
   - Go to Settings → General
   - Scroll to bottom → "Delete Project"
   - Confirm deletion

### Step 2: Import Again with Correct Settings
1. Go to https://vercel.com/new
2. Select your Git repository
3. **CRITICAL**: In the "Configure Project" screen:
   - Look for **"Root Directory"** section
   - Click the **"Edit"** button next to it
   - Type: `frontend-v2`
   - Click **"Continue"**

### Step 3: Verify Settings
Before clicking Deploy, verify:
- ✅ Root Directory: `frontend-v2`
- ✅ Framework Preset: Next.js
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `.next`
- ✅ Install Command: `npm install`

### Step 4: Add Environment Variables
Add these 4 environment variables:

```
NEXT_PUBLIC_API_URL = https://api-rvnxjp7idq-ew.a.run.app/v1
API_URL = https://api-rvnxjp7idq-ew.a.run.app/v1
NEXTAUTH_SECRET = ZvPH5/ZOS7vPAKceGo7GwDwnqboF3/9KwaDKV7HnFc0=
NEXTAUTH_URL = https://your-project.vercel.app
```

### Step 5: Deploy
Click **"Deploy"** and it should work!

---

## Method 2: Fix Existing Project

If you already have a project deployed:

### Step 1: Go to Project Settings
1. Go to https://vercel.com/dashboard
2. Click on your project
3. Click **"Settings"** tab

### Step 2: Change Root Directory
1. In the left sidebar, click **"General"**
2. Scroll to **"Root Directory"** section
3. Click **"Edit"**
4. Enter: `frontend-v2`
5. Click **"Save"**

### Step 3: Redeploy
1. Go to **"Deployments"** tab
2. Click **"Redeploy"** on the latest deployment
3. Or push a new commit to trigger deployment

---

## Method 3: Using Vercel CLI

If deploying via CLI:

### Step 1: Remove Existing Link
```powershell
cd frontend-v2
Remove-Item .vercel -Recurse -Force -ErrorAction SilentlyContinue
```

### Step 2: Deploy with Correct Directory
```powershell
# Make sure you're IN the frontend-v2 directory
cd frontend-v2

# Deploy from here (Vercel will use current directory as root)
vercel --prod
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No (or Yes if you want to reuse)
- **What's your project's name?** → attendance-x
- **In which directory is your code located?** → `./` (current directory)

---

## Verification

After setting the root directory correctly, Vercel should:

1. ✅ Find `package.json` in `frontend-v2/package.json`
2. ✅ Run `npm install` successfully
3. ✅ Find `next.config.js`
4. ✅ Build the Next.js app
5. ✅ Deploy successfully

---

## Visual Guide

### ❌ WRONG (Default - causes error)
```
Repository Root
├── backend/
├── frontend-v2/          ← Your Next.js app is here
│   ├── package.json      ← But Vercel is looking in root
│   ├── next.config.js
│   └── ...
└── package.json          ← Vercel tries to use this (wrong!)
```

### ✅ CORRECT (With Root Directory set)
```
Repository Root
├── backend/
└── frontend-v2/          ← Vercel starts here (ROOT DIRECTORY)
    ├── package.json      ← Vercel finds this ✅
    ├── next.config.js    ← Vercel finds this ✅
    └── ...
```

---

## Quick Checklist

Before deploying, verify:

- [ ] Root Directory is set to `frontend-v2` in Vercel dashboard
- [ ] You're deploying from the correct Git repository
- [ ] All 4 environment variables are added
- [ ] Framework is detected as Next.js
- [ ] Build command is `npm run build`

---

## Still Having Issues?

### Check Build Logs
1. Go to your deployment in Vercel
2. Click on the failed deployment
3. Check the build logs
4. Look for the line showing which directory Vercel is using

### Expected Log Output
You should see:
```
Cloning github.com/your-repo/attendance-management-system (Branch: main, Commit: abc123)
Cloning completed: 1.234s
Looking for package.json in the following locations:
  - /vercel/path0/frontend-v2/package.json ✅
```

### Wrong Log Output (Error)
If you see:
```
Looking for package.json in the following locations:
  - /vercel/package.json ❌
```
Then the Root Directory is NOT set correctly!

---

## Alternative: Move Files to Root (Not Recommended)

If you absolutely cannot set the root directory, you could move all files from `frontend-v2/` to the repository root, but this is NOT recommended as it would require restructuring your entire project.

---

## Summary

**The fix is simple**: Set Root Directory to `frontend-v2` in Vercel dashboard.

1. Delete existing project (if any)
2. Import again
3. Set Root Directory to `frontend-v2`
4. Add environment variables
5. Deploy

That's it! 🚀
