"use client";

import { useEffect, useState } from "react";
import { Bot, Play, Shuffle } from "lucide-react";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { timeHM } from "@/lib/utils/time";
import { T } from "@/lib/config/strings";
import {
  getAmnaConfig,
  setAmnaInterval,
  runAmnaIngest,
} from "@/lib/services/agents";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import styles from "./Agents.module.css";

export default function Agents() {
  const agents = useNewsroom((s) => s.agents);
  const scope = useNewsroom((s) => s.scope);
  const toggle = useNewsroom((s) => s.toggleAgent);
  const flash = useNewsroom((s) => s.flash);
  const pullInbox = useNewsroom((s) => s.pullInbox);
  const runSeoRetro = useNewsroom((s) => s.runSeoRetro);
  const runKPI = useNewsroom((s) => s.runKPI);
  const scanTrends = useNewsroom((s) => s.scanTrends);
  const findGaps = useNewsroom((s) => s.findGaps);
  const [busy, setBusy] = useState<string | null>(null);

  // AMNA ingestion cadence (minutes). "" = manual only. Source of truth is n8n.
  const [intervalInput, setIntervalInput] = useState("");
  const [savedInterval, setSavedInterval] = useState<number | null>(null);
  const [savingInterval, setSavingInterval] = useState(false);

  useEffect(() => {
    let alive = true;
    void getAmnaConfig().then((cfg) => {
      if (!alive || !cfg) return;
      setSavedInterval(cfg.intervalMin);
      setIntervalInput(cfg.intervalMin > 0 ? String(cfg.intervalMin) : "");
    });
    return () => {
      alive = false;
    };
  }, []);

  async function saveInterval() {
    setSavingInterval(true);
    const raw = intervalInput.trim();
    const min = raw === "" ? null : Math.max(0, Math.round(Number(raw) || 0));
    const cfg = await setAmnaInterval(min);
    setSavingInterval(false);
    if (cfg) {
      setSavedInterval(cfg.intervalMin);
      setIntervalInput(cfg.intervalMin > 0 ? String(cfg.intervalMin) : "");
      flash(T.agents.saved);
    } else {
      flash(T.agents.saveFailed);
    }
  }

  // Maps each agent card to the action its "Run now" triggers.
  const run: Record<string, () => void | Promise<void>> = {
    router: () => {
      void pullInbox(); // routing happens during AMNA ingestion
    },
    ingest: async () => {
      const ok = await runAmnaIngest();
      flash(ok ? T.agents.runStarted : T.agents.runFailed);
    },
    seo: () => runSeoRetro(),
    kpi: () => runKPI(), // no GA4 backend → flashes "εκκρεμεί"
    trend: () => scanTrends(),
    gap: () => findGaps(scope),
  };

  // Live cadence label for the ingest card (overrides the seed schedule text).
  const ingestSchedule =
    savedInterval === null
      ? null
      : savedInterval > 0
        ? T.agents.cadenceEvery(savedInterval)
        : T.agents.cadenceManual;

  return (
    <div className={styles.grid}>
      {agents.map((a) => (
        <Panel key={a.id}>
          <div className={styles.head}>
            <div
              className={styles.icon}
              style={{
                background: a.on ? "var(--orange-soft)" : "var(--panel-2)",
              }}
            >
              {a.id === "router" ? (
                <Shuffle
                  size={18}
                  color={a.on ? "var(--orange)" : "var(--faint)"}
                />
              ) : (
                <Bot
                  size={18}
                  color={a.on ? "var(--orange)" : "var(--faint)"}
                />
              )}
            </div>
            <div className={styles.meta}>
              <div className={styles.name}>{a.name}</div>
              <div className={styles.schedule}>
                {a.id === "ingest" && ingestSchedule ? ingestSchedule : a.schedule}
              </div>
            </div>
            <div
              onClick={() => toggle(a.id)}
              className={styles.toggle}
              style={{ background: a.on ? "var(--orange)" : "var(--line)" }}
            >
              <span
                className={styles.knob}
                style={{ left: a.on ? 21 : 3 }}
              />
            </div>
          </div>
          <div className={styles.desc}>{a.desc}</div>

          {a.id === "ingest" && (
            <div className={styles.cadence}>
              <span className={styles.cadenceLabel}>{T.agents.every}</span>
              <input
                type="number"
                min={0}
                step={5}
                inputMode="numeric"
                className={styles.cadenceInput}
                value={intervalInput}
                placeholder="—"
                onChange={(e) => setIntervalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveInterval();
                }}
              />
              <span className={styles.cadenceLabel}>{T.agents.minutes}</span>
              <Button
                small
                variant="soft"
                loading={savingInterval}
                onClick={() => void saveInterval()}
              >
                {T.agents.save}
              </Button>
              <span className={styles.cadenceHint}>{T.agents.manualHint}</span>
            </div>
          )}

          <div className={styles.foot}>
            <Button
              small
              variant="soft"
              icon={Play}
              loading={busy === a.id}
              disabled={!a.on}
              onClick={async () => {
                setBusy(a.id);
                await run[a.id]();
                setBusy(null);
              }}
            >
              {T.common.runNow}
            </Button>
            <span className={styles.last}>
              {a.last ? T.common.lastRun(timeHM(a.last)) : T.common.neverRun}
            </span>
          </div>
        </Panel>
      ))}
    </div>
  );
}
