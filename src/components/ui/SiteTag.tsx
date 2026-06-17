import { siteById } from "@/lib/config/sites";
import styles from "./SiteTag.module.css";

interface SiteTagProps {
  id: string | null | undefined;
  small?: boolean;
}

export default function SiteTag({ id, small }: SiteTagProps) {
  const s = siteById(id);
  if (!s) {
    return <span className={styles.none}>χωρίς site</span>;
  }
  return (
    <span
      className={styles.tag}
      style={{
        color: s.color,
        borderColor: `${s.color}55`,
        fontSize: small ? 9.5 : 10,
      }}
    >
      <span className={styles.dot} style={{ background: s.color }} />
      {s.name}
    </span>
  );
}
