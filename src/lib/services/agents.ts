import type {
  Cell,
  Gap,
  Idea,
  IdeaState,
  NetworkState,
  RetroIssue,
  RetroOffender,
  Scope,
  SiteKpi,
  Status,
  Trend,
} from "@/lib/types";
import { VERTICALS, siteById } from "@/lib/config/sites";
import { routeContent } from "@/lib/services/router";

/**
 * AI SERVICE SEAM — the whole point of this iteration.
 *
 * Today every function returns deterministic/sample data after a short delay so
 * the frontend is fully functional offline. Next iteration: flip USE_BACKEND to
 * true and implement the `/api/agents/*` route handlers (which proxy n8n/Claude)
 * inside `call()`. No component or store code needs to change.
 */
const USE_BACKEND = false;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call<T>(stub: () => T): Promise<T> {
  if (!USE_BACKEND) {
    await delay(450);
    return stub();
  }
  // TODO(backend): POST to /api/agents/* which proxies n8n/Claude, parse the
  // JSON response (use lib/utils/json.ts → parseJSON for tolerant parsing) and
  // return it shaped like the stubs below.
  throw new Error("backend not wired");
}

/* ───────────────────────── reroute ───────────────────────── */

export interface RouteResult {
  site: string | null;
  confidence: number;
  reason: string;
}

function sampleRoute(cell: Cell): RouteResult {
  const r = routeContent(`${cell.headline} ${cell.event}`);
  if (r.site) {
    const s = siteById(r.site)!;
    return {
      site: r.site,
      confidence: r.confidence,
      reason: `Αντιστοίχιση στο ${s.name} βάσει vertical «${VERTICALS[s.vertical]}» και keywords στο περιεχόμενο.`,
    };
  }
  return {
    site: cell.site,
    confidence: cell.confidence ?? 60,
    reason:
      "Δεν εντοπίστηκε καθαρό vertical — προτείνεται χειροκίνητη επιβεβαίωση.",
  };
}

export const rerouteStory = (cell: Cell): Promise<RouteResult> =>
  call(() => sampleRoute(cell));

/* ──────────────────── Social Radar (trends + gaps) ──────────────────── */

// ONE engine. /api/agents/ideas proxies the standalone Social Radar service and
// returns ranked Ideas; the Trends page projects them as Trend, the Content Gap
// page as Gap. Returns null on failure — NO mock (store surfaces an error).

async function getIdeas(
  scope: Scope,
  filter: { type?: "trend" | "gap" },
): Promise<Idea[] | null> {
  try {
    const qs = new URLSearchParams();
    if (scope && scope !== "all") qs.set("scope", scope);
    if (filter.type) qs.set("type", filter.type);
    const q = qs.toString();
    // GET = read the stored board (instant). The service recomputes on its own
    // schedule (daily cron + background seed); a full recompute is far too slow to
    // block a click. POST /api/agents/ideas remains available to force a refresh.
    const res = await fetch(`/api/agents/ideas${q ? `?${q}` : ""}`, {
      method: "GET",
    });
    if (!res.ok) throw new Error(`ideas route ${res.status}`);
    const data = (await res.json()) as Idea[];
    if (!Array.isArray(data)) throw new Error("bad ideas payload");
    return data;
  } catch {
    return null;
  }
}

function ideaToTrend(i: Idea): Trend {
  const cov = i.supply.ourCoverage;
  return {
    id: i.id,
    topic: i.title,
    site: i.site,
    velocity: i.velocity,
    platform: i.platforms.join(" · "),
    note: i.angleGr,
    entities: i.entities,
    lifecycle: i.lifecycle,
    platforms: i.platforms,
    suggestedSites: i.suggestedSites?.map((s) => ({
      site: s.site,
      confidence: s.confidence,
    })),
    coverage: {
      status: cov === "none" ? "gap" : cov === "weak" ? "partial" : "covered",
      freshestUrl: i.supply.freshestUrl,
    },
    angleGr: i.angleGr,
    sampledAt: i.sampledAt,
    evidence: i.sources,
  };
}

