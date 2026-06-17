"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import styles from "./SlaClock.module.css";

const TOTAL = 120000; // 2 minute SLA window

export default function SlaClock({ deadline }: { deadline: number }) {
  // `now` stays null until the first interval tick. That keeps the first client
  // render identical to the server (no Date.now() in render → no hydration
  // mismatch and no impure-render lint error) and updates live thereafter.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, []);

  if (now === null) {
    return (
      <div className={styles.row}>
        <Clock size={12} color="var(--dim)" />
        <span className={styles.time} style={{ color: "var(--dim)" }}>
          —:—
        </span>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: "0%" }} />
        </div>
      </div>
    );
  }

  const left = Math.max(0, deadline - now);
  const over = left === 0;
  const pct = Math.min(1, (now - (deadline - TOTAL)) / TOTAL);
  const col = over
    ? "var(--red)"
    : pct > 0.66
      ? "var(--amber)"
      : "var(--orange)";
  const s = Math.ceil(left / 1000);

  return (
    <div className={styles.row}>
      <Clock size={12} color={col} />
      <span className={styles.time} style={{ color: col }}>
        {over ? "SLA MISS" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`}
      </span>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${pct * 100}%`, background: col }}
        />
      </div>
    </div>
  );
}
