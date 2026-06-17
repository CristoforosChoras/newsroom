"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Newspaper, Plus, Shuffle, User } from "lucide-react";
import { COLUMNS, siteById } from "@/lib/config/sites";
import { useNewsroom } from "@/lib/store/useNewsroom";
import Button from "@/components/ui/Button";
import CellCard from "./CellCard";
import styles from "./Board.module.css";

export default function Board() {
  const scope = useNewsroom((s) => s.scope);
  const cellsAll = useNewsroom((s) => s.cells);
  const move = useNewsroom((s) => s.move);
  const addCell = useNewsroom((s) => s.addCell);
  const pullInbox = useNewsroom((s) => s.pullInbox);
  const openCell = useNewsroom((s) => s.openCell);
  const currentUser = useNewsroom((s) => s.currentUser);
  const dragId = useRef<string | null>(null);
  const [mine, setMine] = useState(false);

  const scoped =
    scope === "all" ? cellsAll : cellsAll.filter((c) => c.site === scope);
  const cells = mine
    ? scoped.filter(
        (c) => c.assignee === currentUser || c.reviewer === currentUser,
      )
    : scoped;

  return (
    <div className={styles.board}>
      <div className={styles.toolbar}>
        <Button icon={Plus} variant="ghost" small onClick={addCell}>
          New cell
        </Button>
        <Button
          icon={Newspaper}
          variant="soft"
          small
          onClick={() => void pullInbox()}
        >
          Λήψη ΑΠΕ-ΜΠΕ
        </Button>
        <Button
          icon={User}
          variant={mine ? "soft" : "ghost"}
          small
          onClick={() => setMine((v) => !v)}
        >
          Τα δικά μου
        </Button>
        <div className={styles.scopeLabel}>
          {scope === "all" ? "όλα τα sites" : siteById(scope)?.name} · drag
          μεταξύ σταδίων
        </div>
      </div>

      <div className={styles.columns}>
        {COLUMNS.map((col) => {
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
                {col.id === "published" && (
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
                {list.length === 0 && <div className={styles.emptyCol}>Άδειο</div>}
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
