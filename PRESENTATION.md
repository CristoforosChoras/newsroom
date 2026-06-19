# MATRIX Newsroom Core — Product Presentation & Planning Prompt

> **What this file is.** A single, self-contained brief about the MATRIX Newsroom
> product. Use it as a **prompt**: paste it into an AI assistant (or hand it to a
> consultant) to (A) generate a full **product presentation / pitch deck**, and
> (B) build a **team & budget plan** to maintain and sell the product. It contains
> enough technical detail to make the plan realistic, without going deep into code.

---

## 0. HOW TO USE THIS PROMPT (instructions to the model)

You are a product strategist + solutions architect. Using ONLY the facts in this
document (ask me if something is missing — don't invent integrations we don't have),
produce **two deliverables**:

**Deliverable A — Presentation / Pitch Deck (10–14 slides).**
For each slide give a title, 3–6 bullet talking points, and a one-line "what to say".
Cover, in this order: (1) Cover + one-line pitch; (2) The problem; (3) The solution
(MATRIX in one sentence); (4) Live demo flow / screens to show; (5) Key features;
(6) How it works (architecture, simple diagram in text); (7) What's production-ready
vs. in progress (be honest); (8) Differentiators / why us; (9) Target customers &
market; (10) Business model & pricing; (11) Roadmap (next 3 / 6 / 12 months);
(12) Team & roles; (13) Budget summary; (14) The ask / next steps.
Tone: confident, concrete, for media-company decision-makers (publishers, editors-in-chief,
digital directors). Output can be in **Greek or English** — ask which I prefer; default English.
**Also include a slide on "Platform & adjacent markets"** (Section 10 below — the same engine
reused for e-commerce, short-term rentals, etc.) and make the point that MATRIX runs in two
modes: **Co-pilot** (human approves) and **Autopilot** (fully automated, opt-in).

**Deliverable B — Team & Budget Plan.**
Produce: (1) an org/role table (role, seniority, FTE %, why needed, must-have skills);
(2) a **monthly + annual budget** with line items for **people**, **infrastructure/hosting**,
**third-party APIs/AI usage**, **sales & marketing**, and **contingency**; (3) **three scenarios** —
**"Maintain" (lean / keep-it-running)**, **"Grow" (sell + scale in media)**, and **"Platform"
(productize connectors + multi-tenant SaaS across verticals, per Section 10)**; (4) a short list of
cost assumptions that must be validated against current pricing (don't present guessed
prices as final — flag them). Use EUR. State the headcount math clearly.

Keep both deliverables skimmable: tables, short bullets, no walls of text.

---

## 1. ONE-LINE PITCH

**MATRIX Newsroom Core is an AI-assisted control room for a multi-site news network:**
it ingests the wire and what's trending, turns it into ready-to-edit articles and
social posts across every portal, and keeps a human editor in control with SEO and
KPI guardrails — so a small team can run many sites at the speed of the news cycle.

## 2. THE PROBLEM IT SOLVES

- A media group runs **several portals** (sports, betting, auto, lifestyle, showbiz,
  going-out, politics) with a **small editorial team** and constant deadline pressure.
- Editors waste hours on repetitive work: watching the wire (ΑΠΕ-ΜΠΕ/AMNA), spotting
  trends, routing a story to the right site, drafting, SEO hygiene, and cross-posting to social.
- Trend tools, CMS, analytics, and social are **separate silos** — nothing connects
  "what's trending" → "a drafted, SEO-clean article on the right portal" → "scheduled social".
- Result: missed trending windows, inconsistent SEO, slow output, no single view of the network.

## 3. THE SOLUTION (WHAT MATRIX IS)

A web dashboard (Greek UI) that unifies the whole production pipeline for the network:

- **One control room** for all portals with a live health/KPI overview.
- **Two production boards** (kanban): **Articles** and **Social**, each with its own lifecycle.
- **AI assists, humans decide**: AI drafts, routes, researches and suggests; an editor
  always approves before anything publishes. Strict "no fake data" rule — if a backend
  is offline the UI says so instead of showing mock numbers.

## 4. KEY FEATURES (what to demo)

1. **Dashboard** — network-wide health per portal (green/amber/red), pageviews (GA4),
   7-day trend, top articles, yesterday's SEO report, "trending now". Scope to one site.
