# SEO Health Agent — how it works, how to use it, how to improve it

The **SEO Health** panel, per-portal status lights, and SEO Reports in MATRIX are
driven by a real agent running on n8n — not by mock data. This doc explains the
full pipeline, how to run it, exactly what it measures, and where to change things.

---

## 1. Data flow (end to end)

```
 ┌─────────────────────────── n8n cloud (onlygroup.app.n8n.cloud) ───────────────────────────┐
 │                                                                                            │
 │  "SEO · Daily Health Report"  RAViharEff2nwYwz   (ACTIVE, daily 06:00 Athens)              │
 │     crawls 6 sites in Code nodes → ~45 checks → writes Data Tables:                         │
 │        seo_findings   (every finding: severity, issue_key, fix)                             │
 │        seo_run_stats  (per-site counts: checked/critical/warning/info/site_issues)          │
 │        seo_seen_urls  (dedup + "new since" history)                                         │
 │     → Claude (opus) narrates → posts Slack #seo (C0B8STXKL2X)                               │
 │                                                                                            │
 │  "SEO Report API (MATRIX)"  041W7NvD61UES72U   (webhook /webhook/matrix-seo-report)        │
 │     reads seo_run_stats + seo_findings (latest run) → computes per-site 🟢🟡🔴,             │
 │     network status, top-3 Greek actions, summary items → returns JSON                       │
 └───────────────────────────────────────────────▲────────────────────────────────────────────┘
                                                  │  POST + header x-matrix-secret
 ┌────────────────────────────── MATRIX (Next.js) │ ──────────────────────────────────────────┐
 │  Dashboard "Run" ─▶ store.runSEO() ─▶ services/agents.ts runSeo()                            │
 │                       └─▶ POST /api/agents/seo  (server route — holds the secret)            │
 │                              └─▶ n8n webhook ─▶ maps to FE shape ─▶ lights up:               │
 │                                    seo.status · seo.items[] · siteKpi[id].seo · a Report      │
 └─────────────────────────────────────────────────────────────────────────────────────────────┘
```

The browser **never** talks to n8n directly and never holds the secret — it calls
the same-origin `/api/agents/seo` route, which runs on the server.

---

## 2. How to use it

### Run it from the dashboard
1. `cp .env.example .env.local`, then set `N8N_SEO_WEBHOOK_URL` and `N8N_SEO_SECRET`
   (the secret must equal the value in the webhook's **Check Secret** node).
2. `npm run dev` → open http://localhost:3000 → **SEO Health** panel → **Run**.
3. The panel status, the detail rows, the per-portal lights, and a new entry in
   **Reports** all update from the latest audit.

> Env changes require a dev-server restart (`.env.local` is read at boot).

### Test the chain from the terminal
```bash
# the local route (what the dashboard calls) — returns the mapped FE shape
curl -s localhost:3000/api/agents/seo | jq

# n8n directly (what the route proxies) — needs the secret header
curl -s -X POST https://onlygroup.app.n8n.cloud/webhook/matrix-seo-report \
  -H "x-matrix-secret: <secret>" -H "content-type: application/json" -d '{}' | jq
```

### No mock — real reports only
SEO has **no mock/fallback**. The SEO Health panel and Reports show **only a report the
user actually generated** (click Run / "Χθεσινή αναφορά SEO"). Before any run the panel
reads "Δεν έχει τρέξει ακόμη". If n8n is unreachable, the route returns **502** and the
store shows an error toast ("μη διαθέσιμο") — never fabricated data. The route response
always carries `source: "n8n"`.

---

## 2b. Where reports are stored

Two layers. **The n8n Data Tables are the durable source of truth; the MATRIX Reports
view is a per-browser cache.**

**n8n (paotalk) — durable, shared. Browse via n8n → Data Tables:**
- `seo_findings` (`8UH4IG4XZNxX80QA`) — every individual finding: `run_date, site, url, severity, issue_key, issue_detail, fix`. The full per-URL detail.
- `seo_run_stats` (`2zYES4nlFiPT2HqG`) — per-site daily counts (`checked/critical/warning/info/site_issues`). Powers the health rollup + trends.
- `seo_seen_urls` (`SK6Uv753MKLYOyCX`) — visited URLs + title/meta for 7-day duplicate detection.
- `seo_retro_reports` (`w2MS11sCy2dVPT4O`) — one row per site per retro run: `day, site, generated_at, report_json` (the full per-site retrospective).
- Slack `#seo` — the daily health digest (once the daily crawler is live).

**MATRIX (browser) — a local cache, NOT a server DB:**
- The Reports shown in the UI live in the browser's `localStorage` (zustand `persist`,
  key `newsroom-v2`, field `reports[]`), built from the latest webhook fetch — per-browser.
  **Καθαρισμός** clears this list only; it never touches the n8n tables.
