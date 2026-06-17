# Social Radar Agent — one engine for trends + content gaps

Social Radar **replaces** the separate Trend Radar + Content Gap agents. One engine discovers
cross-platform demand, decides what's **rising** (trend) *and* what's **in demand but under-covered —
especially with no Greek article** (gap), and serves **ranked content Ideas**, each with a suggested
portal, a format (article/video/post), a Greek angle, and one-click → Story Cell.

**Design law:** adapters/APIs **measure**; the LLM only clusters/names/picks-format/writes the Greek
brief — it never invents a demand number. **No mocks shown to editors:** mock adapters are dev-only
(offline Phase 0); the moment a real source is enabled the engine runs live-only.

## Where it lives
A **standalone, self-contained** TypeScript/Fastify service at `~/Desktop/code/social-radar` (own
`node-cron` scheduler + optional Slack — **n8n is not involved**). The live n8n Trend Radar is left in
place but **idle**; MATRIX now points at this service. Prod needs a 24/7 host (deferred; dev runs local).

## Data flow
```
 cron 08:00 Athens / POST /scan
   → collect (adapters, GR, fail-soft) → normalize → cluster (token-set, under-merge) →
     scoreTrend (z-score velocity vs SQLite baselines, else percentile, × corroboration) →
     analyzeSupply (coverage: WP REST ?search= + sitemap → none/weak/covered) →
     winnability → route (media-profile assignment + format) → rank → ideas (+ LLM naming/brief)
 FE Scan → /api/agents/ideas → service → board (Trends page = type:trend, Gaps page = type:gap)
```

## The Idea (output)
`ideaType: trend | gap | both` makes the merge explicit (rising / underserved / both = jackpot). Each
Idea carries a **sourced** `demandSignal`, `velocity`, a `supply` read (incl. `greekArticleExists`),
`suggestedSites` + `assignmentReason`, `format`, `winnability`, `angleGr`/`briefGr`, and `state`.

## Sources (free-first; paid = Phase 2, flag-gated, mocked until keys)
| Adapter | Source | Cost | Phase |
|---|---|---|---|
| `youtube` | Data API v3 `mostPopular&regionCode=GR` | free (key) | 1 |
| `autocomplete` | Google Suggest (`ie/oe=utf-8`!) | free | 1 |
| `newsVelocity` | GR news RSS | free | 1 |
| `coverage` | WordPress REST `?search=` per site | free | 1 |
| `serp` / `googleTrends` / `tiktok` / `x` / `paa` | DataForSEO/SerpApi + Apify (`vnx0`,`karamelo`,`automation-lab`) | paid | 2 |

## Precision-first pipeline (interest-grounded)
The engine starts from **what our sites cover**, not from global trending:
`seeds → discover → QUALITY FILTER → CLUSTER → SUPPLY → RELEVANCE GATE (assign) → score → rank`.
- **Quality filter** (`pipeline/quality.ts`) drops, before anything: foreign-language fragments, broken
  text, navigational junk, nonsense long-tail, and **context-free bare tokens** (`Argentina`, `Haaland`)
  unless they're a tracked entity.
- **Relevance gate** (`pipeline/route.ts`) scores each candidate against each profile's `seeds`/`keywords`,
  **zeroes it on an `avoids` hit**, and **discards** anything below that profile's `relevanceFloor`. There
  is no `network/other` bucket — if it doesn't map to a beat, it's dropped, never shown.
- **Seeded discovery** (`adapters/autocomplete.ts`) expands each profile's `seeds.queries/entities`, so
  candidates are on-brand from the start. YouTube/Apify are a secondary broad scan, gated the same way.
- **Score = relevance × (demand·velocity·gap·winnability blend)** — relevance is a *multiplicative*
  factor, so on-beat rising gaps dominate and scores vary (no more uniform 50).

## Media profiles = watchlists (the precision fuel)
`social-radar/src/config/sites.ts` holds a `MediaProfile` per portal with **`values`** (editorial
identity), **`seeds`** {entities, topics, queries — the watchlist that drives discovery}, **`avoids`**
(off-brand → instant disqualify), **`relevanceFloor`** (precision dial), and `keywords`. The **6 real
portals** (matching the FE): **sportal** (sports), **outsidersbet** (betting), **onlyauto** (auto),
**exodos** (going-out), **klik** (showbiz), **muse** (lifestyle). **These watchlists are DRAFTED from each
site's visible identity — correct the `seeds`/`values`/`avoids` and the output changes measurably** (e.g.
OnlyAuto `avoids:['μοντέλο μόδας','έγκλημα']` kills the `μοντέλο για φόνο → OnlyAuto` mistake).

## Run it
```bash
cd ~/Desktop/code/social-radar
cp .env.example .env            # set SOCIAL_RADAR_SECRET (= MATRIX N8N_SEO_SECRET)
npm run dev                     # Fastify on :8080 (mock mode until a source is enabled)
npm run scan                    # one-off scan → JSON
```
Enable live free data: `YOUTUBE_ENABLED=true YOUTUBE_API_KEY=… AUTOCOMPLETE_ENABLED=true
COVERAGE_ENABLED=true WP_REST_BASES='{"sportal":"https://www.sportal.gr",…}' STORE=sqlite`.

## API
`POST /scan?scope=&type=&format=&state=` (recompute → ranked ideas) · `GET /ideas?…` (stored, filtered) ·
`POST /ideas/:id/state {state}` · `GET /health`. All guarded by `x-matrix-secret`.

## LIVE status (2026-06-17)
Running on real APIs (keys in `social-radar/.env`): **YouTube** (Data API), **Google Trends + X +
TikTok** (Apify, proven GR actors), **autocomplete** (Google Suggest), **coverage** (WP REST on the 5
domains). A live scan = YouTube 30 · autocomplete ~300 · Google 10 · X ~50 → ~200 ranked ideas.
- **Architecture:** the FE **reads the stored board** (`GET /ideas`, instant ~15ms). A full recompute is
  slow (TikTok's actor alone is ~90s + coverage lookups), so it runs on the **daily cron + a background
  seed on boot** — never blocking a click. `POST /scan` forces a refresh.
- **Coverage is capped** to the top ~50 clusters by demand (the long tail gets a neutral read) to bound
  WP requests.
- **Cold-start velocity:** z-scores need ≥2 daily samples, so on day 1 `ideaType` uses demand level OR
  velocity (keeps the Trends view populated); it sharpens to true rate-of-change as `samples` accrue.
- **TikTok** is slow + flaky (~⅓ runs return nothing) — fail-soft. Lots of YouTube/global content lands
  in `network/other` until the MediaProfiles' `covers` are widened (e.g. player names like "Haaland").

## MATRIX integration
- `SOCIAL_RADAR_URL` (+ `N8N_SEO_SECRET` reused as the shared secret) in `.env.local`.
- Proxy: `src/app/api/agents/ideas/route.ts` (GET read · POST scan · PATCH state) → maps site keys → FE ids.
- `services/agents.ts`: `getIdeas()` → `scanTrends` (→ Trend) + `findGaps` (→ Gap) + `setIdeaState`.
- Store: `createCellFromGap` (→ routed Story Cell, marks idea `assigned`) + `dismissGap` (→ state write-back).
- `components/gaps/Gaps.tsx`: Create-cell + Απόρριψη (dismiss) + ideaType/winnability badges.
- Dismissal half-life = 30 days (resurfaces only if demand climbs +20).
