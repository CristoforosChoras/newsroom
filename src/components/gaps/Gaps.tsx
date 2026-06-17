"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbulb, Plus, PowerOff, X } from "lucide-react";
import type { Gap } from "@/lib/types";
import { siteById } from "@/lib/config/sites";
import { useNewsroom } from "@/lib/store/useNewsroom";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import SiteTag from "@/components/ui/SiteTag";
import styles from "./Gaps.module.css";

const TYPE: Record<Gap["type"], { color: string; label: string }> = {
  article: { color: "var(--blue)", label: "Άρθρο" },
  video: { color: "var(--red)", label: "Βίντεο" },
  post: { color: "var(--green)", label: "Post" },
};

export default function Gaps() {
  const scope = useNewsroom((s) => s.scope);
  const gaps = useNewsroom((s) => s.gaps);
  const find = useNewsroom((s) => s.findGaps);
  const createCell = useNewsroom((s) => s.createCellFromGap);
  const dismiss = useNewsroom((s) => s.dismissGap);
  const active = useNewsroom(
    (s) => s.agents.find((a) => a.id === "gap")?.on ?? true,
  );
  const [loading, setLoading] = useState(false);

  const IDEA_TYPE: Record<string, string> = {
    trend: "Trend",
    gap: "Gap",
    both: "Trend + Gap",
  };

  const list = scope === "all" ? gaps : gaps.filter((g) => g.site === scope);

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.intro}>
          Τι περιεχόμενο λείπει και έχει ζήτηση{" "}
          {scope !== "all" && `για ${siteById(scope)?.name}`} — ευκαιρίες με
          demand signal.
        </div>
        <Button
          icon={Lightbulb}
          loading={loading}
          disabled={!active}
          onClick={async () => {
            setLoading(true);
            await find(scope);
            setLoading(false);
          }}
          style={{ marginLeft: "auto" }}
        >
          Find content gaps
        </Button>
      </div>

      {!active && (
        <Panel className={styles.deactivated}>
          <PowerOff size={26} color="var(--faint)" className={styles.deactIcon} />
          <div className={styles.deactTitle}>Το Content Gaps είναι ανενεργό</div>
          <div className={styles.deactSub}>
            Ενεργοποίησέ το από τη σελίδα{" "}
            <Link href="/agents" className={styles.deactLink}>
              Agents
            </Link>{" "}
            για να ξανατρέξει.
          </div>
        </Panel>
      )}

      {active && (
      <div className={styles.list}>
        {list.map((g, i) => {
          const ty = TYPE[g.type] ?? TYPE.article;
          return (
            <Panel key={g.id} pad={16}>
              <div className={styles.row}>
                <div className={styles.rank}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className={styles.body}>
                  <div className={styles.tags}>
                    <span
                      className={styles.typeTag}
                      style={{ color: ty.color, borderColor: `${ty.color}55` }}
                    >
                      {ty.label}
                    </span>
                    {g.ideaType && (
                      <span className={styles.kindTag}>
                        {IDEA_TYPE[g.ideaType] ?? g.ideaType}
                      </span>
                    )}
                    <SiteTag id={g.site} small />
                    {g.crossMedia && (
                      <span className={styles.kindTag}>cross-media</span>
                    )}
                  </div>
                  <div className={styles.idea}>{g.idea}</div>
                  <div className={styles.reason}>{g.reason}</div>
                  <div className={styles.actions}>
                    <Button
                      small
                      variant="soft"
                      icon={Plus}
                      onClick={() => createCell(g)}
                    >
                      Create cell
                    </Button>
                    <Button
                      small
                      variant="ghost"
                      icon={X}
                      onClick={() => void dismiss(g.id)}
                    >
                      Απόρριψη
                    </Button>
                    {typeof g.winnability === "number" && (
                      <span className={styles.win}>
                        winnability {Math.round(g.winnability * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.demand}>
                  <div className={styles.demandNum}>{g.demand}</div>
                  <div className={styles.demandLabel}>demand</div>
                </div>
              </div>
            </Panel>
          );
        })}
        {list.length === 0 && (
          <Panel className={styles.empty}>
            Καμία ευκαιρία για αυτό το site. Πάτησε «Find content gaps».
          </Panel>
        )}
      </div>
      )}
    </div>
  );
}
