import { ChevronRight } from "lucide-react";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  title?: string;
  className?: string;
}

/** A native <select> styled like the topbar dropdown (chevron overlay + tokens). */
export default function Select({
  value,
  onChange,
  options,
  label,
  name,
  id,
  disabled,
  title,
  className,
}: SelectProps) {
  const control = (
    <span className={styles.wrap} title={title}>
      <select
        className={[styles.select, className ?? ""].filter(Boolean).join(" ")}
        name={name}
        id={id ?? name}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronRight size={14} color="var(--dim)" className={styles.chevron} />
    </span>
  );
  if (!label) return control;
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {control}
    </label>
  );
}
