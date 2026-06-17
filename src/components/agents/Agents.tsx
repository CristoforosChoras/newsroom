"use client";

import { useState } from "react";
import { Bot, Play, Shuffle } from "lucide-react";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { timeHM } from "@/lib/utils/time";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import styles from "./Agents.module.css";

export default function Agents() {
  const agents = useNewsroom((s) => s.agents);
  const scope = useNewsroom((s) => s.scope);
  const toggle = useNewsroom((s) => s.toggleAgent);
  const pullInbox = useNewsroom((s) => s.pullInbox);
  const runSeoRetro = useNewsroom((s) => s.runSeoRetro);
  const runKPI = useNewsroom((s) => s.runKPI);
  const scanTrends = useNewsroom((s) => s.scanTrends);
  const findGaps = useNewsroom((s) => s.findGaps);
  const [busy, setBusy] = useState<string | null>(null);

  // Maps each agent card to the action its "Run now" triggers.
  const run: Record<string, () => void | Promise<void>> = {
    router: () => {
      void pullInbox(); // routing happens during AMNA ingestion
    },
    ingest: () => {
      void pullInbox();
    },
    seo: () => runSeoRetro(),
    kpi: () => runKPI(), // no GA4 backend → flashes "εκκρεμεί"
    trend: () => scanTrends(),
    gap: () => findGaps(scope),
  };

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
              <div className={styles.schedule}>{a.schedule}</div>
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
              Run now
            </Button>
            <span className={styles.last}>
              {a.last ? `last: ${timeHM(a.last)}` : "never run"}
            </span>
          </div>
        </Panel>
      ))}
    </div>
  );
}
