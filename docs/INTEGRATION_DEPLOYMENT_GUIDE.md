# Integration Hub Deployment Guide

This guide covers deploying the Integration Hub for production use. The platform uses a **single set of OAuth credentials** that enables all customers across all tenants to connect their accounts via OAuth consent flow.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Your SaaS Platform                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  Tenant A   │  │  Tenant B   │  │  Tenant C   │   ...           │
│  │  (Customer) │  │  (Customer) │  │  (Customer) │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          ▼                                          │
│              ┌───────────────────────┐                              │
│              │   Integration Hub     │                              │
│              │  (Single OAuth App)   │                              │
│              └───────────┬───────────┘                              │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐       ┌─────────┐        ┌─────────┐
   │  GitHub │       │  Slack  │        │  Okta   │  ...
   └─────────┘       └─────────┘        └─────────┘
```

**Key Concept**: You register ONE OAuth application per provider. When any customer clicks "Connect", they authorize YOUR app to access THEIR data. Each customer's tokens are stored separately and associated with their tenant.

---

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [OAuth App Registration](#2-oauth-app-registration)
   - [GitHub](#github)
   - [Slack](#slack)
   - [Okta](#okta)
   - [Azure AD / Microsoft](#azure-ad--microsoft)
   - [Google Workspace](#google-workspace)
   - [Atlassian (Jira/Bitbucket)](#atlassian-jirabitbucket)
   - [GitLab](#gitlab)
   - [Asana](#asana)
3. [API Key Integrations](#3-api-key-integrations)
4. [Database Setup](#4-database-setup)
5. [Netlify Deployment](#5-netlify-deployment)
6. [Security Considerations](#6-security-considerations)
7. [Testing Checklist](#7-testing-checklist)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Environment Variables

### Frontend Variables (Vite - Public)

These are embedded in the frontend bundle and are safe to expose:

```env
# OAuth Client IDs (public - safe to expose)
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_SLACK_CLIENT_ID=your_slack_client_id
VITE_OKTA_CLIENT_ID=your_okta_client_id
VITE_OKTA_DOMAIN=your-company.okta.com
VITE_AZURE_AD_CLIENT_ID=your_azure_client_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GITLAB_CLIENT_ID=your_gitlab_client_id
VITE_JIRA_CLIENT_ID=your_atlassian_client_id
VITE_BITBUCKET_CLIENT_ID=your_atlassian_client_id
VITE_ASANA_CLIENT_ID=your_asana_client_id
VITE_GUSTO_CLIENT_ID=your_gusto_client_id
VITE_INTUNE_CLIENT_ID=your_intune_client_id
```

### Backend Variables (Netlify Functions - Secret)

These must be kept secret and are only accessible server-side:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Token Encryption (generate with: openssl rand -hex 32)
TOKEN_ENCRYPTION_KEY=64_character_hex_string_for_aes_256_gcm

# OAuth Client Secrets (NEVER expose these)
GITHUB_CLIENT_SECRET=your_github_secret
SLACK_CLIENT_SECRET=your_slack_secret
OKTA_CLIENT_SECRET=your_okta_secret
AZURE_AD_CLIENT_SECRET=your_azure_secret
GOOGLE_CLIENT_SECRET=your_google_secret
GITLAB_CLIENT_SECRET=your_gitlab_secret
ATLASSIAN_CLIENT_SECRET=your_atlassian_secret
ASANA_CLIENT_SECRET=your_asana_secret
GUSTO_CLIENT_SECRET=your_gusto_secret
```

### Generate Encryption Key

```bash
# Generate a secure 256-bit key for AES-256-GCM
openssl rand -hex 32
# Example output: a1b2c3d4e5f6....(64 characters total)
```

---

## 2. OAuth App Registration

### GitHub

**Portal**: https://github.com/settings/developers

1. Go to **Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:
   - **Application name**: `Lydell Security Compliance Platform`
   - **Homepage URL**: `https://your-app.netlify.app`
   - **Authorization callback URL**: `https://your-app.netlify.app/integrations/callback`
3. After creation, note the **Client ID**
4. Generate a **Client Secret** (save immediately - shown only once)

**Scopes requested** (automatically during OAuth flow):
- `repo` - Repository access
- `read:org` - Organization membership
- `read:user` - User profile
- `admin:org_hook` - Webhook management

**Environment Variables**:
```env
VITE_GITHUB_CLIENT_ID=Iv1.abc123...
GITHUB_CLIENT_SECRET=ghp_xxx...
```

---

### Slack

