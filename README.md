# MATRIX Newsroom Core

AI-assisted newsroom dashboard for a Greek WordPress media network of 5 portals
(**Sportal** · **Matchpoint** · **OnlyAuto** · **Exodos** · **Muse**). Stories are
ingested from feeds, keyword-routed to the right site, AI-drafted for SEO, moved
through a 6-stage kanban, and "published" to WordPress.

This iteration is a **fully functional frontend running on mocked data and stubbed
AI** — no backend, no n8n, no live WordPress/GA4/Claude calls. Every network seam
is isolated behind a clean service layer so the next iteration is a drop-in.

- **Next.js 16** (App Router) · **TypeScript**
- **Plain CSS** — design tokens in `globals.css` + CSS Modules per component (no Tailwind, no CSS-in-JS)
- **zustand** (`persist` → `localStorage`) for cross-page state
- **recharts** (charts) · **lucide-react** (icons)
- UI language: **Greek (el-GR)**; code/comments/types in English

## Run

```bash
npm install
npm run dev      # http://localhost:3000
# or
npm run build && npm run start
```

## Auth & roles (DUMMY identity, real RBAC)

Login + role-based access control. The **identity provider is a mock** (no real
password check) — but the roles, permissions, route guards, and UI gating are
real and final. Only the mock provider is swapped for real auth later, at **one
documented place**.

📖 **Full guide — architecture, how to use, file map, real-auth swap:** [`docs/AUTH-RBAC.md`](docs/AUTH-RBAC.md).
In-app, the **Χρήστες (`/users`)** screen has its own "Πώς δουλεύει & γιατί" panel.

> ⚠️ **SECURITY CAVEAT — these checks are UX only, NOT security.** The mock does
> not verify passwords and the session token is fake. Anyone can edit
> `localStorage` (`auth-v1`) to grant themselves any role. **Real security MUST be
> enforced server-side** once real auth is added (see the swap checklist below).
> Hiding a button does not protect the underlying action.

### How to log in

Visit any page → you're redirected to `/login`. Pick a demo user (or type the
email) and submit — **any password is accepted**. Switch roles live without
re-login via the **dev identity switcher** in the topbar (separate from the team
"view as" switcher, which controls content-workflow assignment).

| Demo email | Role | Sees / can do |
|---|---|---|
| `admin@matrix.gr` | **Admin** | Everything, incl. User Management & settings |
| `editor@matrix.gr` | **Editor** | Runs the newsroom: manage, generate, run, create/approve/publish drafts. No user management |
| `journalist@matrix.gr` | **Journalist** | View newsroom, generate trends, run competition, create drafts, view analytics. No approve/publish, no users |
| `analyst@matrix.gr` | **Analyst** | Read-only on content; view + export analytics, view competition |
| `viewer@matrix.gr` | **Viewer** | `*.view` only — fully read-only |

### Role → permission matrix (single source of truth)

Defined once in **`src/lib/config/permissions.ts`** (`ROLE_PERMISSIONS`). Roles and
the matrix are trivially editable there. The **Admin → Χρήστες (`/users`)** screen
can also override the matrix and reassign roles at runtime (persisted in the auth
store); nav and guards read those overrides live.

| Permission | Admin | Editor | Journalist | Analyst | Viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| `newsroom.view` | ✓ | ✓ | ✓ |  | ✓ |
| `newsroom.manage` | ✓ | ✓ |  |  |  |
| `trends.view` | ✓ | ✓ | ✓ |  | ✓ |
| `trends.generate` | ✓ | ✓ | ✓ |  |  |
| `competition.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `competition.run` | ✓ | ✓ | ✓ |  |  |
| `analytics.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `analytics.export` | ✓ |  |  | ✓ |  |
| `drafts.create` | ✓ | ✓ | ✓ |  |  |
| `drafts.approve` | ✓ | ✓ |  |  |  |
| `drafts.publish` | ✓ | ✓ |  |  |  |
| `users.view` | ✓ |  |  |  |  |
| `users.manage` | ✓ |  |  |  |  |
| `settings.manage` | ✓ |  |  |  |  |

