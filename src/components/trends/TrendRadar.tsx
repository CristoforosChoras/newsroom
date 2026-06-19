"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { siteById } from "@/lib/config/sites";
import { T } from "@/lib/config/strings";
import type { TrendScope } from "@/lib/types";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import styles from "./TrendRadar.module.css";

const TABS: { id: TrendScope; label: string }[] = [
  { id: "greece", label: T.radar.greece },
  { id: "global", label: T.radar.global },
];

// Unfiltered Global/Greece trend feed. Clicking a card opens the per-brand
// idea generator (TrendIdea modal, mounted in Shell).
export default function TrendRadar() {
  const scope = useNewsroom((s) => s.trendScope);
  const trends = useNewsroom((s) => s.radarTrends);
  const setScope = useNewsroom((s) => s.setTrendScope);
  const loadRadar = useNewsroom((s) => s.loadRadar);
  const openTrendIdea = useNewsroom((s) => s.openTrendIdea);
  const usedTrends = useNewsroom((s) => s.usedTrends);
  const [loading, setLoading] = useState(false);
  const [cat, setCat] = useState("all");

  const catLabel = (c: string) => T.radar.categories[c] ?? c;
  // categories present in the current feed, ordered by frequency
  const cats = (() => {
    const count = new Map<string, number>();
    for (const t of trends) count.set(t.category, (count.get(t.category) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  })();
  // if the selected category isn't present in this scope's feed, fall back to all
  const effectiveCat = cat !== "all" && !cats.includes(cat) ? "all" : cat;
  const shown =
    effectiveCat === "all" ? trends : trends.filter((t) => t.category === effectiveCat);

  // (Re)load whenever the active scope changes (and on mount).
  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      await loadRadar(scope);
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const refresh = async () => {
    setLoading(true);
    await loadRadar(scope, true);
    setLoading(false);
  };

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setScope(t.id)}
              className={[styles.tab, scope === t.id ? styles.tabActive : ""]
                .filter(Boolean)
                .join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button small variant="soft" icon={RefreshCw} loading={loading} onClick={refresh}>
          {T.radar.refresh}
        </Button>
      </div>

      {cats.length > 0 && (
        <div className={styles.catRow}>
          <button
            onClick={() => setCat("all")}
            className={[styles.catChip, effectiveCat === "all" ? styles.catOn : ""].filter(Boolean).join(" ")}
          >
            {T.radar.allCategories}
          </button>
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={[styles.catChip, effectiveCat === c ? styles.catOn : ""].filter(Boolean).join(" ")}
            >
              {catLabel(c)}
            </button>
          ))}
        </div>
      )}

      <div className={styles.grid}>
        {shown.length === 0 && (
          <div className={styles.empty}>{loading ? T.radar.loading : T.radar.empty}</div>
        )}
        {shown.map((t) => {
          const used = usedTrends.includes(t.id);
          return (
          <div
            key={t.id}
            className={[styles.cardWrap, used ? styles.usedWrap : ""].filter(Boolean).join(" ")}
            onClick={() => openTrendIdea(t.id)}
          >
            <Panel className={used ? styles.usedCard : undefined}>
              <div className={styles.cardHead}>
                <span className={styles.category}>{catLabel(t.category)}</span>
                {t.platforms.map((p) => (
                  <span key={p} className={styles.platBadge}>
                    {p}
                  </span>
                ))}
                {used && <span className={styles.usedTag}>✓ {T.radar.used}</span>}
                <span className={styles.score}>{t.score}</span>
              </div>
              <div className={styles.topic}>{t.title}</div>
              <div className={styles.velRow}>
                <div className={styles.track}>
                  <div className={styles.fill} style={{ width: `${t.velocity}%` }} />
                </div>
                <span className={styles.velNum}>{t.velocity}</span>
              </div>
              <div className={styles.foot}>
                <div className={styles.brands}>
                  {t.suggestedBrands.slice(0, 3).map((b) => {
                    const s = siteById(b.site);
                    return (
                      <span key={b.site} className={styles.brand} style={{ color: s?.color }}>
                        {s?.name ?? b.site}
                      </span>
                    );
                  })}
                </div>
                <span className={styles.cta}>
                  <Sparkles size={13} /> {T.radar.generate}
                </span>
              </div>
            </Panel>
          </div>
          );
        })}
      </div>
    </div>
  );
}
