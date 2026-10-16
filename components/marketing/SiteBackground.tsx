import Image from 'next/image';
import styles from './site-background.module.css';

/** Decorative canvas shared without applying public typography to the Portal. */
export function SiteBackground() {
  return <div className={styles.background} aria-hidden="true" data-site-background>
    <div className={styles.circle} />
    <div className={`${styles.circle} ${styles.second}`} />
    <Image className={styles.watermark} src="/icon/csat-watermark.svg" alt="" width={1103} height={344} />
  </div>;
}