Routes are gated by `ROUTE_PERMISSIONS` in the same file. Enforcement is **client
-side only** for now: `<ProtectedRoute>` (`src/components/auth/ProtectedRoute.tsx`)
redirects unauthenticated users to `/login` and shows a clean "no access" state
for disallowed routes; the sidebar hides nav items the role can't reach; and
action buttons (create/approve/publish, generate, run) are hidden via the
`useCan()` hook.

### The single swap point (mock → real auth)

All app code talks to the `AuthProvider` interface and the `authProvider`
singleton from `@/lib/auth` — never to the mock directly.

**At swap time, change:**
1. **`src/lib/auth/index.ts`** — replace `new MockAuthProvider()` with the real
   provider (JWT/OAuth/our backend). One line. This is the only identity edit.
2. Add **`src/proxy.ts`** (Next.js 16 renamed Middleware → **Proxy**) to verify
   the session cookie and redirect unauthenticated requests server-side.
3. Add a Data Access Layer `verifySession()` and call it in every
   `src/app/api/agents/*/route.ts` handler — **the real enforcement layer** —
   returning 401/403 before doing any work.
4. Make `getSession()`/`getCurrentUser()` hit the real backend and re-validate the
   token on rehydrate.

**Stays unchanged:** `src/lib/config/permissions.ts` (roles, matrix, route map),
the `useAuth` store, the `useAuth`/`useCan`/`useHasRole` hooks, `<ProtectedRoute>`,
the sidebar nav filter, and all UI gating — they depend on the interface, not the
mock, so they survive the swap untouched.

## The backend seam (where the next iteration plugs in)

All network-bound work goes through `src/lib/services/` and is **stubbed today**.
Flipping one flag and implementing the route handlers is the entire next step —
no component or store code changes.

| File | Today (stub) | Next iteration |
|------|--------------|----------------|
| `services/router.ts` | **Real** deterministic keyword router — stays valid | unchanged (backend only *augments* it via `rerouteStory`) |
| `services/agents.ts` | draft/route/trends/gaps/kpi: `USE_BACKEND = false` → sample data | flip to `true`, implement `/api/agents/*` route handlers that proxy n8n/Claude inside `call()` |
| `services/agents.ts → runSeo()` | **WIRED to the live SEO agent** via `/api/agents/seo` (real-only; error toast if offline) | already real — see *SEO Health Agent* below |
| `services/wordpress.ts` | `publishToWp()` returns a fake post id | `POST {site.wp}/wp-json/wp/v2/posts` with Yoast/RankMath meta + mapped category (server-side) |

Search the codebase for **`TODO(backend)`** to find every plug-in point.
`src/lib/utils/json.ts` (`parseJSON`) is kept unused for parsing real AI responses later.

> **No secrets in the browser.** Unlike the original prototype, nothing here calls
> `api.anthropic.com` (or any external API) from the client. The real AI/WordPress
> calls will live in server route handlers.

## SEO Health Agent (live backend)

The **SEO Health** panel, per-portal status lights, and SEO Reports are driven by a
**real** agent — not a stub. A production n8n workflow ("SEO · Daily Health Report",
06:00 Athens) crawls the network and writes findings to n8n Data Tables. A second
workflow, **"SEO Report API"** (`041W7NvD61UES72U`, webhook `/webhook/matrix-seo-report`),
reads the latest run from those tables and returns a canonical report (per-site
🟢🟡🔴, network status, top-3 Greek actions, summary items). All numbers are measured
in n8n; the LLM only phrases.

Flow: `runSEO` (store) → `runSeo()` (`services/agents.ts`) → **`POST /api/agents/seo`**
(server route) → n8n webhook (secret-guarded) → mapped to the FE shape.

📖 **Full guide — what it measures, how to run/test, how to improve:** [`docs/SEO-AGENT.md`](docs/SEO-AGENT.md).
SEO shows **only real generated reports** — no mock. Before a run the panel reads
"Δεν έχει τρέξει ακόμη"; if n8n is unreachable the user sees an error, never fake data.

