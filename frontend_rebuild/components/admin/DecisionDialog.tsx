"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import styles from "./DecisionDialog.module.css";

interface DecisionDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  placeholder?: string;
  minimumLength?: number;
  tone?: "primary" | "danger";
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export default function DecisionDialog({
  open,
  title,
  description,
  confirmLabel,
  placeholder = "Add a clear administrative note…",
  minimumLength = 5,
  tone = "primary",
  submitting = false,
  onCancel,
  onConfirm,
}: DecisionDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onCancel, submitting]);

  if (!open) return null;

  const valid = reason.trim().length >= minimumLength;

  return (
    <div className={styles.overlay} role="presentation">
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close decision dialog"
        onClick={onCancel}
        disabled={submitting}
      />

      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-dialog-title"
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onCancel}
          disabled={submitting}
          aria-label="Close dialog"
        >
          <X aria-hidden="true" />
        </button>

        <span className={`${styles.icon} ${styles[tone]}`}>
          <AlertTriangle aria-hidden="true" />
        </span>

        <div className={styles.heading}>
          <h2 id="decision-dialog-title">{title}</h2>
          <p>{description}</p>
        </div>

        <label>
          <span>Administrative note</span>
          <textarea
            rows={6}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={placeholder}
            autoFocus
          />
          <small>
            Minimum {minimumLength} characters · {reason.trim().length} entered
          </small>
        </label>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.confirmButton} ${styles[tone]}`}
            disabled={!valid || submitting}
            onClick={() => void onConfirm(reason.trim())}
          >
            {submitting ? "Saving…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}