# Deploy Mandi Sahayak with Neon and Vercel

Farmers use the website in a browser. They do not install or manage a database:
the Vercel API connects to a managed PostgreSQL database hosted by Neon.

## 1. Create the Neon database

1. Create a Neon project and PostgreSQL database.
2. Copy both connection strings from the Neon dashboard:
   - **Direct** connection string for applying migrations and importing reference
     data.
   - **Pooled** connection string for the running API. It uses Neon's pooler
     hostname and is suitable for serverless functions.
3. Keep both connection strings private. Do not commit them or paste them into
   source files.

## 2. Initialize the schema and reference data

Use Node.js 22.18 or newer and the direct Neon connection string. In PowerShell,
from the repository root:

```powershell
$env:DATABASE_URL = Read-Host "Paste the Neon direct connection string"
node server/scripts/provision-database.mjs
Remove-Item Env:DATABASE_URL
```

Provisioning applies the PostgreSQL migrations, creates the bootstrap
administrator, and loads the reference imports. Run it once per Neon database;
the migration ledger makes already-applied migrations safe to skip.

## 3. Configure Vercel

In the Vercel project settings, add these environment variables for Production
(and Preview if that environment has its own Neon database):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `NODE_ENV` | `production` |
| `OTP_PEPPER` | A unique cryptographically random value of at least 16 characters |
| `SESSION_PEPPER` | A different unique random value of at least 16 characters |
| `CSRF_PEPPER` | A third unique random value of at least 16 characters |
| `DEMO_MODE` | `false` |

Generate independent secrets locally without putting them in project files:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Run this command separately for each pepper, then enter each result directly
into Vercel's environment-variable settings. Do not enable `DEMO_MODE` in
production; demo mode exposes development-only OTP functionality and requires a
separate `DEV_TOOLS_TOKEN`.

The Vercel project must build the repository root so that `api/index.js` is
deployed as the API function and the `/api/*` rewrite reaches it. Redeploy after
setting the variables.

## 4. Verify deployment

Open the deployed site's `/api/v1/auth/csrf` endpoint. A successful response
confirms the API function and database-backed application are reachable. Then
load the site and check the browser console for API errors.

For local development, start both services from the repository root:

```powershell
npm run dev
```

The local API still needs a PostgreSQL database; `npm run dev:web` starts only
the frontend. To point the local frontend at a deployed API instead, set
`VITE_API_PROXY_TARGET` to the deployed site's origin before starting Vite.
