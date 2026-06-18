"use client";

import { Globe, RefreshCw } from "lucide-react";
import type { Cell } from "@/lib/types";
import { evaluateGate } from "@/lib/services/seoGate";
import { userById, initials } from "@/lib/config/team";
import { T } from "@/lib/config/strings";
import SiteTag from "@/components/ui/SiteTag";
import SlaClock from "@/components/ui/SlaClock";
import StatusLight from "@/components/ui/StatusLight";
import styles from "./CellCard.module.css";

interface CellCardProps {
  cell: Cell;
  onDragStart: () => void;
  onClick: () => void;
}

export default function CellCard({ cell: c, onDragStart, onClick }: CellCardProps) {
  const busy = c._routing || c._drafting || c._publishing;
  // Show the SEO gate dot once a cell has a draft to check (not for raw intake).
  const showGate = c.status === "ai_draft" || c.status === "review";
  const gate = showGate ? evaluateGate(c) : null;
  return (
    <div
      className={styles.card}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      <div className={styles.head}>
        <SiteTag id={c.site} small />
        {c.urgency === "breaking" && (
          <span className={styles.breaking}>{T.card.breaking}</span>
        )}
        {busy && (
          <RefreshCw
            size={12}
            className="spin"
            color="var(--orange)"
            style={{ marginLeft: "auto" }}
          />
        )}
        {c.confidence != null && !busy && (
          <span className={styles.confidence}>{c.confidence}%</span>
        )}
      </div>
      <div className={styles.headline}>{c.headline}</div>
      {(c.assignee || c.reviewer || c.returnedFromReview || c.aiVersion > 0) && (
        <div className={styles.people}>
          {c.assignee && (
            <span
              className={styles.avatar}
              title={T.card.author(userById(c.assignee)?.name ?? c.assignee)}
            >
              {initials(userById(c.assignee)?.name ?? "?")}
            </span>
          )}
          {c.reviewer && (
            <span
              className={styles.avatarEd}
              title={T.card.editor(userById(c.reviewer)?.name ?? c.reviewer)}
            >
              {initials(userById(c.reviewer)?.name ?? "?")}
            </span>
          )}
          {c.aiVersion > 0 && <span className={styles.vbadge}>v{c.aiVersion}</span>}
          {c.returnedFromReview && (
            <span className={styles.returned}>{T.card.returnedWithNotes}</span>
          )}
        </div>
      )}
      {c.urgency === "breaking" && c.slaDeadline && (
        <div className={styles.sla}>
          <SlaClock deadline={c.slaDeadline} />
        </div>
      )}
      <div className={styles.foot}>
        <Globe size={11} />
        {c.source}
        {c.wpPostId ? (
          <span className={styles.wp}>{T.card.wp(c.wpPostId)}</span>
        ) : gate ? (
          <span
            className={styles.seoDot}
            title={T.card.seoTitle(gate.status, gate.blockers.length)}
          >
            <StatusLight s={gate.status} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