**Portal**: https://api.slack.com/apps

1. Click **Create New App → From scratch**
2. Name: `Lydell Security Compliance`, select a workspace for development
3. Go to **OAuth & Permissions**:
   - Add redirect URL: `https://your-app.netlify.app/integrations/callback`
   - Add Bot Token Scopes:
     - `users:read` - View users
     - `users:read.email` - View email addresses
     - `channels:read` - View channels
     - `team:read` - View workspace info
     - `usergroups:read` - View user groups
4. Go to **Basic Information** to get Client ID and Client Secret

**Environment Variables**:
```env
VITE_SLACK_CLIENT_ID=123456789.987654321
SLACK_CLIENT_SECRET=abc123...
```

---

### Okta

**Portal**: https://developer.okta.com/ (or your Okta admin console)

1. Go to **Applications → Create App Integration**
2. Select **OIDC - OpenID Connect** and **Web Application**
3. Configure:
   - **App integration name**: `Lydell Security Compliance`
   - **Grant type**: Authorization Code
   - **Sign-in redirect URIs**: `https://your-app.netlify.app/integrations/callback`
   - **Sign-out redirect URIs**: `https://your-app.netlify.app`
4. Under **Assignments**, set to "Allow everyone in your organization to access"

**For Multi-Tenant (Customer Okta Instances)**:

Since customers use their OWN Okta domains, you have two options:

