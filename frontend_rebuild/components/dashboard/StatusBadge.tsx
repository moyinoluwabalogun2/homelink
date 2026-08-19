import { titleCase } from "@/lib/formatters";
import styles from "./StatusBadge.module.css";

const positive = new Set(["active", "published", "approved", "success", "responded"]);
const warning = new Set(["pending", "open", "draft", "pending_verification"]);
const negative = new Set(["rejected", "failed", "suspended", "deactivated"]);

export default function StatusBadge({ status }: { status: string }) {
  const tone = positive.has(status)
    ? styles.positive
    : warning.has(status)
      ? styles.warning
      : negative.has(status)
        ? styles.negative
        : styles.neutral;

  return <span className={`${styles.badge} ${tone}`}>{titleCase(status)}</span>;
}