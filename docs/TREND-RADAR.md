# Trend Radar Agent — how it works, how to use it, how to feed it keys

Identifies the **fastest-rising** topics across platforms (Greece), clusters the same topic across
sources into one signal, scores by **velocity (rate-of-change), not volume**, routes each to a portal,
and surfaces a ranked board in MATRIX with one-click **"Create Story Cell from trend"**.
Same design law: sources provide the numbers; the LLM only names/angles. **No mocks** — empty until a
source key is added.

## Data flow
```
 cron 08:00 Athens / kick webhook
   → Load Config (keys) → adapters (fail-soft) → normalize → cluster (by topic) →
     score (z-score vs baseline, else percentile × corroboration) → route (site kw) →
     rank → write trend_radar (+ trend_samples baselines)
 FE Scan → /api/agents/trends → "Trend Radar API" webhook → latest trend_radar → board
```

## Sources (each a concrete free/paid API; paid ones share one Apify token)
| Source | API | Free/Paid | Key (row in `trend_config`) |
|---|---|---|---|
| YouTube (Shorts incl.) | Data API v3 `mostPopular?regionCode=GR` | free (10k/day) | `youtube_api_key` |
| Google Trends | Apify `steadyfetch/google-trends-scraper` | paid | `apify_token` |
| TikTok | Apify `novi/tiktok-trend-api` | paid | `apify_token` |
| Instagram (Reels/hashtags) | Apify `instagram-hashtag-scraper` | paid | `apify_token` |
| X/Twitter | GetXAPI | paid (cheap) | `getxapi_token` |

**Minimum to go live: `youtube_api_key` + `apify_token`.** Each adapter is independent and fails soft —
a missing key or a dead source just drops out; the rest proceed.

## How to feed it keys
Add rows to the n8n Data Table **`trend_config`** (`u0RMheQO8Ug6d8Um`) — one row per key:
`{ name: "youtube_api_key", value: "<key>" }`, `{ name: "apify_token", value: "<token>" }`, etc.
(Add via the n8n UI, or give the values to Claude to insert via the REST API.) Then re-run the agent.

## How to use it
- **Scan now:** Trend Radar page → "Scan trends now" (reads the latest board). Cards show velocity bar,
  platform badges, lifecycle (αναδύεται/εκτοξεύεται/κορυφώνεται/υποχωρεί), coverage chip, Greek angle,
  sparkline, and **Create cell** (seeds a routed Story Cell into the board).
- **Daily:** cron 08:00 Athens. **Manual re-run/seed:** `POST /webhook/matrix-trends-run` (+ `x-matrix-secret`).

## n8n resources (paotalk)
- Tables: `trend_config` `u0RMheQO8Ug6d8Um`, `trend_samples` `X6ypi9Hp0xbAqcwE` (baselines),
  `trend_radar` `tY6o6GdYp0UNghAs` (board).
- Workflows: **"Trend Radar — Daily"** `coiH8g2nbmkA8BZQ` (cron + `/webhook/matrix-trends-run`),
  **"Trend Radar API"** `hbFX708dTCHLOoKO` (`/webhook/matrix-trends`).
- FE: `src/app/api/agents/trends/route.ts`, `services/agents.ts → scanTrends`, store `createCellFromTrend`,
  `components/trends/Trends.tsx`. Env: `N8N_TRENDS_WEBHOOK_URL` + `N8N_SEO_SECRET`.

## Status & next — ALL FOUR SOURCES LIVE (GR), real data
Verified `platforms=['google','tiktok','x','youtube']` end-to-end. Actual actors/endpoints wired:
| Source | actor/endpoint | input | speed/reliability | maps to |
|---|---|---|---|---|
| Google Trends | Apify `vnx0/google-trends-scraper` (Code node) | `{geo:"GR"}` | ~5s, reliable | term=query, vel=score |
| YouTube | Data API `mostPopular?regionCode=GR` (Code node) | key | fast | term=title, vel=views%ile |
| X/Twitter | Apify `karamelo/twitter-trends-scraper` (Code node) | `{countryCode:"GR"}` | ~6s, reliable | term=trend, vel=rank |
| TikTok | Apify `automation-lab/tiktok-trends-scraper` (**HTTP node**, 200s timeout) | `{trendType:"hashtag",countryCode:"GR",period:7}` | **~90s, ~2/3 reliable** | term=hashtag, vel=rank |

- **Apify must run in HTTP/Code adapter nodes, never one combined Code node** (60s Code limit; TikTok alone
  is ~90s → must be an HTTP node). Token resolved in a "Read Keys" Code node (n8n expressions reject inline
  arrow fns). Routing is accent-insensitive + **whole-word** (so `ev` ≠ "r**ev**eal").
- **Caveats (honest):** TikTok actor is slow (~90s) and flaky (~1/3 runs fail → empty that day, fail-soft);
  its top GR hashtags are generic (#fyp/#trending). X `volume` is often empty → velocity uses rank order.
  **GetXAPI key is NOT used** (its API is tweet/search, no trends endpoint) — kept in `trend_config` for
  future tweet-content enrichment.
- Next: LLM topic-naming + Greek angle (OpenAI on paotalk); real coverage match; per-zone source weighting;
  velocity sharpens to z-score as `trend_samples` accrues.
- **n8n adapter notes (learned at runtime):** Apify must be called from **HTTP/Code nodes, NOT a single
  Code node** (Code nodes have a hard 60s limit; two `run-sync` calls blow past it). Token is resolved in
  a "Read Keys" Code node (n8n's expression engine rejected an inline arrow-function). Google actor =
  `vnx0/google-trends-scraper`, input `{geo:"GR"}`.
- **TikTok pending:** the `automation-lab/tiktok-trends-scraper` actor is a **$39/mo rental** — it returns
  nothing via `run-sync` until rented on the Apify account (or swap to a pay-per-result TikTok actor).
  Other adapters (YouTube free, X/GetXAPI) await their keys in `trend_config`.
- Phase 2: rent/swap TikTok + add YouTube/X keys; real-time fast loop + breaking alerts/auto-cell; LLM
  topic-naming + Greek angle (OpenAI, already on paotalk); real coverage match; per-zone source weighting.
  Velocity sharpens from interest-score/percentile into a true **z-score** as `trend_samples` grows.
