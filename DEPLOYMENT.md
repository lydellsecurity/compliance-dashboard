# Compliance Engine - Deployment Guide

## Complete Step-by-Step Deployment to Netlify via Git

---

## Prerequisites

- [x] Git installed on your computer
- [x] GitHub account (or GitLab/Bitbucket)
- [x] Netlify account (free tier works)
- [x] Node.js 20+ installed locally
- [x] Anthropic API key for regulatory scanning

---

## Step 1: Create GitHub Repository

### Option A: GitHub Web Interface

1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `compliance-engine`
   - **Description**: `Live Regulatory Update System with AI-powered scanning`
   - **Visibility**: Private (recommended for compliance tools)
3. Click **Create repository**
4. Keep the page open - you'll need the repository URL

### Option B: GitHub CLI

```bash
gh repo create compliance-engine --private --description "Live Regulatory Update System"
```

---

## Step 2: Initialize Local Repository

Open your terminal and run these commands:

```bash
# Navigate to where you extracted the compliance-engine folder
cd ~/Downloads  # or wherever you downloaded the zip

# Unzip if needed
unzip compliance-engine.zip

# Enter the project directory
cd compliance-engine

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Compliance Engine v1.0.0"
```

---

## Step 3: Connect to GitHub

```bash
# Add your GitHub repository as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/compliance-engine.git

# Push to GitHub
git branch -M main
git push -u origin main
```

You should see output like:
```
Enumerating objects: 45, done.
Counting objects: 100% (45/45), done.
Writing objects: 100% (45/45), done.
Total 45 (delta 0), reused 0 (delta 0)
To https://github.com/YOUR_USERNAME/compliance-engine.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

## Step 4: Deploy to Netlify

### 4.1 Connect Repository

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub (if first time)
5. Search for and select `compliance-engine`

### 4.2 Configure Build Settings

Netlify should auto-detect settings from `netlify.toml`, but verify:

| Setting | Value |
|---------|-------|
| **Branch to deploy** | `main` |
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |
| **Functions directory** | `netlify/functions` |

### 4.3 Set Environment Variables

Before deploying, add your API key:

1. Click **"Show advanced"** (or go to Site Settings later)
2. Click **"New variable"**
3. Add:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-your-key-here` |

### 4.4 Deploy

Click **"Deploy site"**

Netlify will:
1. Clone your repository
2. Install dependencies (`npm install`)
3. Build the project (`npm run build`)
4. Deploy to CDN
5. Set up serverless functions

**First deploy takes 2-3 minutes.**

---

## Step 5: Verify Deployment

### 5.1 Check Site

1. Netlify will assign a random URL like `https://random-name-123456.netlify.app`
2. Visit the URL - you should see the Compliance Engine dashboard

### 5.2 Check Functions

Visit: `https://your-site.netlify.app/api/regulatory-scan`

You should see a JSON response (may take 30-60 seconds on first call):
```json
{
  "success": true,
  "scannedAt": "2026-01-13T...",
  "summary": {
    "sourcesScanned": 3,
    "totalChangesDetected": 2,
    "criticalChanges": 1
  },
  "results": [...]
}
```

### 5.3 Check Scheduled Function

1. Go to **Netlify Dashboard** → **Functions**
2. Click on `regulatory-scan`
3. Verify schedule shows: `0 6 * * 1` (Every Monday 6 AM UTC)

---

## Step 6: Custom Domain (Optional)

### 6.1 Add Custom Domain

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter your domain: `compliance.yourdomain.com`

### 6.2 Configure DNS

Add a CNAME record at your DNS provider:

| Type | Name | Value |
|------|------|-------|
| CNAME | compliance | your-site.netlify.app |

### 6.3 Enable HTTPS

1. In Domain management, click **"Verify DNS configuration"**
2. Once verified, click **"Provision certificate"**
3. Netlify auto-provisions and renews Let's Encrypt certificates

---

## Step 7: Ongoing Updates

### Make Changes Locally

```bash
# Edit files...

# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: Add CCPA 2.0 framework support"

# Push to GitHub
git push origin main
```

Netlify automatically rebuilds and deploys on every push!

### Check Deploy Status

1. Go to **Netlify Dashboard** → **Deploys**
2. Watch real-time build logs
3. Each deploy gets a unique preview URL

---

## Troubleshooting

### Build Fails

**Check build logs in Netlify Dashboard:**

Common issues:
- Missing `package.json` → Ensure it's in root directory
- Node version mismatch → Add `NODE_VERSION = "20"` to netlify.toml
- TypeScript errors → Run `npm run type-check` locally first

### Functions Not Working

1. Check function logs: **Functions** → **regulatory-scan** → **Logs**
2. Verify environment variable is set correctly
3. Test locally with Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev
# Visit http://localhost:8888/api/regulatory-scan
```

### API Key Issues

If you see `ANTHROPIC_API_KEY not configured`:
1. Go to **Site settings** → **Environment variables**
2. Verify the variable exists
3. Redeploy: **Deploys** → **Trigger deploy** → **Deploy site**

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for regulatory scanning |
| `SENDGRID_API_KEY` | No | For email notifications |
| `SLACK_WEBHOOK_URL` | No | For Slack notifications |

---

## Project Structure

```
compliance-engine/
├── index.html              # Entry point
├── package.json            # Dependencies
├── netlify.toml            # Netlify config
├── vite.config.ts          # Build config
├── tailwind.config.js      # Styling
├── tsconfig.json           # TypeScript config
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx            # App entry
│   ├── App.tsx             # Main app with routing
│   ├── index.css           # Global styles
│   ├── types/              # TypeScript interfaces
│   ├── services/           # Business logic
│   ├── components/         # React components
│   └── data/               # Sample data
├── netlify/
│   └── functions/
│       └── regulatory-scan.js  # AI scanning function
└── docs/
    └── ARCHITECTURE.md     # System documentation
```

---

## Quick Reference Commands

```bash
# Local development
npm install
npm run dev           # Start dev server at http://localhost:5173

# Type checking
npm run type-check

# Build for production
npm run build

# Test with Netlify CLI
netlify dev           # Full Netlify environment locally

# Deploy manually (bypasses git)
netlify deploy --prod
```

---

## Next Steps

1. ✅ Deploy complete
2. [ ] Add more framework requirements
3. [ ] Configure email/Slack notifications
4. [ ] Integrate with your existing compliance tools
5. [ ] Set up monitoring for scheduled scans

---

## Support

- Netlify Docs: https://docs.netlify.com
- Anthropic Docs: https://docs.anthropic.com
- Project Issues: Open a GitHub issue

---

**Deployment Complete! 🎉**

Your Compliance Engine is now live with:
- AI-powered regulatory scanning (runs every Monday)
- Real-time compliance drift detection
- 2026-ready (AI Transparency, Quantum Readiness, Zero Trust)
