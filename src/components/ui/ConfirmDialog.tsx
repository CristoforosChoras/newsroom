"use client";

import Button from "./Button";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // red confirm button (destructive actions)
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A styled confirmation dialog primitive — replaces the native `window.confirm`.
 * Centered modal over a dim backdrop; click-outside / Cancel dismisses. Pass
 * `danger` for destructive actions (red confirm button).
 */
export default function ConfirmDialog({
  open,
  message,
  title,
  confirmLabel = "OK",
  cancelLabel = "Άκυρο",
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <div className={styles.title}>{title}</div>}
        <div className={styles.message}>{message}</div>
        <div className={styles.actions}>
          <Button variant="ghost" small onClick={onCancel}>
            {cancelLabel}
          </Button>
          <button
            className={[styles.confirm, danger ? styles.danger : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
