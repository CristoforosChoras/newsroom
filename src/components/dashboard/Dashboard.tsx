"use client";

import Link from "next/link";
import {
  Activity,
  ChevronRight,
  Clock,
  FileText,
  Gauge,
  Globe,
  History,
  Link2,
  PieChart,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { SITES, VERTICALS, siteById } from "@/lib/config/sites";
import { T } from "@/lib/config/strings";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { scopeKpi, scopeWeek } from "@/lib/utils/kpi";
import { timeHM } from "@/lib/utils/time";
import Panel from "@/components/ui/Panel";
import Eyebrow from "@/components/ui/Eyebrow";
import Stat from "@/components/ui/Stat";
import Button from "@/components/ui/Button";
import SiteTag from "@/components/ui/SiteTag";
import StatusLight from "@/components/ui/StatusLight";
import SlaClock from "@/components/ui/SlaClock";
import styles from "./Dashboard.module.css";

const SEO_LABEL = T.dashboard.seoLabel;
const CHART_ORANGE = "#7961f5"; // brand accent (onlygroup)

// number / unit formatters
const fmtNum = (n: number): string => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
};
const fmtPct = (x: number): string => `${(x * 100).toFixed(1)}%`;
const fmtDur = (s: number): string => {
  if (s < 0) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m ? `${m}′ ${sec}″` : `${sec}″`;
};

