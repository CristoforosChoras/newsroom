"use client";

import { useId } from "react";
import styles from "./Tooltip.module.css";

type Placement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: React.ReactNode; // the explanation shown on hover / focus
  children: React.ReactNode; // the trigger element
  placement?: Placement; // default "top"
  className?: string; // applied to the wrapper
}

/**
 * A lightweight, CSS-driven tooltip primitive. Shows `content` in a styled
 * bubble (with an arrow) on hover AND keyboard focus — accessible (`role=tooltip`
 * + `aria-describedby`), SSR-safe (no JS positioning), and wraps long text.
 */
export default function Tooltip({
  content,
  children,
  placement = "top",
  className,
}: TooltipProps) {
  const id = useId();
  return (
    <span
      className={[styles.wrap, className].filter(Boolean).join(" ")}
      tabIndex={0}
      aria-describedby={id}
    >
      {children}
      <span role="tooltip" id={id} className={styles.bubble} data-placement={placement}>
        {content}
      </span>
    </span>
  );
}
