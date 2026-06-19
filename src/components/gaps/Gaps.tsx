"use client";

import { useEffect, useState } from "react";
import { Swords, Sparkles, ExternalLink, AlertTriangle, RefreshCw } from "lucide-react";
import { SITES } from "@/lib/config/sites";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { T } from "@/lib/config/strings";
import { dateTimeShort } from "@/lib/utils/time";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import styles from "./Gaps.module.css";

const WINDOWS = ["24", "48", "72", "168"];

const STATUS_LABEL: Record<string, string> = {
  pending: T.competition.statusPending,
  running: T.competition.statusRunning,
  done: T.competition.statusDone,
  error: T.competition.statusError,
};

// Competition Analysis — on-demand competitor scout (replaces Content Gaps).
export default function Gaps() {
  const startRun = useNewsroom((s) => s.startCompetitionRun);
  const poll = useNewsroom((s) => s.pollCompetition);
  const loadRuns = useNewsroom((s) => s.loadCompetitionRuns);
  const openDetail = useNewsroom((s) => s.openCompetitionDetail);
  const runs = useNewsroom((s) => s.competitionRuns);
  const findingsMap = useNewsroom((s) => s.competitionFindings);
  const activeId = useNewsroom((s) => s.activeCompetitionRunId);
  const flash = useNewsroom((s) => s.flash);

  const [urlsText, setUrlsText] = useState("");
  const [windowHours, setWindowHours] = useState(72);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const run = activeId ? runs[activeId] : undefined;
  const findings = activeId ? (findingsMap[activeId] ?? []) : [];
  const inFlight = run?.status === "pending" || run?.status === "running";

  // poll while the active run is in flight (cleanup-guarded recursive timeout)
  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async (): Promise<void> => {
      if (!alive) return;
      await poll(activeId);
      if (!alive) return;
      const st = useNewsroom.getState().competitionRuns[activeId]?.status;
      if (st === "done" || st === "error") return;
      timer = setTimeout(() => void tick(), 2500);
    };
    void tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [activeId, poll]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const analyze = async () => {
    const urls = urlsText
      .split(/\s+/)
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//i.test(u));
    if (urls.length === 0) return flash(T.competition.pickUrls);
    if (selected.length === 0) return flash(T.competition.pickBrands);
    setBusy(true);
    await startRun({ urls, windowHours, profileIds: selected });
    setBusy(false);
  };

  const pastRuns = Object.values(runs)
    .filter((r) => r.id !== activeId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8);

  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>{T.competition.intro}</div>

      {/* input form */}
      <Panel pad={16}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>{T.competition.urlsLabel}</label>
            <textarea
              className={styles.urls}
              value={urlsText}
              placeholder={T.competition.urlsPlaceholder}
              onChange={(e) => setUrlsText(e.target.value)}
              rows={3}
            />
          </div>
          <div className={styles.side}>
            <label className={styles.label}>{T.competition.windowLabel}</label>
            <div className={styles.windowRow}>
              {WINDOWS.map((w) => (
                <button
                  key={w}
                  className={[styles.winChip, Number(w) === windowHours ? styles.winOn : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setWindowHours(Number(w))}
                >
                  {T.competition.windows[w] ?? `${w}ω`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className={styles.label}>{T.competition.brandsLabel}</label>
        <div className={styles.brandRow}>
          {SITES.map((s) => {
            const on = selected.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={styles.brandChip}
                style={{
                  color: on ? "#0a0a0b" : s.color,
                  background: on ? s.color : "transparent",
                  borderColor: `${s.color}66`,
                }}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        <div className={styles.actions}>
          <Button icon={Swords} loading={busy || inFlight} onClick={() => void analyze()}>
            {T.competition.analyze}
          </Button>
        </div>
      </Panel>

      {/* active run */}
      {run && (
        <>
          <div className={styles.runHead}>
            <span className={styles.runStatus} data-st={run.status}>
              {run.status === "running" && (
                <RefreshCw size={12} className="spin" style={{ marginRight: 4 }} />
              )}
              {STATUS_LABEL[run.status] ?? run.status}
              {inFlight && run.progress?.phase ? ` · ${run.progress.phase}` : ""}
            </span>
            <span className={styles.runMeta}>
              {run.urls.length} URLs · {T.competition.windows[String(run.windowHours)] ?? `${run.windowHours}ω`} ·{" "}
              {dateTimeShort(run.updatedAt)}
            </span>
          </div>

          {run.error && (
            <Panel className={styles.warn}>
              <AlertTriangle size={14} /> {run.error}
            </Panel>
          )}
          {run.sources.some((s) => !s.ok) && (
            <Panel className={styles.warn}>
              <AlertTriangle size={14} /> {T.competition.sourcesFailed}:{" "}
              {run.sources.filter((s) => !s.ok).map((s) => s.url).join(", ")}
            </Panel>
          )}

          {/* per-competitor summary */}
          {run.competitorSummaries.length > 0 && (
            <Panel pad={16}>
              <div className={styles.summaryTitle}>{T.competition.summaryTitle}</div>
              <div className={styles.summaryGrid}>
                {run.competitorSummaries.map((c) => (
                  <div key={c.url} className={styles.summaryCard}>
                    <div className={styles.summaryHost}>{hostOf(c.url)}</div>
                    <div className={styles.summaryMeta}>
                      {T.competition.articlesN(c.articleCount)} · {T.competition.cadence(c.cadencePerDay)}
                    </div>
                    {c.topTopics.length > 0 && (
                      <div className={styles.topics}>{c.topTopics.slice(0, 5).join(" · ")}</div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* findings */}
          <div className={styles.list}>
            {findings.map((f, i) => (
              <Panel key={f.id} pad={16}>
                <div className={styles.row}>
                  <div className={styles.rank}>{String(i + 1).padStart(2, "0")}</div>
                  <div className={styles.body}>
                    <div className={styles.tags}>
                      <span
                        className={styles.typeTag}
                        style={{
                          color: f.type === "missed" ? "var(--red)" : "var(--amber)",
                          borderColor: f.type === "missed" ? "var(--red)" : "var(--amber)",
                        }}
                      >
                        {f.type === "missed" ? T.competition.missed : T.competition.behind}
                      </span>
                      <span className={styles.kindTag}>
                        {T.competition.competitorCount(f.metrics.competitorCount)}
                      </span>
                      {f.metrics.earliestPublishedAt && (
                        <span className={styles.kindTag}>{dateTimeShort(f.metrics.earliestPublishedAt)}</span>
                      )}
                    </div>
                    <div className={styles.idea}>{f.headline}</div>
                    <div className={styles.reason}>{f.whyItMatters}</div>
                    <div className={styles.compLinks}>
                      {f.competitors.slice(0, 4).map((c, k) => (
                        <a key={k} href={c.url} target="_blank" rel="noreferrer" className={styles.compLink}>
                          <ExternalLink size={11} /> {(c.title || c.url).slice(0, 48)}
                        </a>
                      ))}
                    </div>
                    <div className={styles.actions}>
                      <Button
                        small
                        variant="soft"
                        icon={Sparkles}
                        onClick={() => openDetail(run.id, f.id)}
                      >
                        {T.competition.suggestAngle}
                      </Button>
                    </div>
                  </div>
                  <div className={styles.demand}>
                    <div className={styles.demandNum}>{f.score}</div>
                  </div>
                </div>
              </Panel>
            ))}
            {run.status === "done" && findings.length === 0 && (
              <Panel className={styles.empty}>{T.competition.noFindings}</Panel>
            )}
          </div>
        </>
      )}

      {!run && <Panel className={styles.empty}>{T.competition.empty}</Panel>}

      {/* past runs */}
      {pastRuns.length > 0 && (
        <Panel pad={16}>
          <div className={styles.summaryTitle}>{T.competition.pastRuns}</div>
          <div className={styles.pastList}>
            {pastRuns.map((r) => (
              <button
                key={r.id}
                className={styles.pastChip}
                onClick={() => {
                  useNewsroom.setState({ activeCompetitionRunId: r.id });
                  void poll(r.id);
                }}
              >
                {r.urls.map(hostOf).slice(0, 2).join(", ")} · {dateTimeShort(r.createdAt)}
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function hostOf(u: string): string {
  try {
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return u;
  }
}
