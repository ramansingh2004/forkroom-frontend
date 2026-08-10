'use client';

import Link from 'next/link';
import { IconArrowLeft, IconPrinter } from '@tabler/icons-react';
import styles from './legal.module.css';

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export function LegalDocument({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="ForkRoom home">
          <span aria-hidden="true">F</span>
          ForkRoom
        </Link>
        <div className={styles.headerActions}>
          <Link href="/" className={styles.backLink}>
            <IconArrowLeft size={15} aria-hidden="true" />
            Back
          </Link>
          <button type="button" onClick={() => window.print()}>
            <IconPrinter size={15} aria-hidden="true" />
            Print
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.index}>
          <span>ON THIS PAGE</span>
          <nav aria-label={`${title} sections`}>
            {sections.map((section) => (
              <a href={`#${section.id}`} key={section.id}>{section.title}</a>
            ))}
          </nav>
        </aside>

        <article className={styles.document}>
          <header className={styles.documentHeader}>
            <span>PRE-LAUNCH DRAFT · VERSION 0.1</span>
            <h1>{title}</h1>
            <p>{description}</p>
            <dl>
              <div><dt>Effective date</dt><dd>August 9, 2026</dd></div>
              <div><dt>Status</dt><dd>Requires legal review before production launch</dd></div>
            </dl>
          </header>

          <div className={styles.draftNotice} role="note">
            This product draft documents the intended service behavior. It is not legal advice and must
            be reviewed and adapted by the deployment operator before public use.
          </div>

          {sections.map((section, index) => (
            <section id={section.id} className={styles.section} key={section.id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}

          <footer className={styles.documentFooter}>
            <strong>ForkRoom</strong>
            <span>Clear reasoning. Durable decisions.</span>
          </footer>
        </article>
      </div>
    </main>
  );
}