- There is no MATRIX server database (we chose "Next route + n8n Data Tables"). Persisting
  reports server-side / sharing across users would be a future add (Postgres).

> SEO **Health** rows read "όλα καθαρά" because the daily crawler hasn't run on paotalk yet
> (`seo_run_stats` empty — pending Anthropic+Slack creds). The **retrospective** already has
> real data in `seo_retro_reports`.

## 3. What the agent actually measures

All measurement is deterministic (Code/HTTP in n8n). The LLM only phrases — it never
invents or changes a number or a status. Findings carry a `severity`:
🔴 `critical` · 🟠 `warning` · 🔵 `info` · 🟣 `site` (site-level).

### A. Crawl & availability (per article URL)
- `http_error` 🔴 — non-200 after ≤3 manual redirects, or network failure
- `redirect_chain` — 2 hops 🟠 / >3 hops or a loop 🔴
- `crawler_blocked` 🔴 — 403/503 or a Cloudflare/again-style challenge page
- `not_html` 🔴 — 200 but non-HTML body
- `mixed_content` 🟠 — http assets on an https page
- `canonical_*` — missing 🔴 / mismatch 🔴 / http 🔴 / multiple 🔴
- `noindex` 🔴 — noindex/nofollow via meta or `X-Robots-Tag` (with an allowlist)

### B. Indexing & discoverability (site-level 🟣)
- `robots_txt` — non-200, missing `Sitemap:` line, or over-broad `Disallow`
- `sitemap_error` — sitemap unreachable / invalid XML / challenge page
- `https_canonicalization` — http/https × apex/www don't converge to one https host
- `news_sitemap_stale` — Google-News entries older than 48h
- `lastmod_invalid` — unparseable or future-dated `lastmod`/`publication_date`
- `ai_crawlers` 🟣info — GPTBot/ClaudeBot/PerplexityBot/Google-Extended allow/block posture

### C. On-page & metadata (per article)
- `title_length` (30–60 ideal; 61–65 = info "οριακά"), `missing_title`
- `missing_meta_description`, `meta_description_length` (70–160)
- `missing_h1` / `multiple_h1` (counted in the body region, nav/footer/aside excluded)
- `thin_content` — body word count below threshold (150 default; 300 for onlyauto)
- `few_internal_links` — fewer than 2 in-body same-host editorial links
- `duplicate_title` / `duplicate_meta` — exact match across this run **and** the last 7
  days (via `seo_seen_urls`)
- `non_clean_url`, `images_missing_alt`, `dirty_internal_links` (utm/fbclid/…)

### D. Structured data & social (per article)
- `missing_article_schema` 🔴 — no NewsArticle/Article/BlogPosting JSON-LD/microdata
- `datepublished_missing` 🔴 / `datepublished_no_tz` 🔴 (silent Google-News killer)
- `schema_missing_props` 🟠 — headline/image/dateModified/author(Person+url)/publisher/mainEntityOfPage
- `author_weak`, `headline_too_long` (>110), `datemodified_invalid`
- `og_image_missing` / `og_image_small` (<1200px) / `og_image_broken`, `no_max_image_preview`
- `missing_og_tags`, `missing_twitter_card`, `missing_breadcrumb`

### E. Core Web Vitals (site-level, optional)
- `cwv` via PageSpeed Insights — LCP ≥2.5s / INP ≥200ms / CLS ≥0.1. **Toggle is OFF
  per site** today (no PSI key). API failure degrades to info, never errors.

### F. WordPress connectivity
- Reachability of `{domain}/wp-json/`. **Muse** is currently disconnected → reported
  🔴 "WP unreachable"; WP-only checks are skipped (not silently passed).

> The MATRIX dashboard summarises these into a handful of `seo.items[]` rows
> (Κρίσιμα / Σημαντικά / Site-level / Σελίδες ελεγμένες / WordPress). The full
> per-URL detail lives in the `seo_findings` Data Table.

---

## 4. Scoring → 🟢🟡🔴 (computed in `041W7NvD61UES72U`, not by the LLM)