Setup: copy `.env.example` → `.env.local` and set `N8N_SEO_WEBHOOK_URL` +
`N8N_SEO_SECRET` (the secret must match the webhook's `Check Secret` node). The secret
is **server-only** — the browser calls `/api/agents/seo`, never n8n directly. If the
backend is unreachable the route returns 502 and `runSeo()` falls back to a visible
sample, so the dashboard keeps working.

**Network mapping** (real n8n domains are canonical): `sportal→sportal.gr`,
`matchpoint→matchpoint247.gr`, `onlyauto→onlyauto.gr`, `exodos→exodos.com.gr`.
**Muse** is not audited → reported 🔴 "WP unreachable" (matches its disconnected state).
The n8n network also audits `popaganda.gr` + `klik.gr`; they feed the network roll-up
but are not MATRIX portals — revisit if they should appear.

> ⚠️ **Current blocker:** the n8n cloud account's **trial has ended**, so the webhook
> returns empty and live runs are paused. Upgrade the n8n plan to activate it; no code
> change is needed — the dashboard lights up on the next run.

**Deferred (v3 depth):** CrUX field CWV, GSC URL-Inspection/Search-Analytics indexing &
ranking deltas, IndexNow verification. (`googleApi`/`anthropicApi`/`slackOAuth2Api` creds
already exist in n8n; GSC depth needs per-property grants + GA4 IDs.)

## Routing assumptions (confirm if the editorial mix changes)

Encoded only in the per-site `kw` arrays in `src/lib/config/sites.ts`:

- `sportal` = general sports (football / basketball / leagues)
- **`matchpoint` = TENNIS** (client-confirmed; the prototype had it as betting/odds)
- `onlyauto` = cars · `exodos` = going-out / entertainment · `muse` = lifestyle / beauty

If any change, edit only that site's `kw` (and `vertical`/`wpCat`) — the router and
the rest of the app are unaffected.

## Structure

```
src/
  app/            route pages (thin) + layout (Shell + fonts) + globals.css
  components/
    shell/        Shell, Sidebar, Topbar, StoreHydration
    ui/           Button, Panel, Eyebrow, SiteTag, StatusLight, SlaClock, Stat, Toast
    dashboard/ board/ drawer/ trends/ gaps/ reports/ agents/
  lib/
    types.ts            domain types
    config/sites.ts     SITES, VERTICALS, COLUMNS (+ routing assumptions)
    data/               SEED + FEED_POOL (mock data)
    store/useNewsroom   zustand store: state + all actions
    services/           router (real) + agents/wordpress (stubbed)
    utils/              kpi, time (el-GR), json
```

## Manual verification (no backend running)

1. **Ingest from feeds** (topbar) → a Story Cell is created, keyword-routed to a
   site with a confidence %, the drawer opens, the board updates. Unmatched content
   lands in *Ingested* for manual assignment.
2. **Scope** selector + clicking a dashboard portal filter dashboard / board /
   trends / gaps consistently.
3. **Drawer:** edit headline/event; **Re-route with AI** updates site + reason;
   **Draft with AI** is blocked until a site is set, then fills 3 vertical-flavored
   titles + meta + keywords (Matchpoint reads tennis, Muse lifestyle); selecting a
   title updates the headline.
4. **Publish to {site}** stamps a WP post id, moves the cell to *Published*, shows
   the `{wp}/wp-json/wp/v2/posts` endpoint + category, and toasts.
5. **Drag-and-drop** moves cells across the 6 columns; the SLA clock counts down and
   flips to `SLA MISS`.
6. **Trends / Gaps / SEO / KPI / Run morning routine** produce scoped output and
   stamp agent last-run times.
7. **Agents** toggle on/off and *Run now* works. **Muse shows WordPress
   disconnected** (red) on the sidebar and its dashboard portal.
8. State **persists across reload** (localStorage key `newsroom-v2`).

To reset persisted state: clear `localStorage` for the origin (key `newsroom-v2`).
