"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, PowerOff, RefreshCw } from "lucide-react";
import type { Trend, TrendLifecycle } from "@/lib/types";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { T } from "@/lib/config/strings";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import SiteTag from "@/components/ui/SiteTag";
import styles from "./Trends.module.css";

const LIFECYCLE: Record<TrendLifecycle, { label: string; color: string }> = {
  emerging: { label: T.trends.lifecycle.emerging, color: "var(--green)" },
  surging: { label: T.trends.lifecycle.surging, color: "var(--orange)" },
  peaking: { label: T.trends.lifecycle.peaking, color: "var(--amber)" },
  fading: { label: T.trends.lifecycle.fading, color: "var(--faint)" },
};

const COVERAGE: Record<string, { label: string; color: string }> = {
  gap: { label: T.trends.coverage.gap, color: "var(--orange)" },
  partial: { label: T.trends.coverage.partial, color: "var(--amber)" },
  covered: { label: T.trends.coverage.covered, color: "var(--dim)" },
};

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const w = 84;
  const h = 22;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className={styles.spark} aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="var(--orange)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function platformBadges(t: Trend): string[] {
  if (t.platforms?.length) return t.platforms;
  return t.platform ? t.platform.split(/[·/]/).map((p) => p.trim()) : [];
}

export default function Trends() {
  const scope = useNewsroom((s) => s.scope);
  const trends = useNewsroom((s) => s.trends);
  const scan = useNewsroom((s) => s.scanTrends);
  const createCellFromTrend = useNewsroom((s) => s.createCellFromTrend);
  const active = useNewsroom(
    (s) => s.agents.find((a) => a.id === "trend")?.on ?? true,
  );
  const [loading, setLoading] = useState(false);

  const list =
    scope === "all" ? trends : trends.filter((t) => t.site === scope);

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.intro}>{T.trends.intro}</div>
        <Button
          icon={RefreshCw}
          loading={loading}
          disabled={!active}
          onClick={async () => {
            setLoading(true);
            await scan();
            setLoading(false);
          }}
          style={{ marginLeft: "auto" }}
        >
          {T.trends.scanNow}
        </Button>
      </div>

      {!active && (
        <Panel className={styles.deactivated}>
          <PowerOff size={26} color="var(--faint)" className={styles.deactIcon} />
          <div className={styles.deactTitle}>{T.trends.deactivated}</div>
          <div className={styles.deactSub}>
            {T.deactivatedPanel.prefix}{" "}
            <Link href="/agents" className={styles.deactLink}>
              {T.deactivatedPanel.link}
            </Link>{" "}
            {T.deactivatedPanel.suffix}
          </div>
        </Panel>
      )}

      {active && (
      <div className={styles.grid}>
        {list.map((t) => {
          const lc = t.lifecycle ? LIFECYCLE[t.lifecycle] : null;
          const cov = t.coverage ? COVERAGE[t.coverage.status] : null;
          return (
            <Panel key={t.id}>
              <div className={styles.cardHead}>
                <SiteTag id={t.site} />
                <div className={styles.badges}>
                  {platformBadges(t).map((p) => (
                    <span key={p} className={styles.platBadge}>
                      {p}
                    </span>
                  ))}
                </div>
                {lc && (
                  <span
                    className={styles.lifecycle}
                    style={{ color: lc.color, borderColor: `${lc.color}66` }}
                  >
                    {lc.label}
                  </span>
                )}
              </div>
              <div className={styles.topic}>{t.topic}</div>
              <div className={styles.note}>{t.angleGr || t.note}</div>
              <div className={styles.velRow}>
                <div className={styles.track}>
                  <div
                    className={styles.fill}
                    style={{ width: `${t.velocity}%` }}
                  />
                </div>
                <span className={styles.velNum}>{t.velocity}</span>
                {t.sparkline && <Sparkline data={t.sparkline} />}
              </div>
              <div className={styles.foot}>
                {cov && (
                  <span className={styles.coverage} style={{ color: cov.color }}>
                    {t.coverage?.freshestUrl ? (
                      <a
                        href={t.coverage.freshestUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: cov.color }}
                      >
                        {cov.label}
                      </a>
                    ) : (
                      cov.label
                    )}
                  </span>
                )}
                <Button
                  small
                  variant="soft"
                  icon={Plus}
                  onClick={() => createCellFromTrend(t)}
                  style={{ marginLeft: "auto" }}
                >
                  {T.common.createCell}
                </Button>
              </div>
            </Panel>
          );
        })}
        {list.length === 0 && (
          <Panel className={styles.empty}>{T.trends.empty}</Panel>
        )}
      </div>
      )}
    </div>
  );
}
