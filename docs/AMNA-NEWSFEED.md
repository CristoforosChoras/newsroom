# AMNA Newsfeed (n8n)

A continuous, **no-loss** newsfeed that monitors the AMNA (ΑΠΕ-ΜΠΕ) newsroom,
detects every newly published article, captures its full content, and writes one
**board cell** per article. No article is ever missed or duplicated.

- **Workflow:** `AMNA Newsfeed (MATRIX)` — n8n id `nOXcMtsQkOOkJlfB` on `paotalk.app.n8n.cloud`.
- **Importable export:** [`amna-newsfeed.workflow.json`](./amna-newsfeed.workflow.json)
  (n8n → *Workflows → Import from File*).

---

## 1. Source — which endpoint and why

The page `https://www.amna.gr/newsroom` is an **AngularJS single-page app**; a plain
HTTP GET returns only meta tags, no articles. We use the **JSON API the page itself
calls** (found via the app's `dataservice` factory) — faster and more reliable than a
headless browser, and no RSS/sitemap is needed:

```
GET https://www.amna.gr/feeds/getfolder.php
    ?id=46                       # 46 = the general Greek newsroom (mixed sections)
    &infolevel=FULL              # returns the FULL article body in one call
    &offset=<n>&numrows=100      # pagination (this IS the infinite scroll)
    &kind=article
    &byrole=false&subfolders=true
    &order=[["c_timestamp","desc"]]   # newest first
    &exclude=
```

Each item includes: `id`, `c_daytime` (publish datetime), `title`, `text`/`html_text`
(full HTML body), `note2` (URL section), `note3` (slug), `parent_title` (display
section), `photo1` (lead image, `../photos/…`). `author` is rarely populated by the
feed. A realistic `User-Agent` is sent; pages are fetched ~1/sec.

> Other folder ids: `16` = sports only, `149204` = English. Use **46** for the
> general feed.

---

## 2. Flow

```
Schedule (5 min) ─┐
                  ├─► Load Cadence ─► Cadence Gate ─┐
Kick (webhook) ───┼──────────────────────────────►│
                  └──────────────────────────────► Load Existing ─► Fetch Catch-up
   ─► Normalize ─► Route by Section ─► Save Cell ─► Run Log
```

- **Triggers:** a Schedule trigger (5-min base tick) and a **Kick** webhook
  (`POST /webhook/matrix-amna-run`, for manual runs / the Agents-page button).
- **Load Existing** reads the destination table to build the seen-set
  (`alwaysOutputData` so a fresh/empty table still bootstraps).
- **Fetch Catch-up** (Code) pages the API newest-first and emits only articles
  **newer than the frontier** (max already-stored id). It stops once a page drops
  below the frontier, so each run only fetches the gap since the last run.
- **Normalize** maps each article → a cell row (original content), oldest→newest.
- **Route by Section** assigns a portal from the AMNA section (sport→Sportal,
  politics/economy/general→Popaganda, life/health→Muse, culture→Klik, auto→OnlyAuto).
- **Save Cell** upserts by `originalId` (idempotent), with retry + continue-on-error.
- **Run Log** logs `new / written / failed`; Fetch Catch-up logs `scanned / new`.

Cells are written with `status = inbox` and the **original** title/body/image. They
are **not** AI-rewritten at ingest — an editor runs the existing "Open draft" (Claude)
button when they pick a cell up.

---

## 3. Destination ("cell")

The destination is the newsroom **board cell** = n8n Data Table `amna_cells`
(`PaMCPDCAStndcYW7`), which the board reads via the *AMNA Inbox API* workflow.

Per-article fields written: `originalId`, `publishedAt`, `headline` (title), `section`
(category), `originalUrl`, `image`, `body` (full HTML), `sourceText` (plain text),
`site`, `urgency`, `status`, `createdMs` (fetched_at). `author` is omitted (the AMNA
feed rarely provides one and the board has no author field — add a column if needed).

**Swapping the destination:** everything funnels through the single **`Save Cell`**
node. To send rows to Google Sheets / Airtable / a DB instead, replace just that node
(map the same `$json.*` fields) — and if you move the dedup store off `amna_cells`,
update `Load Existing` to read the new store (see §5).

---

## 4. Credentials & schedule

- **Credentials:** none for AMNA (public API). The Kick webhook is guarded by the
  shared secret header `x-matrix-secret` (same `N8N_SEO_SECRET` the app uses).
- **Change the interval:** the effective cadence is the minutes value in
  `trend_config.amna_interval_min` (set it from the **Agents page** minutes input, or
  edit the row directly). `0` / empty = manual-only. The Schedule node ticks every
  5 min and the *Cadence Gate* fires a run once per interval window — so the smallest
  effective interval is 5 min. To bypass the gate entirely, point the Schedule node
  straight at `Load Existing` and set its own interval.

---

## 5. Dedup / state — how it works & how to reset

- **State store = the destination table itself.** A row in `amna_cells` *is* the
  "seen" marker: an article is processed ⟺ a cell with that `originalId` exists. This
  needs no second table and gives perfect idempotency.
- **No miss:** `Fetch Catch-up` keeps paging back until it passes the frontier, so any
  article newer than the last stored one is fetched — even after long downtime
  (bounded by `MAX_PAGES = 30 × 100`; a larger backlog finishes over the next runs).
- **Mark-seen-only-after-write:** an article becomes "seen" only because its cell was
  written. If a write fails, no row exists → it's re-fetched next run.
- **No duplicate:** `Save Cell` upserts by `originalId`.

**Reset:** clear (or trim) the `amna_cells` table. The next run rebuilds the frontier
from whatever remains — empty table → it backfills the newest `MAX_PAGES` and continues
on subsequent runs. To force a re-pull of specific articles, delete their rows; they'll
reappear on the next run.

> Scale note: `Load Existing` loads the table's ids each run (fine at board scale). If
> the table grows very large, add a cursor row (e.g. `trend_config.amna_feed_last_id`)
> to bound the load — not needed today.

---

## 6. Error handling & ops

- Each API page fetch is wrapped in try/catch (a transient failure ends that run's
  paging; the gap is picked up next run).
- `Save Cell`: `retryOnFail` (3× with backoff) + `onError: continueRegularOutput`, so
  one bad article never halts the run and unwritten items are retried next time.
- **Per-run counts** are logged to the execution log: `Fetch Catch-up` →
  `scanned / new`, `Run Log` → `new / written / failed`.
- A manual kick may return a Cloudflare **502/“no response”** if the run outlasts the
  webhook sync window — that's expected; the run completes server-side (check the
  execution list).
