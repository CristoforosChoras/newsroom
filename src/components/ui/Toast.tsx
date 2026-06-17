"use client";

import { Sparkles } from "lucide-react";
import { useNewsroom } from "@/lib/store/useNewsroom";
import styles from "./Toast.module.css";

export default function Toast() {
  const toast = useNewsroom((s) => s.toast);
  if (!toast) return null;
  return (
    <div className={styles.toast}>
      <Sparkles size={15} color="var(--orange)" />
      {toast}
    </div>
  );
}
