import type { LucideIcon } from "lucide-react";
import styles from "./Eyebrow.module.css";

interface EyebrowProps {
  children?: React.ReactNode;
  icon?: LucideIcon;
}

export default function Eyebrow({ children, icon: Icon }: EyebrowProps) {
  return (
    <div className={styles.eyebrow}>
      {Icon && <Icon size={13} color="var(--orange)" />}
      {children}
    </div>
  );
}
