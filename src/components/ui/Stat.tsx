import Panel from "./Panel";
import styles from "./Stat.module.css";

interface StatProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  subColor?: string;
}

export default function Stat({ label, value, sub, subColor }: StatProps) {
  return (
    <Panel pad={11} className={styles.stat}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {sub && (
        <div className={styles.sub} style={{ color: subColor ?? "var(--dim)" }}>
          {sub}
        </div>
      )}
    </Panel>
  );
}
