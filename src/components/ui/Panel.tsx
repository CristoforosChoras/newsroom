import styles from "./Panel.module.css";

interface PanelProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  pad?: number;
}

export default function Panel({ children, className, style, pad = 18 }: PanelProps) {
  return (
    <div
      className={[styles.panel, className ?? ""].filter(Boolean).join(" ")}
      style={{ padding: pad, ...style }}
    >
      {children}
    </div>
  );
}