Per site, from the latest run's counts in `seo_run_stats`:
- **🔴 red** if `critical > 0`
- **🟡 amber** if `warning > 0` or `site_issues > 0`
- **🟢 green** otherwise

- **Network status** = worst-of the audited sites.
- **Muse** = 🔴 (WP unreachable, not audited) — shown as a portal light + an item row,
  but kept *out* of the network worst-of so the headline reflects crawlable-site health.
- **Actions** = the top-3 critical findings' Greek `fix` strings, priority-ordered
  (`crawler_blocked > http_error > noindex > canonical_* > schema > …`), deduped by URL,
  padded from warnings if fewer than 3.

### The report the route returns (`SeoResult`)
```jsonc
{
  "status": "amber",                 // network
  "checkedAt": 1750000000000,
  "source": "n8n",
  "perSite": { "sportal": "green", "matchpoint": "amber",
               "onlyauto": "green", "exodos": "amber", "muse": "red" },
  "items":   [ { "k": "Κρίσιμα ευρήματα", "v": "0", "s": "green" }, … ],
  "actions": [ "…", "…", "…" ]       // 3 Greek action items
}
```

---

## 5. The network (real n8n domains are canonical)

| MATRIX portal | id | n8n `site` (`seoKey`) | audited? |
|---|---|---|---|
| Sportal | `sportal` | `sportal.gr` | ✅ |
| Matchpoint | `matchpoint` | `matchpoint247.gr` | ✅ |
| OnlyAuto | `onlyauto` | `onlyauto.gr` | ✅ |
| Exodos | `exodos` | `exodos.com.gr` | ✅ |
| Muse | `muse` | — | ❌ (WP disconnected → 🔴) |

n8n also audits **popaganda.gr** and **klik.gr**; they feed the network totals/roll-up
but are not MATRIX portals. (Decide later if they should appear.) The mapping lives in
the webhook's `SITE_TO_FE` (n8n) and `seoKey` in `src/lib/config/sites.ts` (FE).

---

## 6. How to improve it (where to change what)

| Goal | Where | How |
|---|---|---|
| Add / remove a monitored site | n8n parent `Build Site Configs` | add one object to `SITES` (site, sitemapUrl, thresholds, toggles) |
| Add it to the dashboard too | `src/lib/config/sites.ts` + webhook `SITE_TO_FE` | add the site + map its n8n key to a FE id |
| Tune a check's severity | n8n parent `Build Site Configs` | `severityOverrides: { issue_key: 'critical'|'warning'|'info'|'off' }` per site |
| Add a new check | n8n sub `Audit Rules` (`dvzXYXiclwP6yndS`) | emit `{ issue_key, severity, issue_detail, fix }`; it flows through automatically |
| Change RAG thresholds / actions | webhook `041W7NvD61UES72U` → `Build MATRIX Report` Code node | edit `rag()`, the worst-of, or the `PRIORITY`/top-3 logic |
| Change the dashboard summary rows | same Code node → `items[]` | add/rename rows |
| Turn on CWV (PSI) | `Build Site Configs` | set `toggles.cwv: true` (+ optional `psiApiKey`) |
| Reword the Greek narrative | n8n parent `Greek Commentary` | adjust the Anthropic prompt (narration only) |
| Rotate the webhook secret | webhook `Check Secret` node **and** `.env.local` | keep both in sync |