2. **Two-board Newsroom**
   - **Articles**: Inbox → Assign (writer) → AI Draft → Review (a different editor) →
     Published. An **SEO publish-gate** blocks publishing while critical issues remain
     (missing meta, image, etc.). Two-person ownership (writer ≠ reviewer).
   - **Social**: Ideas → Compose → Approval → Scheduled → Posted. Platform, caption,
     hashtags, scheduling. No SEO gate — a social post has a different lifecycle.
3. **AMNA / ΑΠΕ-ΜΠΕ wire ingestion** — continuously crawls the national news agency,
   captures full articles (no loss, no duplicates), auto-routes each to the right portal
   by section, and drops them on the board ready to edit. A manual **"Pull"** button
   always fetches the **latest live**, independent of the schedule.
4. **Trend Radar** — what's trending **now**, split **Global / Greece**, filterable by
   category. Per trend: **"Why is it trending?"** research with real sources (AI web
   search), then **per-brand idea generation** (social posts, a full SEO article, a reel
   script) in each portal's voice. Each idea has a **"Create cell"** button that drops it
   straight onto the right board, fully populated.
5. **Content Gaps** — topics with audience demand but weak/no coverage = ranked opportunities.
6. **SEO Retrospective** — every morning, audits yesterday's published articles per portal
   (meta, canonical, schema, image…) and produces lessons.
7. **KPI Agent** — GA4 pageviews + WordPress article counts per portal, top articles, network trend.
8. **Agents console** — turn each automation on/off, run on demand, set the wire cadence.

