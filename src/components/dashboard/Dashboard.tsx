"use client";

import Link from "next/link";
import {
  Activity,
  ChevronRight,
  FileText,
  Gauge,
  Globe,
  History,
  Link2,
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

const SEO_LABEL = { green: "Υγιές", amber: "Προσοχή", red: "Κρίσιμο" } as const;
const CHART_ORANGE = "#7961f5"; // brand accent (onlygroup)

export default function Dashboard() {
  const scope = useNewsroom((s) => s.scope);
  const setScope = useNewsroom((s) => s.setScope);
  const cells = useNewsroom((s) => s.cells);
  const siteKpi = useNewsroom((s) => s.siteKpi);
  const reports = useNewsroom((s) => s.reports);
  const trends = useNewsroom((s) => s.trends);
  const network = useNewsroom((s) => s.network);
  const runSeoRetro = useNewsroom((s) => s.runSeoRetro);
  const state = useNewsroom();

  const k = scopeKpi(state, scope);
  const week = scopeWeek(state, scope);
  // Latest "Χθεσινή Αναφορά SEO" for the current scope (network grade falls back
  // to the most recent retro if there isn't a scoped one).
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
  const activeSites = Object.values(siteKpi).filter((s) => s.wp).length;
  // Metrics (views/SLA/charts/top-articles) have no backend yet (GA4 not wired) →
  // show honest "no data" states instead of fabricated numbers.
  const hasMetrics = Object.keys(siteKpi).length > 0;
  const trendingNow = (
    scope === "all" ? trends : trends.filter((t) => t.site === scope)
  ).slice(0, 3);

  return (
    <div className={styles.wrap}>
      {/* portals — the network hero */}
      <Panel>
        <Eyebrow icon={Globe}>
          WordPress δίκτυο —{" "}
          {scope === "all" ? "5 portals" : siteById(scope)?.name}
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
                  {hasMetrics ? `${(sk.views / 1000).toFixed(1)}K` : "—"}
                </div>
                <div
                  className={styles.portalDelta}
                  style={{
                    color: !hasMetrics
                      ? undefined
                      : sk.delta >= 0
                        ? "var(--green)"
                        : "var(--red)",
                  }}
                >
                  {hasMetrics
                    ? `${sk.delta >= 0 ? "▲" : "▼"} ${Math.abs(sk.delta)}% σήμερα`
                    : "χωρίς GA4"}
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
        <Panel className={styles.noData}>
          📊 Μετρήσεις (pageviews/SLA/top άρθρα) μη διαθέσιμες — απαιτείται σύνδεση
          Google Analytics (GA4). Δεν εμφανίζονται εικονικά δεδομένα.
        </Panel>
      )}
      {hasMetrics && (
      <div className={styles.stats}>
        <Stat
          label="Pageviews σήμερα"
          value={`${(k.views / 1000).toFixed(1)}K`}
          sub={`${k.delta >= 0 ? "▲" : "▼"} ${Math.abs(k.delta)}% vs χθες`}
          subColor={k.delta >= 0 ? "var(--green)" : "var(--red)"}
        />
        <Stat
          label="Breaking SLA hit"
          value={k.slaHit == null ? "—" : `${k.slaHit}%`}
          sub={k.slaHit == null ? "καμία breaking στην ουρά" : "στόχος < 2′"}
          subColor={
            k.slaHit == null
              ? "var(--dim)"
              : k.slaHit >= 90
                ? "var(--green)"
                : "var(--amber)"
          }
        />
        <Stat
          label="Άρθρα σήμερα"
          value={k.articles}
          sub={`${breaking.length} breaking στην ουρά`}
          subColor={breaking.length ? "var(--orange)" : "var(--dim)"}
        />
        <Stat
          label="Sites ενεργά"
          value={`${activeSites}/6`}
          sub="WordPress συνδεδεμένα"
          subColor="var(--dim)"
        />
      </div>
      )}

      <div className={styles.grid}>
        <Panel>
          <Eyebrow icon={Activity}>
            Pageviews — 7 ημέρες{" "}
            {scope !== "all" && `· ${siteById(scope)?.name}`}
          </Eyebrow>
          {week.length === 0 ? (
            <div className={styles.empty}>
              Δεν υπάρχουν δεδομένα pageviews — απαιτείται GA4.
            </div>
          ) : (
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={week}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={CHART_ORANGE}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor={CHART_ORANGE}
                      stopOpacity={0}
                    />
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
            <Eyebrow icon={FileText}>Top άρθρα</Eyebrow>
            {top.length === 0 && (
              <div className={styles.empty}>
                Δεν υπάρχουν άρθρα για αυτό το site σήμερα.
              </div>
            )}
            {top.map((a, i) => (
              <div key={i} className={styles.topRow}>
                <span className={styles.topRank}>{i + 1}</span>
                <SiteTag id={a.site} small />
                <span className={styles.topTitle}>{a.t}</span>
                <span className={styles.topViews}>
                  {(a.v / 1000).toFixed(1)}K
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <div className={styles.rightCol}>
          <Panel>
            <div className={styles.panelHead}>
              <Eyebrow icon={Gauge}>SEO — Χθεσινή</Eyebrow>
              <Button variant="ghost" small icon={History} onClick={runSeoRetro}>
                Χθεσινή
              </Button>
            </div>
            {retro ? (
              <>
                <div className={styles.seoStatus}>
                  <StatusLight s={retro.status} />
                  <span className={styles.seoLabel}>
                    {SEO_LABEL[retro.status]}
                  </span>
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
              <div className={styles.empty}>
                Δεν έχει τρέξει ακόμη — πάτησε «Χθεσινή».
              </div>
            )}
          </Panel>

          <Panel>
            <div className={styles.panelHead}>
              <Eyebrow icon={TrendingUp}>Trending now</Eyebrow>
              <Link href="/trends" className={styles.allLink}>
                Όλα <ChevronRight size={13} />
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
              <div className={styles.empty}>Κανένα trend.</div>
            )}
          </Panel>
        </div>
      </div>

      {breaking.length > 0 && (
        <Panel style={{ borderColor: "var(--orange-line)" }}>
          <Eyebrow icon={Zap}>Breaking queue — live SLA</Eyebrow>
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
