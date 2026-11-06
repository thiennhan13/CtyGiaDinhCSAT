import styles from './loading-status.module.css';
export function LoadingSpinner({ compact = false }: { compact?: boolean }) {
  return <span className={compact ? styles.compact : styles.spinner} aria-hidden="true" />;
}
export function LoadingStatus({ children = 'Đang tải…' }: { children?: React.ReactNode }) {
  return <div className={styles.status} role="status" aria-live="polite"><LoadingSpinner /><span>{children}</span></div>;
}
