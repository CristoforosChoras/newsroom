import type { LucideIcon } from "lucide-react";
import { RefreshCw } from "lucide-react";
import styles from "./Button.module.css";

type Variant = "solid" | "ghost" | "soft";

interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  className?: string;
  style?: React.CSSProperties;
  type?: "button" | "submit";
}

export default function Button({
  children,
  onClick,
  variant = "solid",
  icon: Icon,
  disabled,
  loading,
  small,
  className,
  style,
  type = "button",
}: ButtonProps) {
  const size = small ? 13 : 15;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={style}
      className={[
        styles.btn,
        styles[variant],
        small ? styles.small : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <RefreshCw size={size} className="spin" />
      ) : (
        Icon && <Icon size={size} />
      )}
      {children}
    </button>
  );
}