function ideaToGap(i: Idea): Gap {
  const cov = i.supply.ourCoverage;
  return {
    id: i.id,
    idea: i.title,
    type: i.format,
    site: i.site,
    demand: i.demand,
    reason: i.demandSignal,
    ideaType: i.ideaType,
    demandSignal: i.demandSignal,
    winnability: i.winnability,
    angleGr: i.angleGr,
    briefGr: i.briefGr,
    crossMedia: i.crossMedia,
    lifecycle: i.lifecycle,
    platforms: i.platforms,
    suggestedSites: i.suggestedSites?.map((s) => ({
      site: s.site,
      confidence: s.confidence,
    })),
    coverage: {
      status: cov === "none" ? "gap" : cov === "weak" ? "partial" : "covered",
      freshestUrl: i.supply.freshestUrl,
    },
    sources: i.sources,
    state: i.state,
    sampledAt: i.sampledAt,
  };
}

export async function scanTrends(scope: Scope): Promise<Trend[] | null> {
  const ideas = await getIdeas(scope, { type: "trend" });
  return ideas ? ideas.map(ideaToTrend) : null;
}

export async function findGaps(scope: Scope): Promise<Gap[] | null> {
  const ideas = await getIdeas(scope, { type: "gap" });
  return ideas ? ideas.map(ideaToGap) : null;
}

// Idea state write-back (assign / dismiss / seen) → keeps tomorrow's list clean.
export async function setIdeaState(
  id: string,
  state: IdeaState,
): Promise<boolean> {
  try {
    const res = await fetch("/api/agents/ideas", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, state }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ───────────────────────── AMNA inbox (wire ingestion) ───────────────────────── */

// Pull ingested wire articles (already routed + rewritten by n8n) as ready Cells.
// Returns null on failure (store surfaces an error). NO mock.
export async function getInbox(): Promise<Cell[] | null> {
  try {
    const res = await fetch("/api/agents/inbox", { method: "POST" });
    if (!res.ok) throw new Error(`inbox route ${res.status}`);
    const data = (await res.json()) as Cell[];
    if (!Array.isArray(data)) throw new Error("bad inbox payload");
    return data;
  } catch {
    return null;
  }
}

/* ───────────────────────── kpi ───────────────────────── */

export interface KpiResult {
  siteKpi: Record<string, SiteKpi>;
  network: NetworkState;
  generatedAt: number;
}

// Real KPI metrics from /api/agents/kpi (proxies the n8n KPI agent: GA4 pageviews
// + WP REST article counts). Returns null on failure — NO mock.
export async function getKpi(): Promise<KpiResult | null> {
  try {
    const res = await fetch("/api/agents/kpi", { method: "POST" });
    if (!res.ok) throw new Error(`kpi route ${res.status}`);
    const data = (await res.json()) as KpiResult;
    if (!data || typeof data.siteKpi !== "object") throw new Error("bad kpi payload");
    return data;
  } catch {
    return null;
  }
}

/* ───────────────────────── seo retrospective ───────────────────────── */

export interface SeoRetroSite {
  grade: Status;
  volume?: { published: number; audited: number; skippedPartner: number };
  issues: RetroIssue[];
  offenders?: RetroOffender[];
  lessons?: string[];
}
export interface SeoRetroResult {
  source?: string;
  generatedAt: number;
  day: string;
  sites: Record<string, SeoRetroSite>;
  network?: { grade: Status };
}

// "What went wrong yesterday" — real backend via /api/agents/seo-retro.
// Returns null when unreachable (the store surfaces an offline notice).
export async function runSeoRetro(): Promise<SeoRetroResult | null> {
  try {
    const res = await fetch("/api/agents/seo-retro", { method: "POST" });
    if (!res.ok) throw new Error(`seo-retro route ${res.status}`);
    const data = (await res.json()) as SeoRetroResult;
    if (!data || !data.sites) throw new Error("bad seo-retro payload");
    return data;
  } catch {
    return null;
  }
}