### Pending / blockers
- **n8n trial ended** — upgrade the plan to resume daily runs + the webhook. Then set
  (Optionally run the parent once so today's tables are fresh.)
- **popaganda.gr** is behind Cloudflare and blocks the n8n IP — add a WAF "Skip" rule
  for UA `OnlyGroupSEOAudit` (see `~/seo-health-v2/TESTING.md`).
- Set the workflow timezone to **Europe/Athens** in the n8n UI if not already.

### Deferred depth (v3 — not built yet)
CrUX **field** Core Web Vitals (the metric Google actually ranks on), GSC
URL-Inspection (real index status) + Search-Analytics (ranking/visibility deltas),
and IndexNow verification. The `googleApi` credential already exists in n8n; this
needs the service account granted on each GSC property + the GA4 property IDs.

---

## 8. Publish gate (blocks publishing on a critical issue)

A Story Cell with a **critical** SEO problem cannot be published from MATRIX until it's fixed
(or overridden with a logged reason). It's a **client-side, deterministic** check of the draft's
editor fields — drafts have no live URL, so it validates what's knowable pre-publish.

- **Critical-set** (single source): `src/lib/config/seoCritical.ts`. Critical (block): headline
  present, **headline === seoTitle**, **featured image present**, meta/seoDesc present. Improve
  (advisory): seoTitle ≤60, meta 120–160, excerpt, body ≥150 words, tags. Promote/demote by changing a
  check's `severity` here — this same set is the contract the retrospective audit teaches against.
- **Evaluator:** `src/lib/services/seoGate.ts` → `evaluateGate(cell)` / `canPublish(cell)` (pure).
- **Enforcement:** `useNewsroom` guards `publishWP` and `move(→published/promoted)`; blocked unless the
  cell has a logged `gateOverride`. `overridePublish(id, reason)` records to `gateLog` and publishes.
- **UI:** the drawer lists blockers (🔴/🟡), disables Publish on a critical, offers **"Διόρθωση τίτλου
  με AI"** (sets seoTitle = headline) and **"Override & δημοσίευση"** (reason prompt). Cards show a small
  SEO status dot once a cell is in AI Draft / Review.
- No backend needed — works offline. To tune: edit `seoCritical.ts`.

## 9. Retrospective audit — "what went wrong yesterday"

Each morning, audit **yesterday's published articles** per site and produce a per-site report in
MATRIX (Reports view + portal grades) + (later) a Slack digest, with issues ranked by frequency×severity,
worst-offender URLs, and 3 Greek "lessons for today" — same critical-set as the gate.

- **Discovery:** prefer the **news sitemap** (`/news.xml` for sportal) — it carries precise
  `publication_date` per article, so "yesterday (00:00–24:00 Europe/Athens)" is exact and reliable.
  Pagination-walk of the news flow (`/athlitikanea/page/N`, own-domain `/article/` only, drop partners
  like `ieidiseis.gr`) is the **fallback** for sites without a news sitemap.
- **Audit:** reuse the existing sub **"SEO Audit Batch"** `oJZ70ihOHVKQczSM` (same per-article checks).
- **Aggregate:** count by `issue_key`, split critical/improve, grade 🟢🟡🔴, worst offenders, 3 lessons.
- **Store/serve:** write `seo_retro_reports` (`w2MS11sCy2dVPT4O`); a secret-guarded **"SEO Retro API"**
  webhook (`/webhook/matrix-seo-retro`) returns the latest per site.
- **FE:** `runSeoRetro` → `/api/agents/seo-retro` route → `seo_retro` Reports (issues/offenders/lessons)
  + per-portal grades. Trigger: **"Χθεσινή αναφορά SEO"** button in Reports.

**Status: LIVE on paotalk (built via REST).** Workflows: **"SEO Retro Audit (MATRIX)"** `3noGr84pYUTH3Sj1`
(cron 07:00 Athens + kick webhook `/webhook/matrix-seo-retro-run` for manual seeding; reuses sub
`oJZ70ihOHVKQczSM`; audits up to 200 articles/site/day) and **"SEO Retro API"** `NrkeSNfCTwd5WNMq`
(`/webhook/matrix-seo-retro`). Table `seo_retro_reports` = `w2MS11sCy2dVPT4O`.

First real run (Sportal, 2026-06-15): **165/165 audited → grade RED** — 2 articles `noindex`, 2 missing
`canonical`; plus universal `schema_missing_props` + `author_weak` (improve). Real, actionable, no LLM invention.

> v1 covers **Sportal only**; the other 4 sites need their `feedUrl`/`newsSitemap` added to the Discover
> node's `SITES` array (+ a `SITE_TO_FE`-style id map). To re-seed on demand: `POST /webhook/matrix-seo-retro-run`
> with the `x-matrix-secret` header. To raise/lower coverage: edit `maxArticles` in the Discover node.

## 7. Key files

- FE service seam: `src/lib/services/agents.ts` (`runSeo`, `SeoResult`)
- FE store: `src/lib/store/useNewsroom.ts` (`runSEO`)
- FE route: `src/app/api/agents/seo/route.ts` (proxy, real-only)
- FE config: `src/lib/config/sites.ts` (`seoKey`, domains)
- n8n: parent `RAViharEff2nwYwz`, sub `dvzXYXiclwP6yndS`, webhook `041W7NvD61UES72U`;
  tables `seo_findings` / `seo_run_stats` / `seo_seen_urls`
- Reference: `~/seo-health-v2/PLAN.md`, `~/seo-health-v2/TESTING.md`
