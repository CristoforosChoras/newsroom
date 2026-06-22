import styles from "./Input.module.css";

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password" | "search";
  placeholder?: string;
  label?: string;
  name?: string;
  id?: string;
  autoComplete?: string;
  disabled?: boolean;
  className?: string;
}

/** A labelled text input styled with the design tokens (matches the topbar look). */
export default function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  label,
  name,
  id,
  autoComplete,
  disabled,
  className,
}: InputProps) {
  const input = (
    <input
      className={[styles.input, className ?? ""].filter(Boolean).join(" ")}
      type={type}
      name={name}
      id={id ?? name}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
  if (!label) return input;
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {input}
    </label>
  );
}
