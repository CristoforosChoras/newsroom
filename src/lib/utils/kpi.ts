import type { NewsroomState, Scope } from "@/lib/types";

export interface ScopedKpi {
  views: number;
  delta: number;
  articles: number;
  slaHit: number | null; // null = no breaking in queue → "—"
  seo: NewsroomState["seo"]["status"];
  wp: boolean;
}

// Real breaking-SLA from the board: % of queued breaking cells still on-track
// (deadline not passed). null when nothing breaking is in the queue.
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

const EMPTY: ScopedKpi = {
  views: 0,
  delta: 0,
  articles: 0,
  slaHit: null,
  seo: "amber",
  wp: false,
};

/** Derive KPIs for the active scope. `views`/`delta` are TODAY (per GA4); SLA is
 *  real (board-derived). Returns zeros when there is no metric data (no GA4). */
export function scopeKpi(d: NewsroomState, scope: Scope): ScopedKpi {
  const sites = Object.values(d.siteKpi);
  const sla = slaFromBoard(d, scope);
  if (scope !== "all") {
    const k = d.siteKpi[scope];
    return k ? { ...k, slaHit: sla } : { ...EMPTY, seo: d.seo.status, slaHit: sla };
  }
  if (sites.length === 0) return { ...EMPTY, seo: d.seo.status, slaHit: sla };
  const views = sites.reduce((n, s) => n + s.views, 0); // today
  const articles = sites.reduce((n, s) => n + s.articles, 0);
  return {
    views,
    delta: d.network.delta ?? 0, // real network today-vs-yesterday
    articles,
    slaHit: sla,
    seo: d.seo.status,
    wp: true,
  };
}

/** 7-day pageviews series, scaled to the active site's share when scoped. */
export function scopeWeek(
  d: NewsroomState,
  scope: Scope,
): { d: string; v: number }[] {
  if (scope === "all") return d.network.week;
  const total = Object.values(d.siteKpi).reduce((n, s) => n + s.views, 0);
  const k = d.siteKpi[scope];
  if (!k || total === 0) return d.network.week;
  return d.network.week.map((w) => ({
    d: w.d,
    v: +(w.v * (k.views / total)).toFixed(1),
  }));
}
