import type { NewsroomState, Scope, KpiMetrics, Finality } from "@/lib/types";

// Aggregation for the active scope + window. This is the SINGLE source of derived
// KPI numbers (dashboard + reports) so totals never drift. For the network scope
// it uses the backend's clean per-window totals (never re-summing rows); for a
// single site it reads that site's window metrics.

export interface ScopedKpi {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  engagedSessions: number;
  engagementRate: number; // 0..1
  avgEngagementTime: number; // seconds (per-site only; -1 = N/A at network level)
  screenPageViews: number;
  keyEvents: number;
  conversionRate: number;
  deltas: Record<string, number>; // % vs previous equal-length period
  finality: Finality | null;
  approxUsers: boolean; // network rollup → activeUsers/newUsers are approximate sums
  // back-compat + board-derived
  views: number; // = screenPageViews for the window
  delta: number; // = screenPageViews delta
  articles: number;
  slaHit: number | null;
  seo: NewsroomState["seo"]["status"];
  wp: boolean;
}

const GR = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"];
const greekDay = (d: string): string => {
  const dt = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8)));
  return GR[dt.getUTCDay()];
};

// Real breaking-SLA from the board: % of queued breaking cells still on-track.
function slaFromBoard(d: NewsroomState, scope: Scope): number | null {
  const now = Date.now();
  const brk = d.cells.filter(
    (c) =>
      c.urgency === "breaking" &&
      c.status !== "published" &&
      (scope === "all" || c.site === scope),
  );
  if (brk.length === 0) return null;
  const overdue = brk.filter((c) => c.slaDeadline != null && c.slaDeadline < now).length;
  return Math.round((1 - overdue / brk.length) * 100);
}

const ZERO = {
  activeUsers: 0,
  newUsers: 0,
  sessions: 0,
  engagedSessions: 0,
  engagementRate: 0,
  avgEngagementTime: 0,
  screenPageViews: 0,
  keyEvents: 0,
  conversionRate: 0,
  deltas: {} as Record<string, number>,
  finality: null as Finality | null,
  approxUsers: false,
  views: 0,
  delta: 0,
  articles: 0,
};

function fromMetrics(
  m: KpiMetrics,
  extra: { articles: number; seo: ScopedKpi["seo"]; wp: boolean; slaHit: number | null; approxUsers: boolean },
): ScopedKpi {
  return {
    activeUsers: m.activeUsers,
    newUsers: m.newUsers,
    sessions: m.sessions,
    engagedSessions: m.engagedSessions,
    engagementRate: m.engagementRate,
    avgEngagementTime: m.avgEngagementTime,
    screenPageViews: m.screenPageViews,
    keyEvents: m.keyEvents,
    conversionRate: m.conversionRate,
    deltas: m.deltas ?? {},
    finality: m.finality ?? null,
    approxUsers: extra.approxUsers,
    views: m.screenPageViews,
    delta: (m.deltas && m.deltas.screenPageViews) || 0,
    articles: extra.articles,
    slaHit: extra.slaHit,
    seo: extra.seo,
    wp: extra.wp,
  };
}

/** Derive KPIs for the active scope + window. Network scope uses clean per-window
 *  totals (activeUsers approximate); a site reads its window metrics. Returns
 *  zeros when there is no GA4 data. */
export function scopeKpi(d: NewsroomState, scope: Scope, window = "7d"): ScopedKpi {
  const sla = slaFromBoard(d, scope);

  if (scope !== "all") {
    const k = d.siteKpi[scope];
    const m = k?.byWindow?.[window];
    if (m) {
      return fromMetrics(m, {
        articles: k.articles ?? 0,
        seo: d.seo.status,
        wp: k.wp ?? false,
        slaHit: sla,
        approxUsers: false,
      });
    }
    // legacy snapshot (pre-enrichment) → only views/delta available
    return {
      ...ZERO,
      views: k?.views ?? 0,
      screenPageViews: k?.views ?? 0,
      delta: k?.delta ?? 0,
      articles: k?.articles ?? 0,
      seo: d.seo.status,
      wp: k?.wp ?? false,
      slaHit: sla,
    };
  }

  // network rollup
  const nw = d.network.byWindow?.[window];
  if (nw) {
    const sessions = nw.totals.sessions;
    return {
      activeUsers: nw.activeUsersApprox,
      newUsers: nw.newUsersApprox,
      sessions,
      engagedSessions: nw.totals.engagedSessions,
      engagementRate: sessions ? nw.totals.engagedSessions / sessions : 0,
      avgEngagementTime: -1, // not summable across properties → N/A at network level
      screenPageViews: nw.totals.screenPageViews,
      keyEvents: nw.totals.keyEvents,
      conversionRate: sessions ? nw.totals.keyEvents / sessions : 0,
      deltas: nw.deltas ?? {},
      finality: nw.finality ?? null,
      approxUsers: true,
      views: nw.totals.screenPageViews,
      delta: (nw.deltas && nw.deltas.screenPageViews) || 0,
      articles: Object.values(d.siteKpi).reduce((n, s) => n + (s.articles || 0), 0),
      slaHit: sla,
      seo: d.seo.status,
      wp: true,
    };
  }

  // legacy network (pre-enrichment)
  const sites = Object.values(d.siteKpi);
  if (sites.length === 0)
    return { ...ZERO, seo: d.seo.status, wp: false, slaHit: sla };
  const views = sites.reduce((n, s) => n + (s.views || 0), 0);
  return {
    ...ZERO,
    views,
    screenPageViews: views,
    delta: d.network.delta ?? 0,
    articles: sites.reduce((n, s) => n + (s.articles || 0), 0),
    seo: d.seo.status,
    wp: true,
    slaHit: sla,
    approxUsers: true,
  };
}

/** Daily pageviews series (in thousands) for the scope + window, with per-day
 *  finality. Real per-site series (no faked share-scaling); network = sum of
 *  per-site series for the window. */
export function scopeWeek(
  d: NewsroomState,
  scope: Scope,
  window = "7d",
): { d: string; v: number; finality?: Finality }[] {
  if (scope === "all") {
    const map: Record<string, number> = {};
    const fin: Record<string, Finality> = {};
    for (const s of Object.values(d.siteKpi)) {
      const ser = s.series?.[window] ?? [];
      for (const p of ser) {
        map[p.date] = (map[p.date] || 0) + p.screenPageViews;
        fin[p.date] = p.finality;
      }
    }
    const dates = Object.keys(map).sort();
    if (dates.length) {
      return dates.map((dt) => ({
        d: greekDay(dt),
        v: +(map[dt] / 1000).toFixed(1),
        finality: fin[dt],
      }));
    }
    return d.network.week; // legacy fallback
  }
  const k = d.siteKpi[scope];
  const series = k?.series?.[window] ?? k?.series?.["7d"];
  if (series && series.length) {
    return series.map((p) => ({
      d: greekDay(p.date),
      v: +(p.screenPageViews / 1000).toFixed(1),
      finality: p.finality,
    }));
  }
  // legacy fallback: scale the network week by the site's share
  const total = Object.values(d.siteKpi).reduce((n, s) => n + (s.views || 0), 0);
  if (!k || total === 0) return d.network.week;
  return d.network.week.map((w) => ({ d: w.d, v: +(w.v * (k.views / total)).toFixed(1) }));
}
