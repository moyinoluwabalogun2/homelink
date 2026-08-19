import styles from "./error.module.css";

export default function LoadingPage() {
  return (
    <div className={styles.state} aria-label="Loading page" aria-live="polite">
      <div className={styles.loadingCard}>
        <span className={styles.loadingLine} />
        <span className={styles.loadingLine} />
        <span className={styles.loadingLine} />
        <span className={styles.loadingBlock} />
      </div>
    </div>
  );
}