import type { Status } from "@/lib/types";
import styles from "./StatusLight.module.css";

const COLOR: Record<Status, string> = {
  green: "var(--green)",
  amber: "var(--amber)",
  red: "var(--red)",
};

export default function StatusLight({ s }: { s: Status | string }) {
  const col = COLOR[s as Status] ?? "var(--dim)";
  return (
    <span
      className={styles.light}
      style={{ background: col, boxShadow: `0 0 8px ${col}` }}
    />
  );
}
