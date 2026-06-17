# Deploying the MATRIX frontend to Vercel

MATRIX is a Next.js 16 app — Vercel auto-detects and builds it. The API routes under
`src/app/api/agents/*` run as serverless functions (region **fra1 / Frankfurt**, set in `vercel.json`,
closest to Greece + the EU Railway backend). ~5–10 minutes.

> **Order matters:** deploy the **Social Radar backend to Railway first** (see
> `social-radar/DEPLOY.md`) so you have its URL — you'll paste it here as `SOCIAL_RADAR_URL`.

## 0. Prerequisites
- A Vercel account (vercel.com).
- Either the Vercel CLI (`npm i -g vercel` → `vercel login`) **or** the repo pushed to GitHub.

## 1. Deploy
**Option A — CLI from this folder:**
```bash
cd ~/Desktop/code/matrix-newsroom
vercel            # first run links/creates the project (accept the Next.js defaults)
vercel --prod     # production deploy
```
**Option B — GitHub:** push the repo, then in Vercel: *Add New → Project → import the repo.*
Framework preset = **Next.js** (auto). Build command `next build`, output auto — leave defaults.

## 2. Environment variables (Project → Settings → Environment Variables)
All are **server-side only** (no `NEXT_PUBLIC_` prefix → never shipped to the browser). Add for
**Production** (and Preview if you want PR builds to work):

| Variable | Value |
|---|---|
| `SOCIAL_RADAR_URL` | `https://<your-railway-domain>` (the deployed backend) |
| `N8N_SEO_SECRET` | `mtx_3a81d04cb11f2e5d3c17b4d44315e96c` (shared secret — same on the backend) |
| `N8N_SEO_WEBHOOK_URL` | `https://paotalk.app.n8n.cloud/webhook/matrix-seo-report` |
| `N8N_SEO_RETRO_WEBHOOK_URL` | `https://paotalk.app.n8n.cloud/webhook/matrix-seo-retro` |
| `N8N_TRENDS_WEBHOOK_URL` | `https://paotalk.app.n8n.cloud/webhook/matrix-trends` |

After adding/changing env vars, **redeploy** (Vercel → Deployments → ⋯ → Redeploy, or `vercel --prod`)
so they take effect.

## 3. Verify
- Open the Vercel URL → the dashboard loads.
- **Social Radar / Trends + Content Gap pages** populate (they call `/api/agents/ideas` → your Railway
  backend). If they show "offline", the backend isn't reachable — check `SOCIAL_RADAR_URL` + that the
  Railway service is up (`curl https://<railway-domain>/health`).
- SEO / Retro pages call the n8n webhooks via the `N8N_*` vars.

## Notes
- **Node version** is pinned to 22 via `.nvmrc` (Vercel honors it). Next 16 supports Node 20/22.
- The app stores UI state in the browser (localStorage) — nothing to configure.
- The two backends are independent: **Railway** = Social Radar (trends/gaps), **n8n (paotalk)** = SEO/retro.
- **Custom domain:** Vercel → Settings → Domains.
