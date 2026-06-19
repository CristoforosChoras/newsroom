# GA4 KPI Dashboard

Accurate, GA4-Reports-matching KPIs across all network portals, feeding both the
dashboard (`/`) and the KPI report (`/reports` → KPI tab) from **one** data layer.
For the accuracy method + reconciliation, see [KPI-ACCURACY.md](./KPI-ACCURACY.md).

## Architecture
```
n8n "KPI Agent (MATRIX)"  ── hourly + Kick webhook ──►  GA4 Data API (service account)
   data-driven Config (site × window × queryType)            │
   → single GA4 runReport node → Build Payload               ▼
   → Save KPI (matrix_kpi data table, append-only)     totals / series / acquisition
                          │                              / top pages / top landing
                          ▼
   n8n "KPI API (MATRIX)"  ◄── POST /webhook/matrix-kpi (x-matrix-secret)
                          │     returns the NEWEST snapshot (full payload)
                          ▼
   matrix-newsroom /api/agents/kpi  →  store.runKPI  →  Dashboard + Reports KPI tab
```
- Dashboard reads the **stored snapshot** (not the live GA4 API on every load) →
  consistent numbers + protects the Data API quota.
- One snapshot powers both surfaces, so they never disagree.

## Properties
| Site | GA4 property ID | WordPress |
|------|-----------------|-----------|
| sportal | 343317259 | sportal.gr |
| outsidersbet | 382629420 | outsidersbet.gr |
| onlyauto | 531541456 | onlyauto.gr |
| exodos | 382621626 | exodos.com.gr |
| klik | 516920776 | klik.gr |
| muse | 521136752 | muse.gr |

(Edit the `GA4` map in the KPI Agent's **Config** node to add/remove a property.)

## Service account
- n8n credential **"GA4 (KPI service account)"** (`googleApi`, id `U0x6wWkJuyS9yHCo`),
  granted **Viewer** on each GA4 property, scope `analytics.readonly`.
- To add a property: grant this service account access in GA4 Admin → Property Access
  Management, then add its id to the Config node.

## Metric set (engagement + key events)
`activeUsers, newUsers, sessions, engagedSessions, engagementRate,
userEngagementDuration (→ avg engagement time), screenPageViews, keyEvents
(→ conversion rate)`. No revenue (not tracked).

**To change the metric set:** edit the `METRICS` array in the KPI Agent **Config**
node (totals query) and the mapping in **Build Payload**; then extend `KpiMetrics`
in `src/lib/types.ts` and the scorecard `tiles` in `Dashboard.tsx`.

## Windows & cadence
- Preset windows: `today`, `7d`, `28d` (each with its previous period for deltas).
  See window bounds in [KPI-ACCURACY.md](./KPI-ACCURACY.md).
- **Hourly** schedule (n8n) + a manual **Kick** (`POST /webhook/matrix-kpi-run`). Each
  run re-queries the windows, so the trailing ~3 days settle to the GA4 UI numbers.
- Finality: today/yesterday = **Preliminary**; older days = **Final** (per-day badges).

## How the KPI report consumes the data
Same store, same snapshot: `runKPI` writes `siteKpi` + `network` + `kpiMeta`
(freshness + flags) and pushes a `kpi` Report whose `kpi.siteKpi` carries the enriched
`byWindow` data. The Reports KPI tab renders the 7d window (Users/Sessions/Views/
Conversions + Δ) with a **Preliminary** badge. The dashboard adds the window picker,
all 8 scorecards, acquisition, top pages/landing, and the freshness/sampling banners.

## Env vars
- **matrix-newsroom:** `N8N_KPI_WEBHOOK_URL` (the `matrix-kpi` webhook),
  `N8N_SEO_SECRET` (shared `x-matrix-secret`). No GA4 key in the app — GA4 access lives
  in the n8n credential.
- **Reconciliation script only:** `GA4_SA_KEY_JSON` (raw JSON or path) — used by
  `scripts/ga4-reconcile.mjs` to query GA4 directly for verification.

## Storage
n8n data table **`matrix_kpi`** (`JfWELovwdmEdkGj2`), columns `generated_at` (number),
`payload_json` (string) — append-only (one row per run; the API serves the newest).
Finality/flags live **inside** the payload (the data-table schema is immutable via API).
Reset: clear the table; the next run rebuilds it.

## Out of scope (v2)
Realtime "active users (last 30 min)" strip; arbitrary custom date ranges; revenue
metrics; fixing the WP article counts.