export default function Dashboard() {
  const scope = useNewsroom((s) => s.scope);
  const setScope = useNewsroom((s) => s.setScope);
  const cells = useNewsroom((s) => s.cells);
  const siteKpi = useNewsroom((s) => s.siteKpi);
  const reports = useNewsroom((s) => s.reports);
  const trends = useNewsroom((s) => s.trends);
  const network = useNewsroom((s) => s.network);
  const kpiMeta = useNewsroom((s) => s.kpiMeta);
  const kpiWindow = useNewsroom((s) => s.kpiWindow);
  const setKpiWindow = useNewsroom((s) => s.setKpiWindow);
  const runSeoRetro = useNewsroom((s) => s.runSeoRetro);
  const state = useNewsroom();

  const k = scopeKpi(state, scope, kpiWindow);
  const week = scopeWeek(state, scope, kpiWindow);
  const hasMetrics = Object.keys(siteKpi).length > 0;
  const windows = kpiMeta?.windows ?? ["today", "7d", "28d"];
  const finality = kpiMeta?.finalityByWindow?.[kpiWindow] ?? k.finality;
  const flags = kpiMeta?.flags;

  // SEO retro (latest for scope)
  const seoRetros = reports.filter((r) => r.type === "seo_retro");
  const want = scope === "all" ? "all" : scope;
  const retro =
    seoRetros.filter((r) => r.site === want).sort((a, b) => b.date - a.date)[0] ??
    seoRetros.sort((a, b) => b.date - a.date)[0];
  const top =
    scope === "all"
      ? network.topArticles
      : network.topArticles.filter((a) => a.site === scope);
  const breaking = cells.filter(
    (c) =>
      c.urgency === "breaking" &&
      c.status !== "published" &&
      (scope === "all" || c.site === scope),
  );
  const trendingNow = (
    scope === "all" ? trends : trends.filter((t) => t.site === scope)
  ).slice(0, 3);

  // breakdowns for the active scope + window (fallback to 7d when a window lacks them)
  const site = scope !== "all" ? siteKpi[scope] : null;
  const channels =
    scope === "all"
      ? (network.channels ?? []).map((c) => ({ channel: c.channel, sessions: c.sessions }))
      : site?.channels?.[kpiWindow] ?? site?.channels?.["7d"] ?? [];
  const pages = site ? site.topPages?.[kpiWindow] ?? site.topPages?.["7d"] ?? [] : [];
  const landing = site ? site.topLanding?.[kpiWindow] ?? site.topLanding?.["7d"] ?? [] : [];

  // window-aware per-portal headline (pageviews + delta)
  const portalMetric = (id: string): { v: number; delta: number } => {
    const pk = siteKpi[id];
    const m = pk?.byWindow?.[kpiWindow];
    if (m) return { v: m.screenPageViews, delta: (m.deltas && m.deltas.screenPageViews) || 0 };
    return { v: pk?.views ?? 0, delta: pk?.delta ?? 0 };
  };

  // scorecard tiles
  const tiles: { key: string; value: string; approx?: boolean }[] = [
    { key: "activeUsers", value: fmtNum(k.activeUsers), approx: k.approxUsers },
    { key: "newUsers", value: fmtNum(k.newUsers), approx: k.approxUsers },
    { key: "sessions", value: fmtNum(k.sessions) },
    { key: "engagedSessions", value: fmtNum(k.engagedSessions) },
    { key: "engagementRate", value: fmtPct(k.engagementRate) },
    { key: "avgEngagementTime", value: fmtDur(k.avgEngagementTime) },
    { key: "screenPageViews", value: fmtNum(k.screenPageViews) },
    { key: "keyEvents", value: fmtNum(k.keyEvents) },
  ];
  const deltaSub = (key: string): string | undefined => {
    const d = k.deltas?.[key];
    if (d == null) return undefined;
    return `${d >= 0 ? "▲" : "▼"} ${Math.abs(d)}% · ${T.kpi.vsPrev}`;
  };
  const deltaColor = (key: string): string =>
    (k.deltas?.[key] ?? 0) >= 0 ? "var(--green)" : "var(--red)";

  return (
    <div className={styles.wrap}>
      {/* portals — the network hero */}
      <Panel>
        <Eyebrow icon={Globe}>
          {T.dashboard.networkHero(
            scope === "all"
              ? T.dashboard.portalsCount(SITES.length)
              : siteById(scope)?.name ?? "",
          )}
        </Eyebrow>
        <div className={styles.portals}>
          {SITES.map((s) => {
            const sk = siteKpi[s.id] ?? {
              views: 0,
              delta: 0,
              articles: 0,
              seo: "amber" as const,
              wp: false,
            };
            const pm = portalMetric(s.id);
            const active = scope === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setScope(active ? "all" : s.id)}
                className={[styles.portal, active ? styles.portalActive : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={styles.portalHead}>
                  <span
                    className={styles.portalDot}
                    style={{ background: s.color }}
                  />
                  <span className={styles.portalName}>{s.name}</span>
                  <span style={{ marginLeft: "auto" }}>
                    <StatusLight s={sk.wp ? sk.seo : "red"} />
                  </span>
                </div>
                <div className={styles.portalVert}>{VERTICALS[s.vertical]}</div>
                <div className={styles.portalViews}>
                  {hasMetrics ? fmtNum(pm.v) : "—"}
                </div>
                <div
                  className={styles.portalDelta}
                  style={{
                    color: !hasMetrics
                      ? undefined
                      : pm.delta >= 0
                        ? "var(--green)"
                        : "var(--red)",
                  }}
                >
                  {hasMetrics
                    ? T.dashboard.deltaToday(pm.delta >= 0 ? "▲" : "▼", Math.abs(pm.delta))
                    : T.dashboard.noGa4Short}
                </div>
                <div className={styles.portalWp} style={{ color: "var(--dim)" }}>
                  <Link2 size={11} />
                  {s.wp}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* KPI stat cards — only when a metrics backend exists */}
      {!hasMetrics && (
        <Panel className={styles.noData}>{T.dashboard.metricsUnavailable}</Panel>
      )}
      {hasMetrics && (
        <>
          {/* window picker + freshness/finality + sampling warnings */}
          <div className={styles.kpiBar}>
            <div className={styles.windowPicker}>
              {windows.map((w) => (
                <button
                  key={w}
                  className={[styles.winTab, w === kpiWindow ? styles.winTabOn : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setKpiWindow(w)}
                >
                  {T.kpi.windows[w] ?? w}
                </button>
              ))}
            </div>
            <div className={styles.freshness}>
              {finality && (
                <span
                  className={[
                    styles.finBadge,
                    finality === "final" ? styles.finFinal : styles.finPrelim,
                  ].join(" ")}
                  title={finality === "final" ? T.kpi.finalHelp : T.kpi.prelimHelp}
                >
                  {finality === "final" ? T.kpi.final : T.kpi.preliminary}
                </span>
              )}
              {kpiMeta?.lastUpdated ? (
                <span className={styles.updated}>
                  <Clock size={11} /> {T.kpi.updated(timeHM(kpiMeta.lastUpdated))}
                </span>
              ) : null}
            </div>
          </div>
          {(flags?.sampled || flags?.thresholded) && (
            <Panel className={styles.warnPanel}>
              {flags?.sampled && <div>{T.kpi.sampledWarn}</div>}
              {flags?.thresholded && <div>{T.kpi.threshWarn}</div>}
            </Panel>
          )}

          <div className={styles.stats}>
            {tiles.map((t) => (
              <Stat
                key={t.key}
                label={`${T.kpi.metrics[t.key] ?? t.key}${t.approx ? " ≈" : ""}`}
                value={t.value}
                sub={deltaSub(t.key) ?? (t.approx ? T.kpi.approxUsers : "")}
                subColor={deltaSub(t.key) ? deltaColor(t.key) : "var(--dim)"}
              />
            ))}
          </div>
        </>
      )}

      <div className={styles.grid}>
        <Panel>
          <Eyebrow icon={Activity}>
            {T.dashboard.pageviews7d}{" "}
            {scope !== "all" && `· ${siteById(scope)?.name}`}
          </Eyebrow>
          {week.length === 0 ? (
            <div className={styles.empty}>{T.dashboard.noPageviews}</div>
          ) : (
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={week} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_ORANGE} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_ORANGE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="d"
                    tick={{ fill: "#5a5a63", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--text)",
                    }}
                    labelStyle={{ color: "#8b8b95" }}
                    formatter={(value) => [`${value}K`, "views"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={CHART_ORANGE}
                    strokeWidth={2}
                    fill="url(#g)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className={styles.topWrap}>
            <Eyebrow icon={FileText}>
              {site ? T.kpi.topPages : T.dashboard.topArticles}
            </Eyebrow>
            {site ? (
              pages.length === 0 ? (
                <div className={styles.empty}>{T.dashboard.noTopArticles}</div>
              ) : (
                pages.slice(0, 5).map((p, i) => (
                  <div key={i} className={styles.topRow}>
                    <span className={styles.topRank}>{i + 1}</span>
                    <span className={styles.topTitle}>{p.title}</span>
                    <span className={styles.topViews}>{fmtNum(p.views)}</span>
                  </div>
                ))
              )
            ) : top.length === 0 ? (
              <div className={styles.empty}>{T.dashboard.noTopArticles}</div>
            ) : (
              top.map((a, i) => (
                <div key={i} className={styles.topRow}>
                  <span className={styles.topRank}>{i + 1}</span>
                  <SiteTag id={a.site} small />
                  <span className={styles.topTitle}>{a.t}</span>
                  <span className={styles.topViews}>{fmtNum(a.v)}</span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <div className={styles.rightCol}>
          {/* acquisition channels */}
          {hasMetrics && (
            <Panel>
              <Eyebrow icon={PieChart}>{T.kpi.acquisition}</Eyebrow>
              {channels.length === 0 ? (
                <div className={styles.empty}>{T.dashboard.noPageviews}</div>
              ) : (
                channels.slice(0, 6).map((c, i) => (
                  <div key={i} className={styles.acqRow}>
                    <span className={styles.acqName}>{c.channel}</span>
                    <span className={styles.acqVal}>{fmtNum(c.sessions)}</span>
                  </div>
                ))
              )}
            </Panel>
          )}

          {/* top landing pages (per-site) */}
          {site && landing.length > 0 && (
            <Panel>
              <Eyebrow icon={FileText}>{T.kpi.topLanding}</Eyebrow>
              {landing.slice(0, 5).map((l, i) => (
                <div key={i} className={styles.acqRow}>
                  <span className={styles.acqName}>{l.landingPage}</span>
                  <span className={styles.acqVal}>{fmtNum(l.sessions)}</span>
                </div>
              ))}
            </Panel>
          )}

          <Panel>
            <div className={styles.panelHead}>
              <Eyebrow icon={Gauge}>{T.dashboard.seoYesterday}</Eyebrow>
              <Button variant="ghost" small icon={History} onClick={runSeoRetro}>
                {T.dashboard.seoYesterdayShort}
              </Button>
            </div>
            {retro ? (
              <>
                <div className={styles.seoStatus}>
                  <StatusLight s={retro.status} />
                  <span className={styles.seoLabel}>{SEO_LABEL[retro.status]}</span>
                  <span className={styles.seoTime}>{timeHM(retro.date)}</span>
                </div>
                {(retro.issues ?? []).slice(0, 4).map((is, i) => (
                  <div key={i} className={styles.seoItem}>
                    <StatusLight s={is.class === "critical" ? "red" : "amber"} />
                    <span className={styles.seoItemKey}>{is.label}</span>
                    <span className={styles.seoItemVal}>
                      {is.count}/{is.of}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <div className={styles.empty}>{T.dashboard.seoNotRun}</div>
            )}
          </Panel>

          <Panel>
            <div className={styles.panelHead}>
              <Eyebrow icon={TrendingUp}>{T.dashboard.trendingNow}</Eyebrow>
              <Link href="/trends" className={styles.allLink}>
                {T.dashboard.all} <ChevronRight size={13} />
              </Link>
            </div>
            {trendingNow.map((t) => (
              <div key={t.id} className={styles.trendRow}>
                <SiteTag id={t.site} small />
                <span className={styles.trendTopic}>{t.topic}</span>
                <span className={styles.trendVel}>{t.velocity}</span>
              </div>
            ))}
            {trendingNow.length === 0 && (
              <div className={styles.empty}>{T.dashboard.noTrend}</div>
            )}
          </Panel>
        </div>
      </div>

      {breaking.length > 0 && (
        <Panel style={{ borderColor: "var(--orange-line)" }}>
          <Eyebrow icon={Zap}>{T.dashboard.breakingQueue}</Eyebrow>
          <div className={styles.breakingList}>
            {breaking.map((c) => (
              <div key={c.id} className={styles.breakingRow}>
                <span className={`${styles.breakingDot} pulse`} />
                <span className={styles.breakingHeadline}>{c.headline}</span>
                <SiteTag id={c.site} />
                <span className={styles.breakingSource}>{c.source}</span>
                <div className={styles.breakingClock}>
                  {c.slaDeadline && <SlaClock deadline={c.slaDeadline} />}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