**Option A: Okta Integration Network (OIN) - Recommended for Production**
- Publish your app to the [Okta Integration Network](https://developer.okta.com/docs/guides/submit-app/)
- Customers install from their Okta dashboard
- Supports any customer's Okta domain automatically

**Option B: Manual Configuration per Customer**
- Each customer configures your OAuth app in their Okta admin
- They provide their Okta domain during setup
- Store per-customer Okta domains in the database

**Scopes**:
- `okta.users.read`
- `okta.groups.read`
- `okta.apps.read`
- `okta.logs.read`

**Environment Variables**:
```env
VITE_OKTA_CLIENT_ID=0oa1abc...
VITE_OKTA_DOMAIN=your-dev.okta.com  # Your development Okta for testing
OKTA_CLIENT_SECRET=xxx...
```

---

### Azure AD / Microsoft

**Portal**: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade

1. Click **New registration**
2. Configure:
   - **Name**: `Lydell Security Compliance Platform`
   - **Supported account types**: **Accounts in any organizational directory (Any Azure AD directory - Multitenant)**
   - **Redirect URI**: Web → `https://your-app.netlify.app/integrations/callback`
3. After creation:
   - Note the **Application (client) ID**
   - Go to **Certificates & secrets → New client secret**
4. Go to **API permissions → Add a permission → Microsoft Graph**:
   - `User.Read.All` (Delegated)
   - `Group.Read.All` (Delegated)
   - `AuditLog.Read.All` (Delegated)
   - `Directory.Read.All` (Delegated)

**Important**: Multi-tenant apps work across ANY Azure AD organization. Customers consent when they OAuth, granting access to their tenant.

**Environment Variables**:
```env
VITE_AZURE_AD_CLIENT_ID=12345678-abcd-...
AZURE_AD_CLIENT_SECRET=xxx...
```

---

### Google Workspace

**Portal**: https://console.cloud.google.com/apis/credentials

1. Create a new project or select existing
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
3. Configure consent screen first if prompted:
   - User Type: **External** (allows any Google Workspace customer)
   - Add scopes: `admin.directory.user.readonly`, `admin.directory.group.readonly`
4. Create OAuth Client:
   - Application type: **Web application**
   - Authorized redirect URIs: `https://your-app.netlify.app/integrations/callback`
5. Enable required APIs:
   - Admin SDK API
   - Google Workspace Admin SDK

**Verification**: For production, submit for Google OAuth verification to remove the "unverified app" warning.

**Environment Variables**:
```env
VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx...
```

---

### Atlassian (Jira/Bitbucket)

**Portal**: https://developer.atlassian.com/console/myapps/

1. Click **Create → OAuth 2.0 integration**
2. Name: `Lydell Security Compliance`
3. Configure:
   - **Callback URL**: `https://your-app.netlify.app/integrations/callback`
4. Go to **Permissions** and add:
   - **Jira API**: `read:jira-work`, `read:jira-user`
   - **Confluence API** (optional): `read:confluence-content.all`
   - **Bitbucket**: `repository`, `pullrequest`
5. Go to **Settings** to get Client ID and Secret

**Note**: One Atlassian app works for both Jira and Bitbucket.

**Environment Variables**:
```env
VITE_JIRA_CLIENT_ID=abc123...
VITE_BITBUCKET_CLIENT_ID=abc123...  # Same as Jira
ATLASSIAN_CLIENT_SECRET=xxx...
```

---

### GitLab

**Portal**: https://gitlab.com/-/profile/applications (or self-hosted: `/admin/applications`)

1. Click **Add new application**
2. Configure:
   - **Name**: `Lydell Security Compliance`
   - **Redirect URI**: `https://your-app.netlify.app/integrations/callback`
   - **Confidential**: Yes
   - **Scopes**: `api`, `read_user`, `read_repository`
3. Save and note credentials

**For GitLab Self-Hosted Customers**: They'll need to add your OAuth app to their instance, or you can support instance URL input during connection.

**Environment Variables**:
```env
VITE_GITLAB_CLIENT_ID=abc123...
GITLAB_CLIENT_SECRET=xxx...
```

---

### Asana

**Portal**: https://app.asana.com/0/developer-console

1. Click **Create new app**
2. Configure:
   - **App name**: `Lydell Security Compliance`
   - **Redirect URL**: `https://your-app.netlify.app/integrations/callback`
3. Note the Client ID and Client Secret

**Environment Variables**:
```env
VITE_ASANA_CLIENT_ID=123456789...
ASANA_CLIENT_SECRET=xxx...
```

---

## 3. API Key Integrations

These integrations use API keys instead of OAuth. Customers generate keys in their own accounts.

| Provider | Where to Generate | Required Permissions |
|----------|------------------|---------------------|
| **CrowdStrike** | Falcon Console → Support & Resources → API Clients | Read: Hosts, Detections, Spotlight |
| **Snyk** | Account Settings → Auth Token | Org member access |
| **Jamf Pro** | Settings → System → API Roles & Clients | Read Computer, Read Mobile Device |
| **Kandji** | Settings → Access → API Token | Devices read scope |
| **BambooHR** | Account → API Keys | Employee read access |
| **Rippling** | Settings → API Access | Read employees, devices |

No server-side configuration needed for API key integrations - customers provide their own keys.

---

## 4. Database Setup

Run the migration to add required tables:

```bash
# Using Supabase CLI
supabase db push

# Or run manually in Supabase SQL editor:
# Copy contents of supabase/migrations/20260119000001_integration_operationalization.sql
```

The migration creates:
- `webhook_events` table for webhook processing
- Auth tag columns for AES-256-GCM encryption
- Sync scheduling functions and triggers
- RLS policies for multi-tenant security

---

## 5. Netlify Deployment

### Set Environment Variables

In Netlify Dashboard → Site settings → Environment variables:

**Build Variables** (available at build time):
```
VITE_GITHUB_CLIENT_ID
VITE_SLACK_CLIENT_ID
VITE_OKTA_CLIENT_ID
VITE_OKTA_DOMAIN
VITE_AZURE_AD_CLIENT_ID
VITE_GOOGLE_CLIENT_ID
VITE_GITLAB_CLIENT_ID
VITE_JIRA_CLIENT_ID
VITE_BITBUCKET_CLIENT_ID
VITE_ASANA_CLIENT_ID
```

**Function Variables** (runtime secrets):
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
TOKEN_ENCRYPTION_KEY
GITHUB_CLIENT_SECRET
SLACK_CLIENT_SECRET
OKTA_CLIENT_SECRET
AZURE_AD_CLIENT_SECRET
GOOGLE_CLIENT_SECRET
GITLAB_CLIENT_SECRET
ATLASSIAN_CLIENT_SECRET
ASANA_CLIENT_SECRET
```

### Verify Scheduled Functions

After deployment, check that scheduled functions are registered:

```
Netlify Dashboard → Functions → integration-scheduler (*/15 * * * *)
Netlify Dashboard → Functions → integration-health-check (0 */6 * * *)
```

### Update OAuth Redirect URIs

After getting your production Netlify URL, update ALL OAuth apps with:
```
https://your-production-url.netlify.app/integrations/callback
```

---

## 6. Security Considerations

### Token Storage

- All OAuth tokens are encrypted with AES-256-GCM before storage
- Auth tags ensure integrity verification on decryption
- Encryption key must be exactly 64 hex characters (256 bits)

### Multi-Tenant Isolation

- Row Level Security (RLS) ensures tenants only see their own connections
- Each connection is tied to a `tenant_id`
- Service role bypasses RLS for background sync operations

### Webhook Security

- GitHub: HMAC-SHA256 signature verification
- Slack: v0 signature with timestamp validation (prevents replay attacks)
- Okta: Verification challenge support
- All webhooks deduplicated via idempotency keys

### Secrets Management

- Never commit secrets to git
- Use Netlify environment variables for all secrets
- Rotate `TOKEN_ENCRYPTION_KEY` requires re-encrypting all stored tokens

---

## 7. Testing Checklist

### Per-Provider OAuth Test

For each OAuth provider:

- [ ] Click "Connect" in Integration Hub
- [ ] Verify redirect to correct OAuth URL
- [ ] Complete OAuth flow with test account
- [ ] Verify redirect back to `/integrations/callback`
- [ ] Confirm connection shows as "Connected"
- [ ] Trigger manual sync
- [ ] Verify data appears in Integration Hub

### Background Jobs Test

- [ ] Wait 15 minutes, check scheduler ran (Netlify Functions logs)
- [ ] Verify `last_sync_at` updated for connected integrations
- [ ] Check health status updates every 6 hours

### Multi-Tenant Test

- [ ] Connect same provider from two different tenant accounts
- [ ] Verify each tenant only sees their own connection
- [ ] Verify sync data is isolated per tenant

### Webhook Test (if applicable)

- [ ] Configure webhook in provider (e.g., GitHub repo webhook)
- [ ] Trigger event (e.g., push to repo)
- [ ] Verify webhook received in `webhook_events` table
- [ ] Verify deduplication works (replay same event)

---

## 8. Troubleshooting

### "OAuth Not Configured" Message

**Cause**: Missing `VITE_*_CLIENT_ID` environment variable

**Fix**: Add the client ID to Netlify environment variables and redeploy

### Invalid Redirect URI Error

**Cause**: OAuth callback URL doesn't match registered redirect URI

**Fix**: Ensure your OAuth app has exactly:
```
https://your-app.netlify.app/integrations/callback
```

### Token Decryption Failures

**Cause**: `TOKEN_ENCRYPTION_KEY` changed or invalid

**Fix**:
- Ensure key is exactly 64 hex characters
- If key changed, existing tokens are invalid - users must reconnect

### Sync Failures

Check Netlify Functions logs for errors:
- `integration-sync` - Individual sync operations
- `integration-scheduler` - Scheduled sync runs
- `integration-health-check` - Health monitoring

Common issues:
- Expired tokens → Check `token_expires_at`, should auto-refresh
- Rate limiting → Check `rate_limit_remaining` in metadata
- Permission denied → User may have revoked access

### Okta Multi-Domain Issues

For customers with their own Okta instances:
- Option 1: Publish to Okta Integration Network
- Option 2: Store customer Okta domain per-connection in database
- Option 3: Prompt for Okta domain during connection setup

---

## Quick Reference: All Environment Variables

```env
# === Frontend (VITE_*) - Public ===
VITE_GITHUB_CLIENT_ID=
VITE_SLACK_CLIENT_ID=
VITE_OKTA_CLIENT_ID=
VITE_OKTA_DOMAIN=
VITE_AZURE_AD_CLIENT_ID=
VITE_GOOGLE_CLIENT_ID=
VITE_GITLAB_CLIENT_ID=
VITE_JIRA_CLIENT_ID=
VITE_BITBUCKET_CLIENT_ID=
VITE_ASANA_CLIENT_ID=
VITE_GUSTO_CLIENT_ID=
VITE_INTUNE_CLIENT_ID=

# === Backend - Secret ===
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
TOKEN_ENCRYPTION_KEY=

# OAuth Secrets
GITHUB_CLIENT_SECRET=
SLACK_CLIENT_SECRET=
OKTA_CLIENT_SECRET=
AZURE_AD_CLIENT_SECRET=
GOOGLE_CLIENT_SECRET=
GITLAB_CLIENT_SECRET=
ATLASSIAN_CLIENT_SECRET=
ASANA_CLIENT_SECRET=
GUSTO_CLIENT_SECRET=
```

---

## Support

For issues with specific integrations, check the provider's documentation:

- GitHub: https://docs.github.com/en/developers/apps/building-oauth-apps
- Slack: https://api.slack.com/authentication/oauth-v2
- Okta: https://developer.okta.com/docs/guides/implement-oauth-for-okta/
- Azure AD: https://docs.microsoft.com/en-us/azure/active-directory/develop/
- Google: https://developers.google.com/identity/protocols/oauth2
- Atlassian: https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/
- GitLab: https://docs.gitlab.com/ee/api/oauth2.html
