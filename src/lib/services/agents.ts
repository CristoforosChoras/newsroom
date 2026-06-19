import type {
  Cell,
  Finality,
  Gap,
  Idea,
  IdeaState,
  KpiFlags,
  NetworkState,
  RadarTrend,
  RetroIssue,
  RetroOffender,
  Scope,
  SiteKpi,
  Status,
  Trend,
  TrendIdeaDraft,
  TrendResearch,
  TrendScope,
} from "@/lib/types";
import { VERTICALS, siteById } from "@/lib/config/sites";
import { routeContent } from "@/lib/services/router";

/**
 * AI SERVICE SEAM.
 *
 * Each function calls its `/api/agents/*` proxy (which forwards to n8n/Claude).
 * Where a deterministic local equivalent exists (routing) we fall back to it on
 * failure so the UI keeps working offline; otherwise we return null and the store
 * surfaces an offline notice (no mock data).
 */

/* ───────────────────────── reroute ───────────────────────── */

export interface RouteResult {
  site: string | null;
  confidence: number;
  reason: string;
}

// Deterministic keyword router — also the offline fallback for the AI re-route.
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

// AI re-route via n8n + Claude (/api/agents/route). Falls back to the
// deterministic router on any failure so the button always returns a result.
export async function rerouteStory(cell: Cell): Promise<RouteResult> {
  try {
    const res = await fetch("/api/agents/route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        headline: cell.headline,
        event: cell.event,
        sourceText: cell.sourceText,
      }),
    });
    if (!res.ok) throw new Error(`route ${res.status}`);
    const data = (await res.json()) as RouteResult;
    if (typeof data.confidence !== "number") throw new Error("bad route payload");
    return data;
  } catch {
    return sampleRoute(cell);
  }
}

/* ───────────────────────── AI draft ───────────────────────── */

// Shape produced by the n8n "Story Draft API" (Claude). Targets the publish-gate
// fields in lib/config/seoCritical.ts: seoTitle === headline (the headline_match
// critical check), meta present (120–160 advisory), body ≥150 words. The featured
// image stays the editor's job — the gate's only remaining critical blocker.
export interface DraftResult {
  headline?: string;
  titles: string[];
  seoTitle: string;
  meta: string;
  excerpt: string;
  keywords: string[];
  body: string; // HTML
}

// Generate an SEO draft for a cell via n8n + Claude (/api/agents/draft).
// Returns null on failure (store surfaces an offline notice — no mock).
export async function generateDraft(cell: Cell): Promise<DraftResult | null> {
  try {
    const res = await fetch("/api/agents/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        headline: cell.headline,
        event: cell.event,
        source: cell.source,
        sourceText: cell.sourceText,
        site: cell.site,
      }),
    });
    if (!res.ok) throw new Error(`draft ${res.status}`);
    const data = (await res.json()) as DraftResult;
    if (!Array.isArray(data.titles) || typeof data.body !== "string") {
      throw new Error("bad draft payload");
    }
    return data;
  } catch {
    return null;
  }
}

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
  // enriched snapshot metadata (optional → back-compat with older webhook builds)
  lastUpdated?: number;
  windows?: string[];
  defaultWindow?: string;
  flags?: KpiFlags;
  finalityByWindow?: Record<string, Finality>;
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

/* ──────────────────── AMNA ingestion control ──────────────────── */

// Cadence for the AMNA wire crawl, in minutes. 0 = manual-only. Stored in n8n
// (trend_config) and read/written via /api/agents/amna-config.
export interface AmnaConfig {
  intervalMin: number;
  lastRunMs: number;
}

export async function getAmnaConfig(): Promise<AmnaConfig | null> {
  try {
    const res = await fetch("/api/agents/amna-config", { cache: "no-store" });
    if (!res.ok) throw new Error(`amna-config ${res.status}`);
    return (await res.json()) as AmnaConfig;
  } catch {
    return null;
  }
}

// Persist the cadence. Pass null/0 for manual-only. Returns the stored config.
export async function setAmnaInterval(
  intervalMin: number | null,
): Promise<AmnaConfig | null> {
  try {
    const res = await fetch("/api/agents/amna-config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intervalMin }),
    });
    if (!res.ok) throw new Error(`amna-config ${res.status}`);
    return (await res.json()) as AmnaConfig;
  } catch {
    return null;
  }
}

// Manually kick a wire crawl now. Resolves true once n8n has accepted the run
// (the crawl then completes server-side over the next few minutes).
export async function runAmnaIngest(): Promise<boolean> {
  try {
    const res = await fetch("/api/agents/amna-run", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

/* ──────────────────── Trend Radar (Global/Greece) ──────────────────── */

// Unfiltered trend feed for a scope. scan=true forces a recompute (slower);
// default GET reads the stored feed. Returns null on failure (no mock).
export async function getRadarTrends(
  scope: TrendScope,
  scan = false,
): Promise<RadarTrend[] | null> {
  try {
    const res = await fetch(`/api/agents/trend-radar?scope=${scope}`, {
      method: scan ? "POST" : "GET",
    });
    if (!res.ok) throw new Error(`trend-radar ${res.status}`);
    const data = (await res.json()) as RadarTrend[];
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// Research WHY a trend is trending now (Claude web search) → reason + sources.
export async function researchTrend(trendId: string): Promise<TrendResearch | null> {
  try {
    const res = await fetch("/api/agents/trend-research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trendId }),
    });
    if (!res.ok) throw new Error(`trend-research ${res.status}`);
    const data = (await res.json()) as { research: TrendResearch | null };
    return data.research ?? null;
  } catch {
    return null;
  }
}

// Generate per-brand content ideas (Claude), grounded in the trend's research.
// Returns the drafts + the research context used (or null on failure).
export async function generateTrendIdeas(
  trendId: string,
  profileIds: string[],
): Promise<{ drafts: TrendIdeaDraft[]; research: TrendResearch | null } | null> {
  try {
    const res = await fetch("/api/agents/trend-idea", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trendId, profileIds }),
    });
    if (!res.ok) throw new Error(`trend-idea ${res.status}`);
    const data = (await res.json()) as {
      drafts: TrendIdeaDraft[];
      research: TrendResearch | null;
    };
    return { drafts: data.drafts ?? [], research: data.research ?? null };
  } catch {
    return null;
  }
}
