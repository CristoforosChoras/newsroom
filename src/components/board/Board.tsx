"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Plus,
  Shuffle,
  User,
} from "lucide-react";
import { columnsFor, siteById } from "@/lib/config/sites";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { useCan } from "@/lib/store/useAuth";
import { T } from "@/lib/config/strings";
import Button from "@/components/ui/Button";
import CellCard from "./CellCard";
import styles from "./Board.module.css";

export default function Board() {
  const scope = useNewsroom((s) => s.scope);
  const cellsAll = useNewsroom((s) => s.cells);
  const boardKind = useNewsroom((s) => s.boardKind);
  const setBoardKind = useNewsroom((s) => s.setBoardKind);
  const move = useNewsroom((s) => s.move);
  const addCell = useNewsroom((s) => s.addCell);
  const pullInbox = useNewsroom((s) => s.pullInbox);
  const openCell = useNewsroom((s) => s.openCell);
  const currentUser = useNewsroom((s) => s.currentUser);
  const can = useCan();
  const dragId = useRef<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [mine, setMine] = useState(false);
  const isSocial = boardKind === "social";
  const columns = columnsFor(boardKind);

  // slide one stage at a time (snap handles the rest); swipe/trackpad still work
  const slide = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const col = el.querySelector(`.${styles.column}`) as HTMLElement | null;
    const step = col ? col.offsetWidth + 12 : el.clientWidth * 0.85;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const byKind = cellsAll.filter(
    (c) => (c.kind ?? "article") === boardKind,
  );
  const scoped =
    scope === "all" ? byKind : byKind.filter((c) => c.site === scope);
  const cells = mine
    ? scoped.filter(
        (c) => c.assignee === currentUser || c.reviewer === currentUser,
      )
    : scoped;

  return (
    <div className={styles.board}>
      <div className={styles.kindTabs}>
        <button
          className={[styles.kindTab, !isSocial ? styles.kindTabOn : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setBoardKind("article")}
        >
          {T.board.kindArticle}
        </button>
        <button
          className={[styles.kindTab, isSocial ? styles.kindTabOn : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setBoardKind("social")}
        >
          {T.board.kindSocial}
        </button>
      </div>
      <div className={styles.toolbar}>
        {/* UX gating: creating cells/ingesting requires the matching permission */}
        {can("drafts.create") && (
          <Button icon={Plus} variant="ghost" small onClick={addCell}>
            {isSocial ? T.board.newSocial : T.board.newCell}
          </Button>
        )}
        {!isSocial && can("newsroom.manage") && (
          <Button
            icon={Newspaper}
            variant="soft"
            small
            onClick={() => void pullInbox()}
          >
            {T.board.pullAmna}
          </Button>
        )}
        <Button
          icon={User}
          variant={mine ? "soft" : "ghost"}
          small
          onClick={() => setMine((v) => !v)}
        >
          {T.board.mine}
        </Button>
        <div className={styles.scopeLabel}>
          {T.board.scopeHint(
            scope === "all" ? T.common.allSites : siteById(scope)?.name ?? "",
          )}
        </div>
        <div className={styles.slideNav}>
          <button
            className={styles.slideBtn}
            onClick={() => slide(-1)}
            aria-label={T.board.prevStages}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className={styles.slideBtn}
            onClick={() => slide(1)}
            aria-label={T.board.nextStages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className={styles.columns} ref={scrollerRef}>
        {columns.map((col) => {
          const list = cells.filter((c) => c.status === col.id);
          return (
            <div
              key={col.id}
              className={styles.column}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId.current) move(dragId.current, col.id);
                dragId.current = null;
              }}
            >
              <div className={styles.colHead}>
                <span className={styles.colLabel}>{col.label}</span>
                <span className={styles.colCount}>{list.length}</span>
                {(col.id === "published" || col.id === "posted") && (
                  <CheckCircle2
                    size={13}
                    color="var(--green)"
                    style={{ marginLeft: "auto" }}
                  />
                )}
                {col.id === "assigned" && (
                  <Shuffle
                    size={13}
                    color="var(--orange)"
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </div>
              <div className={styles.colBody}>
                {list.length === 0 && (
                  <div className={styles.emptyCol}>{T.board.empty}</div>
                )}
                {list.map((c) => (
                  <CellCard
                    key={c.id}
                    cell={c}
                    onDragStart={() => (dragId.current = c.id)}
                    onClick={() => openCell(c.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