## 5. HOW IT WORKS (architecture — moderate depth)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Web app (Next.js / React)  — the dashboard, Greek UI                │
│  state: in-browser store; "backend seam" = /api/agents/* endpoints   │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │ (server-side, secret-guarded)  │
        ┌───────▼────────┐               ┌───────▼─────────────┐
        │  n8n workflows │               │  Social Radar svc   │
        │  (automation)  │               │  (trends + ideas)   │
        │  on n8n Cloud  │               │  on Railway (Docker)│
        └───────┬────────┘               └───────┬─────────────┘
   AMNA crawl, routing, draft,           trend scan, scoring,
   SEO retro, KPI (GA4 + WP REST)        research + idea generation
                │                                 │
                └──────── Anthropic Claude ───────┘  (drafting, routing,
                          + data sources              research, ideas)
```

- **Frontend**: Next.js 16 (App Router) + React 19, plain CSS, a lightweight client
  state store. Deployable on Vercel. No data is faked; offline backends surface as notices.
- **Automation layer**: **n8n** (low-code workflow tool, cloud-hosted) runs the AMNA
  crawler, story router, draft generator, SEO retrospective and KPI collector. Data is
  stored in n8n data tables. Easy to edit/extend without redeploying the app.
- **Trend service ("Social Radar")**: a small TypeScript/Node service (Dockerized, on
  Railway) with its own database (SQLite + a persistent volume). Pluggable source
  connectors; calls Claude for research and idea generation.
- **AI**: **Anthropic Claude** — routing, article drafting, trend research (with live web
  search), and per-brand idea/copy generation. Usage is on-demand (per click) + scheduled jobs.
- **External data/integrations**:
  - **AMNA / ΑΠΕ-ΜΠΕ** public news feed (no cost, public API).
  - **YouTube Data API** (free tier) and **Google Trends via Apify** (paid per result) for trends.
  - **Google Analytics (GA4)** + **WordPress REST API** for KPIs/publishing (per portal).
  - Optional/not yet wired: TikTok, X/Twitter, Instagram/Facebook discovery (need paid providers).

## 6. CURRENT STATUS (be honest in the deck)

**Production-ready / working with real data**
- The full app, both Newsroom boards and their flows.
- AMNA live ingestion + auto-routing (running on schedule + on-demand).
- Trend Radar (Global/Greece) with real Google Trends + YouTube data, categories,
  AI research with sources, and per-brand idea generation — deployed and live.
- SEO retrospective and the SEO publish-gate logic.

**Stubbed / not yet connected (needs work to fully sell)**
- **Publishing to WordPress** and **to social platforms** are **stubs** (the flow is wired,
  but the final POST to WP / Meta / TikTok is not implemented yet).
- **GA4 KPI** dashboard needs the Google Analytics connection wired per portal.
- **Popaganda** (politics portal) is a placeholder — not a live WP target yet.
- Some trend sources (TikTok, X, Instagram) are stubbed pending paid providers.
- These are the main items that turn a strong demo into a sellable, fully-automated product.

## 7. DIFFERENTIATORS

- **End-to-end, not a point tool**: trend/wire → drafted article on the right portal → social, in one place.
- **Multi-portal native**: built for a network, with per-brand voice and auto-routing.
- **Human-in-the-loop + guardrails**: SEO gate, two-person review, "no fake data".
- **Greek-market fit**: AMNA wire, Greek SEO, Greek UI, brand-specific tone.
- **Low-code automation core (n8n)**: fast to adapt to a new client's sites/sections without a rebuild.

## 8. TARGET CUSTOMERS & MARKET

- Greek (then SE-European) **digital media groups / publisher networks** running multiple portals.
- Secondary: single large portals wanting AI-assisted production + SEO discipline; sports/betting media.
- Buyer: publisher / editor-in-chief / digital director. Champion: SEO lead or head of content.

## 9. BUSINESS MODEL (options to present)

- **SaaS subscription** per network, tiered by number of portals / seats / article volume.
- **Setup/onboarding fee** (connect their WP sites, GA4, brand profiles, sections).
- **Usage component** for AI generation beyond a monthly quota (passes through model/API cost).
- Optional **managed service** (we run it for them) for non-technical newsrooms.

## 10. PLATFORM PLAY — SHIFTING THE IDEA TO OTHER FIELDS

MATRIX is not only for a media **group** — it works for **any media operation**, including a
single creator or small outlet that wants to run **everything independently and fully
automated**. More importantly, the underlying engine is **domain-agnostic**: strip away
"news" and what remains is a reusable pattern that fits many businesses.

### Two operating modes (sell as tiers)
- **Co-pilot (default):** AI ingests, researches, drafts and suggests; a human approves
  before anything publishes/sends. Guardrails on (SEO gate, review, "no fake data").
- **Autopilot (opt-in):** the same pipeline runs **end-to-end with no human gate** —
  ingest → generate → publish/answer/schedule automatically — with monitoring, rate limits
  and safety rules. This is the "fully automated if the customer wants" option and a premium tier.

### The reusable building blocks (the "primitives")
1. **Signal / Trend Radar** — "what's in demand right now", scoped + categorized (works for
   news topics, products, travel demand, job markets, support issues…).
2. **Ingestion → classify → route** — take an incoming stream and send each item to the right
   place (wire articles → portals; orders → fulfilment; listings → owners; tickets → queues).
3. **AI generation conditioned on a profile/voice** — brand-specific copy, descriptions, replies.
4. **Kanban "cells" with staged human-in-the-loop** — any workflow, with optional Autopilot.
5. **Missing-info detection + auto-complete** — find what's incomplete and fill it in.
6. **Automated answers / responses** — Q&A, reviews, support, follow-ups.
7. **Multi-channel publish / schedule / notify** + **analytics & guardrails**.
8. **Low-code automation layer (n8n) + pluggable connectors** — new client = new connectors + profiles.

### Adjacent verticals (same engine, different "cell")
| Field | Customer | The "work cell" | Trend/signal angle | Key automations | Missing-info / auto-answer |
|------|----------|-----------------|--------------------|-----------------|----------------------------|
| **Media** (core) | Publisher networks & independent media | Story | What's trending now | Draft, route, SEO, social, (Autopilot publish) | — |
| **E-shops / e-commerce** | Online stores | Product / order | Demand radar: what to stock & promote | Auto product descriptions + SEO + social campaigns; **order → pack → ship → deliver** board with auto status updates, delivery scheduling & restock alerts | Detect missing product info (specs, photos, sizes) → auto-fill |
| **Short-term rentals (Airbnb)** | Hosts / property managers | Listing / booking | Demand & event-based pricing radar | Cleaning/turnover scheduling, automated guest messaging, review responses, calendar sync | Detect missing listing info (amenities, photos, house rules) → auto-complete; **automated guest Q&A** |
| **Real estate** | Agencies | Listing / lead | Local market radar | Auto listing copy → portals; lead auto-reply & follow-up | Missing listing data → auto-fill |
| **Marketing / SMM agencies** | Agencies running many clients | Content per client | Per-client trend radar | Multi-tenant scheduling across brands (each client = a "portal") | Brand-voice profiles (already core) |
| **Hospitality / hotels** | Hotels | Reservation / guest | Demand & pricing radar | Guest messaging, upsell, ops board | Missing guest/profile info → auto-answers |
| **Customer support / helpdesk** | Any business | Ticket | Issue/FAQ trend radar | Auto-draft answers, route, escalate (Autopilot for tier-1) | Missing-info detection → ask or auto-answer |
| **Recruiting / HR** | Companies & agencies | Candidate / job | Hiring-demand radar | Auto job posts to boards; candidate auto-replies; pipeline board | Incomplete applications → request/auto-fill |
| **Local services / restaurants** | SMBs | Order / reservation / promo | Local trend radar | Menu/promo content, review responses, order ops board | Missing menu/profile info → auto-fill |

### Why this matters (for the deck & the budget)
- **One codebase, vertical templates:** a new field ≈ swap connectors + profiles + the board's
  stage names. The hard parts (radar, AI generation, the board, automation, guardrails) are shared.
- **Bigger TAM:** from "Greek media groups" to "any content/ops team that repeats a daily cycle".
- **Productization path:** turn the connectors + brand/voice profiles into configuration, add
  multi-tenant billing, and ship a "starter template" per vertical. This is the **"Platform"
  budget scenario** in Deliverable B.

## 11. WHAT THE BUDGET MUST COVER (cost dimensions for Deliverable B)

Use these as the line items; validate prices against current rates (flag estimates):

- **People** (the core question — size both a "Maintain" and a "Grow" team):
  - Engineering: frontend (Next.js/React), backend/automation (n8n + Node service),
    a part-time DevOps for hosting/CI/secrets.
  - AI/Integration: someone owning the Claude prompts, trend connectors, and the
    WP/GA4/social integrations (this is where the "stubbed" items get finished).
  - Product/Project lead (also handles client onboarding).
  - Editorial/Customer success (trains newsrooms, configures brand profiles & SEO rules).
  - Sales / business development (for the "Grow" scenario).
  - Support / QA.
- **Infrastructure / hosting** (recurring): app hosting (Vercel), trend service hosting +
  storage (Railway), **n8n Cloud** plan, a database/backups budget, domain/SSL, error/uptime monitoring.
- **Third-party APIs & AI usage** (recurring, scales with volume): **Anthropic Claude**
  tokens (drafting + research + idea generation), **Apify** (Google Trends / social scrapers,
  pay-per-result), YouTube Data API (free tier today), and any paid social-discovery provider
  if TikTok/X/Instagram are enabled.
- **One-off / project**: finishing the WP + social publishing integrations, GA4 wiring,
  security review, and per-client onboarding effort.
- **Sales & marketing**: demos, website, content, travel; CRM.
- **Contingency**: ~10–15%.

**Scale assumptions to budget against (state these):** a reference network of ~6–7 portals;
on-demand AI generation (cost grows with how many ideas/drafts are produced per day);
Greek-language market; small in-house team to start.

## 12. ROADMAP (suggested — refine in the deck)

- **0–3 months (make it sellable):** finish WordPress publishing, wire GA4 KPIs, finish
  social publishing/scheduling (Meta/TikTok), harden auth/security, first paying pilot.
- **3–6 months (grow):** add paid trend sources (TikTok/X/IG), analytics on AI output
  performance, multi-tenant onboarding flow, billing.
- **6–12 months (scale):** A/B headline testing, recommendation of best portal+time to publish,
  white-label, and the **first non-media vertical template** (e-commerce or short-term rentals,
  per Section 10) + multi-tenant billing — the move from "media product" to "platform".

## 13. GLOSSARY (for non-technical readers)

- **Portal** = one of the network's websites (e.g. a sports site).
- **Cell / board** = a story card on the kanban production board.
- **Wire / AMNA (ΑΠΕ-ΜΠΕ)** = the national news agency feed we ingest.
- **n8n** = a low-code automation tool that runs our scheduled/background jobs.
- **Claude** = the AI model (Anthropic) used for drafting, research and ideas.
- **SEO gate** = a rule that blocks publishing an article with critical SEO problems.
- **GA4 / WP REST** = Google Analytics 4 / the WordPress API (metrics & publishing).

---

*Repo deep-dives (for the technical reviewer): `docs/NEWSROOM.md`, `docs/TREND-RADAR.md`,
`docs/AMNA-NEWSFEED.md`, `docs/SOCIAL-RADAR.md`, `docs/SEO-AGENT.md`, `docs/DEPLOY-VERCEL.md`,
and the Storybook docs (`src/stories/*`).*
