# Newsroom — two boards (Articles & Social)

The `/newsroom` page is the production kanban. It hosts **two boards with different
pipelines**, switched by a tab toggle (**Άρθρα | Social**) at the top:

| Board | `Cell.kind` | Pipeline | Gate | Publish target |
|-------|-------------|----------|------|----------------|
| **Άρθρα** (Articles) | `"article"` (or missing) | Inbox → Ανάθεση → AI Draft → Review → Δημοσιευμένο | SEO publish-gate | WordPress (`publishToWp` stub) |
| **Social** | `"social"` | Ιδέες → Σύνταξη → Έγκριση → Προγραμματισμένα → Δημοσιευμένα | none | platform (`publishToSocial` stub) |

A long-form article and a social post have fundamentally different lifecycles, so they
get separate columns, drawers and actions — one destination, two clean flows.

## Data model
- **`Cell.kind?: "article" | "social"`** — a discriminator. **Missing = `"article"`** everywhere,
  so persisted v4 cells (pre-feature) keep working unchanged.
- **Stages**: `ColumnId` (article) and a distinct `SocialColumnId =
  "idea"|"composing"|"approval"|"scheduled"|"posted"`. `Cell.status: Stage = ColumnId | SocialColumnId`.
  Distinct ids → a cell's status alone identifies its board, so `move`/drawer branching is unambiguous.
- **Social fields** (optional, only on social cells): `platform`, `caption`, `hashtags[]`,
  `scheduledAt`. Provenance for both kinds: `trendTitle` (the radar trend it came from).
- **Columns config** (`src/lib/config/sites.ts`): `COLUMNS` (article, back-compat), `SOCIAL_COLUMNS`,
  and `columnsFor(kind)` / `stageLabel(status)`. The Board, drawer header and stage-chips all call
  `columnsFor(...)` instead of importing one fixed set.

## Store (`useNewsroom`)
- **`boardKind` + `setBoardKind(kind)`** — which board the page shows (UI state, not persisted).
- **Social transitions** (no SEO gate): `composeSocial`, `submitSocialForApproval`,
  `approveSocialSchedule(id, whenMs)`, `returnSocial`, `postSocial` (→ `publishToSocial` stub).
- **From Trend Radar ideas**: `createSocialCell({platform, headline, caption, hashtags, site, trendTitle})`
  and `createArticleCellFromIdea({headline, body, titles, meta, keywords, …})` — each sets `boardKind`,
  prepends the cell, opens the drawer; the modal then `router.push("/newsroom")`.
- `addCell()` creates a blank cell of the **current** `boardKind` (social → `idea`, article → `inbox`).

## The two flows

### Articles (unchanged editorial flow)
Inbox → **Ανάθεση** (assign a writer) → **AI Draft** (open/generate draft, edit in the article editor)
→ **Review** (a different editor approves) → **Δημοσιευμένο**. The SEO publish-gate blocks publishing
while a critical issue remains (e.g. missing meta/image). Two people always own a cell — the writer
(assignee) and the reviewer — and they can't be the same person.

### Social (lighter, gate-free)
**Ιδέες** (edit platform/caption/hashtags) → **Σύνταξη** → **Έγκριση** (set a date/time → schedules)
→ **Προγραμματισμένα** → **Δημοσιευμένα** ("Δημοσίευση τώρα" calls the `publishToSocial` stub). The
card shows a platform badge + scheduled time instead of the SEO dot.

## Coming from Trend Radar
In the Trend Radar idea modal each generated idea has a **＋ "Create cell"**:
- a **social post** → `createSocialCell(...)` → Social board (`idea`), platform/caption/hashtags pre-filled;
- the **reel** → `createSocialCell({platform: "reel", …})`;
- the **article** → `createArticleCellFromIdea(...)` → Articles board (`inbox`), **fully populated**
  (title options, meta, keywords/tags, HTML body, `aiVersion: 1`) like an AMNA wire cell.

See [TREND-RADAR.md](./TREND-RADAR.md) for how those ideas are generated and cached.

## How to use (tutorial)

**Articles**
1. Switch to the **Άρθρα** tab.
2. New work arrives in **Inbox** (manually via **New cell**, from **Λήψη feed** (AMNA), or from a Trend
   Radar article idea). Open a card.
3. **Ανάθεση** → pick/auto-assign a writer. Open the **draft**, then **Επεξεργασία άρθρου** to edit.
4. **Υποβολή για review** → a different editor opens it, fixes any SEO-gate blockers, then
   **Έγκριση & Δημοσίευση**.

**Social**
1. Switch to the **Social** tab.
2. Create a post (**Νέο social**) or come from a Trend Radar social idea — it lands in **Ιδέες**.
3. Open the card: set **Πλατφόρμα**, write the **Κείμενο post**, add **hashtags** → **Σύνταξη**.
4. **Υποβολή για έγκριση** → **Έγκριση & Προγραμματισμός** (pick date/time) → **Δημοσίευση τώρα**.

> Filters apply to both boards: the **scope** selector narrows to one portal; **Τα δικά μου** keeps
> only cards where you're the assignee/reviewer.

## Out of scope (stubs)
- `publishToWp` (Articles) and `publishToSocial` (Social) are stubs returning a fake id after a short
  delay — the flows are fully wired; only the real WordPress/Meta/TikTok POSTs are TODO(backend).
- Per-platform character limits / media upload — a later iteration.
