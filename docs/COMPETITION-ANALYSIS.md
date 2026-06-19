# Competition Analysis (on-demand competitor scout)

Replaces the old "Content Gaps" section (same `/gaps` route, relabeled
**Competition Analysis**). The user pastes competitor URLs and runs an **async**
job that crawls each competitor's recent articles, compares them to **our own**
recent content, and surfaces what **we MISSED** and where a competitor is ahead
(**BEHIND**) — plus a per-competitor summary and an AI **suggested angle**.

## Flow
```
/gaps (Competition Analysis)
  form: competitor URLs + window + brand profiles  →  POST /api/agents/competition
                                                          │ (secret proxy)
  social-radar  POST /competition/runs → {runId}          ▼
     crawl competitors (RSS/sitemap/HTML/Apify) ─┐
     crawl OUR sites' RSS/sitemap (env.wpBases) ─┼─► analyze (Claude, LLM-only) ─► findings
     per-competitor summary (volume/cadence/topics)┘
  FE polls GET /api/agents/competition?runId=  → live progress → ranked findings
  finding → CompetitionDetail modal → POST /competition/.../generate (reuses generateIdeas)
          → per-brand ideas → Create cell (Newsroom)
```
- **Async, in-process** (no external queue): the run row's `status`/`progress`
  advances pending→running→done/error; the FE polls every ~2.5s.
- **Graceful degradation**: a blocked/empty URL is recorded in `run.sources`
  (`ok:false`) and never fails the whole run.

## Decisions (v1)
- **Topic matching = LLM-only** (Claude). No embeddings provider.
- **Our-content baseline = crawl our own sites' RSS/sitemap** (public, no WP auth),
  domains from `WP_REST_BASES` keyed by profile id.
- **Social scouting = stubbed/pluggable** — `run.socialStatus = "unavailable"`
  unless a provider is wired. The connector seam exists; no key → skipped.

## Competitor ingestion (social-radar `services/crawl.ts`)
For each URL, in order: **RSS/Atom feed** (the URL or `/feed`,`/rss`,…) →
**sitemap** (`/sitemap.xml`, recent `<loc>`) → **direct HTML** (page + article
links, cheerio `og:`/JSON-LD extraction) → **Apify** `website-content-crawler`
(JS-rendered fallback, only if `APIFY_TOKEN` set). Window-filtered by publish date;
real User-Agent + per-request timeouts; fail-soft per URL.

## Add a crawl connector
The crawler is heuristic (feed→sitemap→HTML→Apify). To add a dedicated source
(e.g. a paid scraping provider), add a branch in `crawlCompetitor()` returning
`CompetitorArticle[]`, gated by an env flag — mirror the Apify block.

## Add a social connector (pluggable, stub today)
Social is best-effort and currently returns "unavailable". To wire it: add a
`services/social.ts` that, given a handle + a provider key (new env var), returns
recent posts + engagement; feed engagement into the `behind` classification and
set `run.socialStatus = "ok"`. Keep it fail-soft (missing key → skip).

## Reuse (don't rebuild)
- **Brand profiles** — `social-radar/src/config/sites.ts` `PROFILES` (each has a
  `competitors[]` seed list you can pre-fill the form with) and FE `SITES`.
- **Suggested angle** — `generateIdeas(trend, profile)` (a finding is wrapped as a
  synthetic `Trend`); the modal reuses `createSocialCell`/`createArticleCellFromIdea`.
- **Our content** — the same crawler pointed at our own domains.

## Env vars
- **social-radar:** `WP_REST_BASES` (JSON map `profileId → https://domain`) for our
  baseline; `APIFY_TOKEN` (optional, JS-site fallback); `ANTHROPIC_API_KEY` (analysis).
- **matrix-newsroom:** `SOCIAL_RADAR_URL` + `N8N_SEO_SECRET` (the secret proxy).

## ToS / rate limits
Respect each site's robots.txt and ToS. The crawler sends a real User-Agent,
times out per request, caps pages per URL, and throttles via sequential fetches.
Only crawl sources you are permitted to. For sites that block direct fetches, use
the Apify fallback (or another configured provider) rather than hammering them.

## DB
social-radar SQLite (mirrored in the memory store): `competition_runs`
(id, status, json, timestamps) and `competition_findings` (id, run_id, score, json).
Runs are revisitable via `GET /competition/runs`.

## Deploy
Deploy social-radar (`railway up`) so the new endpoints exist; the production FE
points `SOCIAL_RADAR_URL` at it.
