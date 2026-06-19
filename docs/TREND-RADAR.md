# Trend Radar

A continuous trend-intelligence feed: it scans the open internet/social platforms for what's
trending **right now** (NOT limited to our accounts), split into **GLOBAL** and **GREECE** tabs,
filterable by **category** (sports/politics/entertainment/…). Clicking a trend opens a popup that
(optionally) **researches why it's trending now** and generates ready-to-use content ideas/drafts
(social posts, full article, reel script) conditioned on each of our **brand profiles**, via Claude.

Each generated idea has a **"Create cell"** button that drops it straight into the Newsroom —
social posts/reel → the **Social** board, the article → the **Articles** board (fully populated:
title options, meta, keywords/tags, body) — then navigates you there. See
[NEWSROOM.md](./NEWSROOM.md) for the two boards. The generated drafts + research are **cached
per-trend in the browser** (in-memory, session-only) so navigating away and back never loses them
and you never pay Claude twice.

It is built on top of the existing **Social Radar** service (it reuses the connector layer,
clustering, scoring and SQLite store) by adding an **unfiltered, geo-scoped** path parallel to the
brand-filtered Ideas/Gaps engine. (Supersedes the earlier n8n Trend Radar, which is idle.)

## Architecture
```
Connectors (per scope) → normalize → cluster → score → classify category → Trend[]   (social-radar)
   GET /trends?scope=greece|global   POST /trends/:id/research   POST /trends/:id/generate (Claude)
                  │                            │                            │
   matrix-newsroom: /api/agents/trend-radar  /api/agents/trend-research  /api/agents/trend-idea
                  │                            │                            │  (secret proxies)
   /trends page: TrendRadar (Global|Greece tabs + category chips) → card → TrendIdea modal
                                              │                            │
                              "Έρευνα" (why trending + sources)   "Δημιουργία ιδεών" → per-idea
                                                                  "Create cell" → Newsroom board
```
- **Ingestion**: `social-radar` `POST /scan` runs both the brand-filtered Ideas board AND the
  unfiltered Trend Radar for both scopes; the daily cron + boot seed keep it fresh.
- **Research-then-generate**: `POST /trends/:id/generate` first runs (and caches) research so the
  ideas are grounded in real, current facts (guardrail: a negative/somber event never yields promo
  ideas). `POST /trends/:id/research` can also be run on its own from the modal's **"Έρευνα"** button
  (Claude `web_search`), returning `whyTrending`, `entityType`, a summary and **sources**.
- **DB (SQLite)** tables: `trends` (latest feed per scope), `trend_history` (velocity across runs),
  `drafts` (generated ideas), `research` (per-trend why-trending cache), plus existing
  `samples`/`board`/`idea_state`.
- **No relevance gate**: unlike Ideas, trends are NOT discarded for being off-brand. `suggestedBrands`
  on each trend is advisory (which of our brands could use it).

## Generated ideas → article cell (full SEO package)
The generator returns, per brand: `socialPosts[]`, `shortVideo`, and an **`article`** with
`headline`, `outline`, `draft`, plus **`seoTitles[]`, `meta`, `keywords[]`** (defaulted for back-compat
with older cached drafts). When you press **"Create cell"** on the article idea, the Newsroom builds a
complete Articles-board cell — title options (from `seoTitles`), meta/excerpt, keywords→tags, an HTML
body (outline as H2 + draft), `aiVersion: 1` — i.e. it arrives ready to edit, exactly like an AMNA
wire cell. Social posts/reel become **Social-board** cells at the `idea` stage with platform + caption
+ hashtags pre-filled.

## Sources — live vs paid
| Source | Status | Greece | Global | Key |
|--------|--------|--------|--------|-----|
| **YouTube Data API v3** (mostPopular) | **LIVE, free** | `regionCode=GR` | region basket (`YOUTUBE_GLOBAL_REGIONS`) | `YOUTUBE_API_KEY` |
| **Google Trends** (Apify `vnx0~google-trends-scraper`) | **LIVE** | `geo=GR` | `geo=""` worldwide | `APIFY_TOKEN` |
| TikTok (Apify `automation-lab~tiktok-trends-scraper`) | stub (env-gated) | ✓ | ✓ | `APIFY_TOKEN` + `TIKTOK_ENABLED` |
| X/Twitter (Apify `karamelo~twitter-trends-scraper`) | stub (env-gated) | ✓ | ✓ | `APIFY_TOKEN` + `X_ENABLED` |
| Google Autocomplete | live (Greece only) | ✓ | — | `AUTOCOMPLETE_ENABLED` |
| News/RSS | live (Greece only) | ✓ | — | `NEWS_RSS_FEEDS` |
| Meta (Instagram/Facebook) | **not wired** — Graph API can't do discovery | — | — | needs a paid provider |

