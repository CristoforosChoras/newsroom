"use client";

import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Calendar,
  FileText,
  Gauge,
  HelpCircle,
  History,
  Trash2,
} from "lucide-react";
import type { Report, SiteKpi } from "@/lib/types";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { dateTimeShort } from "@/lib/utils/time";
import {
  SEO_CHECKS_DOC,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
} from "@/lib/config/seoChecksDoc";
import { T } from "@/lib/config/strings";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import SiteTag from "@/components/ui/SiteTag";
import StatusLight from "@/components/ui/StatusLight";
import styles from "./Reports.module.css";

type Tab = "seo" | "kpi";

const dayKey = (ts: number): string => {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const fmtViews = (v: number): string =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);

function DeltaPill({ d }: { d: number }) {
  const up = d >= 0;
  return (
    <span style={{ color: up ? "var(--green)" : "var(--red)" }}>
      {up ? "▲" : "▼"} {Math.abs(d)}%
    </span>
  );
}

// Clean per-site KPI table from the snapshot (GA4 today + WP articles).
// Honors the global scope: a single site shows only that row (no network footer).
function KpiReport({ r, scope }: { r: Report; scope: string }) {
  if (!r.kpi || Object.keys(r.kpi.siteKpi).length === 0) {
    return (
      <>
        {r.body.map((b, i) => (
          <div key={i} className={styles.bodyRow}>
            {b}
          </div>
        ))}
      </>
    );
  }
  let rows = Object.entries(r.kpi.siteKpi).sort(
    (a, b) => b[1].views - a[1].views,
  ) as [string, SiteKpi][];
  if (scope !== "all") rows = rows.filter(([id]) => id === scope);
  if (rows.length === 0) {
    return <div className={styles.bodyRow}>{T.reports.noSiteData}</div>;
  }
  const totalViews = rows.reduce((n, [, v]) => n + v.views, 0);
  const totalArticles = rows.reduce((n, [, v]) => n + v.articles, 0);
  const showFooter = scope === "all" && rows.length > 1;
  const top = (r.kpi.network.topArticles ?? []).filter(
    (a) => scope === "all" || a.site === scope,
  );
  return (
    <>
      <table className={styles.kpiTable}>
        <thead>
          <tr>
            <th>{T.reports.colPortal}</th>
            <th className={styles.num}>{T.reports.colToday}</th>
            <th className={styles.num}>{T.reports.colVsYesterday}</th>
            <th className={styles.num}>{T.reports.colArticles}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, v]) => (
            <tr key={id}>
              <td>
                <SiteTag id={id} small />
              </td>
              <td className={styles.num}>{fmtViews(v.views)}</td>
              <td className={styles.num}>
                <DeltaPill d={v.delta} />
              </td>
              <td className={styles.num}>{v.articles}</td>
            </tr>
          ))}
        </tbody>
        {showFooter && (
          <tfoot>
            <tr>
              <td>{T.reports.networkRow}</td>
              <td className={styles.num}>{fmtViews(totalViews)}</td>
              <td className={styles.num}>
                {r.kpi.network.delta != null ? (
                  <DeltaPill d={r.kpi.network.delta} />
                ) : (
                  "—"
                )}
              </td>
              <td className={styles.num}>{totalArticles}</td>
            </tr>
          </tfoot>
        )}
      </table>

      {top.length > 0 && (
        <div className={styles.block}>
          <div className={styles.subhead}>{T.reports.topArticles}</div>
          {top.slice(0, 5).map((a, i) => (
            <div key={i} className={styles.topRow}>
              <span className={styles.topRank}>{i + 1}</span>
              <SiteTag id={a.site} small />
              <span className={styles.topTitle}>{a.t}</span>
              <span className={styles.topViews}>{fmtViews(a.v)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Reports() {
  const reports = useNewsroom((s) => s.reports);
  const scope = useNewsroom((s) => s.scope);
  const runSeoRetro = useNewsroom((s) => s.runSeoRetro);
  const runKPI = useNewsroom((s) => s.runKPI);
  const clearReports = useNewsroom((s) => s.clearReports);
  const [tab, setTab] = useState<Tab>("seo");
  const [showChecks, setShowChecks] = useState(false);
  const [day, setDay] = useState("");

  // Dedup persisted ids, then split by type for the tab counts.
  const seen = new Set<string>();
  const unique = reports.filter((r) =>
    seen.has(r.id) ? false : (seen.add(r.id), true),
  );
  const isSeo = (r: Report) => r.type === "seo_retro" || r.type === "seo";
  const seoCount = unique.filter(isSeo).length;
  const kpiCount = unique.filter((r) => r.type === "kpi").length;

  const list = unique
    .filter((r) => (tab === "seo" ? isSeo(r) : r.type === "kpi"))
    .filter((r) => !day || dayKey(r.date) === day)
    // global scope: KPI reports stay (their table narrows); site SEO reports filter.
    .filter((r) => scope === "all" || r.type === "kpi" || r.site === scope);

  return (
    <div>
      <div className={styles.tabs}>
        <button
          className={[styles.tab, tab === "seo" ? styles.tabActive : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setTab("seo")}
        >
          <Gauge size={14} /> {T.reports.tabSeo}{" "}
          <span className={styles.tabCount}>{seoCount}</span>
        </button>
        <button
          className={[styles.tab, tab === "kpi" ? styles.tabActive : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setTab("kpi")}
        >
          <Activity size={14} /> {T.reports.tabKpi}{" "}
          <span className={styles.tabCount}>{kpiCount}</span>
        </button>

        <div className={styles.dateWrap}>
          <Calendar size={14} color="var(--faint)" className={styles.dateIcon} />
          <input
            type="date"
            className={styles.dateInput}
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
          {day && (
            <button className={styles.dateClear} onClick={() => setDay("")}>
              ×
            </button>
          )}
        </div>
      </div>

      <div className={styles.toolbar}>
        {tab === "seo" ? (
          <>
            <Button icon={History} variant="ghost" onClick={runSeoRetro}>
              {T.reports.seoRetroBtn}
            </Button>
            <Button
              icon={HelpCircle}
              variant={showChecks ? "soft" : "ghost"}
              onClick={() => setShowChecks((v) => !v)}
            >
              {T.reports.whatChecks}
            </Button>
          </>
        ) : (
          <Button icon={Activity} variant="ghost" onClick={runKPI}>
            {T.reports.refreshKpi}
          </Button>
        )}
        {list.length > 0 && (
          <Button
            icon={Trash2}
            variant="ghost"
            onClick={clearReports}
            style={{ marginLeft: "auto" }}
          >
            {T.reports.clear}
          </Button>
        )}
      </div>

      {tab === "seo" && showChecks && (
        <Panel className={styles.checksPanel}>
          <div className={styles.checksIntro}>
            {T.reports.checksIntro1}
            <code>{T.reports.checksDocPath}</code>.
          </div>
          <div className={styles.checksGrid}>
            {SEO_CHECKS_DOC.map((g) => (
              <div key={g.title} className={styles.checkGroup}>
                <div className={styles.checkGroupTitle}>{g.title}</div>
                {g.items.map((it, i) => (
                  <div key={i} className={styles.checkRow}>
                    <span
                      className={styles.sevTag}
                      style={{
                        color: SEVERITY_COLOR[it.sev],
                        borderColor: `${SEVERITY_COLOR[it.sev]}66`,
                      }}
                    >
                      {SEVERITY_LABEL[it.sev]}
                    </span>
                    <span className={styles.checkLabel}>{it.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {list.length === 0 && (
        <Panel className={styles.emptyPanel}>
          <FileText size={28} color="var(--faint)" className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>
            {day
              ? T.reports.noReportsForDate
              : tab === "seo"
                ? T.reports.noSeoReports
                : T.reports.noKpiReports}
          </div>
          <div className={styles.emptySub}>
            {tab === "seo" ? T.reports.pressSeo : T.reports.pressKpi}
          </div>
        </Panel>
      )}

      <div className={styles.list}>
        {list.map((r) =>
          r.type === "seo_retro" ? (
            <Panel key={r.id}>
              <div className={styles.head}>
                <History size={16} color="var(--orange)" />
                <span className={styles.title}>{T.reports.seoRetroTitle}</span>
                <SiteTag id={r.site === "all" ? null : r.site} small />
                <StatusLight s={r.status} />
                <span className={styles.date}>{dateTimeShort(r.date)}</span>
              </div>
              {r.volume && (
                <div className={styles.volume}>
                  {T.reports.auditedVolume(
                    r.volume.audited,
                    r.volume.published,
                  )}
                  {r.volume.skippedPartner
                    ? T.reports.partnerSkipped(r.volume.skippedPartner)
                    : ""}
                </div>
              )}
              {r.issues?.map((is) => (
                <div key={is.id} className={styles.issueRow}>
                  <StatusLight s={is.class === "critical" ? "red" : "amber"} />
                  <span className={styles.issueLabel}>{is.label}</span>
                  <span className={styles.issueCount}>
                    {is.count}/{is.of}
                  </span>
                </div>
              ))}
              {r.offenders && r.offenders.length > 0 && (
                <div className={styles.block}>
                  <div className={styles.subhead}>{T.reports.worstArticles}</div>
                  {r.offenders.slice(0, 5).map((o, i) => (
                    <a
                      key={i}
                      href={o.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.offender}
                    >
                      {o.url}
                    </a>
                  ))}
                </div>
              )}
              {r.lessons && r.lessons.length > 0 && (
                <div className={styles.block}>
                  <div className={styles.subhead}>{T.reports.today}</div>
                  {r.lessons.map((l, i) => (
                    <div key={i} className={styles.bodyRow}>
                      <ArrowRight
                        size={15}
                        color="var(--orange)"
                        className={styles.bodyIcon}
                      />
                      {l}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          ) : (
            <Panel key={r.id}>
              <div className={styles.head}>
                {r.type === "seo" ? (
                  <Gauge size={16} color="var(--orange)" />
                ) : (
                  <Activity size={16} color="var(--orange)" />
                )}
                <span className={styles.title}>
                  {r.type === "seo"
                    ? T.reports.seoHealthTitle
                    : T.reports.kpiTitle}
                </span>
                {r.type === "kpi" ? (
                  scope === "all" ? (
                    <span className={styles.network}>{T.reports.network}</span>
                  ) : (
                    <SiteTag id={scope} small />
                  )
                ) : (
                  <SiteTag id={r.site === "all" ? null : r.site} small />
                )}
                {r.type === "seo" && <StatusLight s={r.status} />}
                <span className={styles.date}>{dateTimeShort(r.date)}</span>
              </div>
              {r.type === "kpi" ? (
                <KpiReport r={r} scope={scope} />
              ) : (
                r.body.map((b, i) => (
                  <div key={i} className={styles.bodyRow}>
                    <ArrowRight
                      size={15}
                      color="var(--orange)"
                      className={styles.bodyIcon}
                    />
                    {b}
                  </div>
                ))
              )}
            </Panel>
          ),
        )}
      </div>
    </div>
  );
}
