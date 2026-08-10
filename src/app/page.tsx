import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Decisions with a clear why',
  description:
    'ForkRoom brings proposals, evidence, objections, voting, and accountable follow-through into one durable decision record.',
};

const workflow = [
  ['01', 'Frame the decision', 'Set the question, context, criteria, and the people who need to contribute.'],
  ['02', 'Work through options', 'Develop proposals, attach evidence, and make objections visible before a vote.'],
  ['03', 'Commit with clarity', 'Run a bounded vote, record dissent, and lock the chosen outcome as an immutable snapshot.'],
  ['04', 'Follow through', 'Assign actions, schedule a review, and preserve revisions without rewriting history.'],
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="ForkRoom home">
          <span aria-hidden="true">F</span>
          ForkRoom
        </Link>
        <nav aria-label="Public navigation">
          <Link href="#how-it-works">How it works</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/register" className={styles.headerCta}>Create account</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Collaborative decision workspace</span>
          <h1>Make the decision.<br />Keep the reasoning.</h1>
          <p>
            ForkRoom gives teams one place to compare proposals, surface objections, vote, and preserve
            an accountable record of what was decided and why.
          </p>
          <div className={styles.heroActions}>
            <Link href="/register" className={styles.primaryAction}>Create your account</Link>
            <Link href="/login" className={styles.secondaryAction}>Sign in</Link>
          </div>
          <ul className={styles.trustList} aria-label="Product assurances">
            <li>Role-based access</li>
            <li>Immutable decision snapshots</li>
            <li>Private evidence</li>
          </ul>
        </div>

        <div className={styles.decisionPreview} aria-label="Example ForkRoom decision record">
          <div className={styles.previewTopbar}>
            <span>Platform Architecture</span>
            <strong>READY TO VOTE</strong>
          </div>
          <div className={styles.previewBody}>
            <span className={styles.previewLabel}>DECISION 07</span>
            <h2>Choose our authentication architecture</h2>
            <p>Which approach gives us secure sessions now without blocking future service separation?</p>
            <div className={styles.proposalList}>
              <article className={styles.selectedProposal}>
                <span>A</span>
                <div><strong>HTTP-only cookie sessions</strong><small>Server-owned rotation and revocation</small></div>
                <b>4 votes</b>
              </article>
              <article>
                <span>B</span>
                <div><strong>Client-managed bearer tokens</strong><small>Explicit token storage in the browser</small></div>
                <b>2 votes</b>
              </article>
            </div>
            <div className={styles.previewFooter}>
              <span>6 of 7 voted</span>
              <span>Quorum reached</span>
              <strong>1 objection resolved</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.workflow} id="how-it-works">
        <header>
          <span className={styles.eyebrow}>A durable workflow</span>
          <h2>From an open question to accountable action.</h2>
        </header>
        <div className={styles.workflowGrid}>
          {workflow.map(([number, title, description]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <span className={styles.eyebrow}>Start with one decision</span>
          <h2>Give the next important choice a clear record.</h2>
        </div>
        <Link href="/register" className={styles.primaryAction}>Create account</Link>
      </section>

      <footer className={styles.footer}>
        <span>ForkRoom</span>
        <p>Clear reasoning. Durable decisions.</p>
        <nav aria-label="Legal">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </footer>
    </main>
  );
}