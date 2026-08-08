import Link from 'next/link';
import styles from './auth.module.css';

export function AuthShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className={styles.page}>
      <Link
        href="/"
        className={styles.brand}
        aria-label="ForkRoom home"
      >
        <span
          className={styles.brandMark}
          aria-hidden="true"
        >
          F
        </span>
        <span>ForkRoom</span>
      </Link>

      <section className={styles.card}>
        {children}
      </section>

      <p className={styles.footer}>
        Clear reasoning. Durable decisions.
      </p>
    </main>
  );
}

export function AuthHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className={styles.heading}>
      <span className={styles.eyebrow}>
        {eyebrow}
      </span>

      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}