> Graceful degradation: a disabled/missing source contributes nothing; the scan proceeds on the rest.

### Provider matrix (verify CURRENT pricing before enabling — this landscape changes)
- **Apify** (already integrated): pay-per-result actors for Google Trends, TikTok, X, IG/FB. Cheapest
  way to fill gaps incrementally — recommended for Phase 2.
- **Data365 / Shortimize**: unified social / short-form APIs — evaluate for **Meta (IG/FB) discovery**,
  which the official Graph API does not provide.
- **Talkwalker / Brandwatch**: enterprise social listening — broad coverage but high cost; only if budget justifies.
- Official/free: YouTube Data API, Google News/RSS.

## Brand profiles ("profiles of our media")
Editable config: `social-radar/src/config/sites.ts` → `PROFILES: MediaProfile[]` (name, audience,
`values` = voice, vertical, seeds, `preferredFormats`, `language`). The generator conditions Claude
output on the selected profile(s). The FE modal lists brands from `matrix-newsroom/src/lib/config/sites.ts`
`SITES` (ids must match between the two files).

**Add a brand profile:** add a `MediaProfile` to `PROFILES` and a matching `Site` to FE `SITES` (same `id`).

## Add a new source connector (pluggable)
1. Implement `SourceAdapter` (`{ id, platform, fetchTrending(region) → RawDemand[] }`) in `social-radar/src/adapters/<name>.ts` (fail-soft → `[]`).
2. Register it in `src/adapters/index.ts` `liveSources()` (for the Ideas engine) and/or in
   `src/pipeline/radar.ts` `geoAdapters()` (for the Trend Radar; geo-capable adapters only).
3. Add its env flag(s) to `src/config/env.ts` + `.env.example`.

## Env vars
**social-radar:** `SOCIAL_RADAR_REGION` (GR), `PORT`, `SOCIAL_RADAR_SECRET`, `STORE` (sqlite),
`SQLITE_PATH`, `ANTHROPIC_API_KEY` (+`ANTHROPIC_MODEL`), `YOUTUBE_API_KEY`/`YOUTUBE_ENABLED`,
**`YOUTUBE_GLOBAL_REGIONS`** (CSV, default `US,GB,DE,FR,BR,IN`), `APIFY_TOKEN`,
`GOOGLE_TRENDS_ENABLED`, `TIKTOK_ENABLED`, `X_ENABLED`, `AUTOCOMPLETE_ENABLED`,
`NEWS_RSS_FEEDS`/`NEWS_ENABLED`, `WP_REST_BASES`/`COVERAGE_ENABLED`, `DAILY_CRON`, `FAST_LOOP_*`.
**matrix-newsroom:** `SOCIAL_RADAR_URL` (the service URL), `N8N_SEO_SECRET` (shared secret == `SOCIAL_RADAR_SECRET`).

## Reset / ops
- Recompute now: `POST /scan` (or the FE "Ανανέωση" button → `POST /api/agents/trend-radar?scope=`).
- Reset the feed: clear the `trends` / `trend_history` tables (the next scan rebuilds them).
- Reset research/ideas: clear the `research` / `drafts` tables (re-run from the modal).
- Generation & research are on-demand per click (Claude); scanning Google Trends/YouTube is free/cheap.
- The FE caches generated drafts + research per-trend **in memory only** (cleared on a full reload),
  so it never re-calls Claude just because you switched tabs.

## Deploy
The new endpoints (`/trends`, `/trends/:id/generate`) and pipeline live in `social-radar`. **Deploy
social-radar to Railway** for the production FE (which points `SOCIAL_RADAR_URL` at the Railway URL) to
use them — until then the production `/trends` page will 404 against the old build. Set
`ANTHROPIC_API_KEY` on Railway so generation uses real Claude (locally without it, generation falls
back to a deterministic template).

## Verified (local, real data)
Google Trends + YouTube live → `/scan` produced **Greece 40 / Global 100+** trends; `/trends?scope=`
returns each scope; `POST /trends/:id/generate {profileIds}` returns per-brand social/article/reel
drafts; the FE `/trends` tabs + click→modal→generate chain works end-to-end. Existing Ideas/Gaps +
AMNA `/route` unaffected.
