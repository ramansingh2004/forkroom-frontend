'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const problemPhotos = {
  scattered:
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=88',
  ambiguous:
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=88',
  followThrough:
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=88',
};

const featurePhotos = {
  collaboration:
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=86',
  workshop:
    'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=86',
  meeting:
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=86',
};

const workflow = [
  {
    number: '01',
    title: 'Frame the question',
    description:
      'Capture the decision, constraints, success criteria, owners, and the people whose input matters.',
  },
  {
    number: '02',
    title: 'Build the options',
    description:
      'Develop proposals together, attach evidence, discuss trade-offs, and surface blocking objections early.',
  },
  {
    number: '03',
    title: 'Decide with confidence',
    description:
      'Check readiness, open a bounded voting round, measure quorum, and preserve dissent instead of hiding it.',
  },
  {
    number: '04',
    title: 'Lock the reasoning',
    description:
      'Freeze the outcome into a durable record, assign follow-through, export it, and schedule the next review.',
  },
];

const useCases = [
  {
    tag: 'PRODUCT',
    title: 'Prioritization without the meeting fog',
    quote:
      '“Instead of leaving a roadmap meeting with five different memories, the team leaves with one decision record and the reasoning attached.”',
    person: 'Illustrative product-lead workflow',
  },
  {
    tag: 'ENGINEERING',
    title: 'Architecture choices that survive handoffs',
    quote:
      '“The useful part is not just knowing what we chose. It is seeing the alternatives, the objection that mattered, and the evidence behind the trade-off.”',
    person: 'Illustrative engineering workflow',
  },
  {
    tag: 'LEADERSHIP',
    title: 'Accountability without more status meetings',
    quote:
      '“Owners, review dates, dissent, and follow-through stay attached to the decision instead of getting scattered across chat and docs.”',
    person: 'Illustrative leadership workflow',
  },
];

function MarkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 4.5h11v4h-7v3h6v4h-6v4h-4z" fill="currentColor" />
      <path d="M17.5 8.5h-4v3h3v4h-3v4h4z" fill="currentColor" opacity=".45" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4.5 10 3.2 3.2L15.5 5.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

type AssemblyTone = 'paper' | 'teal' | 'rust' | 'yellow' | 'green' | 'ink';
type AssemblyCubeStyle = CSSProperties & Record<`--${string}`, string>;

const ASSEMBLY_STEP = 86;

const assemblyLabels: Record<number, string> = {
  18: 'CONTEXT',
  19: 'OPTION',
  20: 'EVIDENCE',
  21: 'BLOCKER',
  22: 'FORKROOM',
  23: 'VOTE',
  24: 'QUORUM',
  25: 'OWNER',
  26: 'REVIEW',
};

const assemblyTones: AssemblyTone[] = [
  'paper', 'teal', 'paper', 'yellow', 'paper', 'green', 'paper', 'rust', 'paper',
  'teal', 'paper', 'yellow', 'paper', 'green', 'paper', 'rust', 'paper', 'teal',
  'paper', 'yellow', 'paper', 'rust', 'ink', 'teal', 'green', 'paper', 'teal',
];

const assemblyCubes = Array.from({ length: 27 }, (_, index) => {
  const gridX = (index % 3) - 1;
  const gridY = (Math.floor(index / 3) % 3) - 1;
  const gridZ = Math.floor(index / 9) - 1;

  // A deterministic golden-angle scatter keeps the starting shape organic,
  // while every assembled coordinate is an exact 3 x 3 x 3 cube grid.
  const angle = ((index * 137.508) % 360) * (Math.PI / 180);
  const radius = 220 + (index % 5) * 34;
  const scatterX = Math.round(Math.cos(angle) * radius);
  const scatterY = Math.round(Math.sin(angle) * radius * 0.72);
  const scatterZ = ((index * 83) % 360) - 180;

  const style: AssemblyCubeStyle = {
    '--ax': `${gridX * ASSEMBLY_STEP}px`,
    '--ay': `${gridY * ASSEMBLY_STEP}px`,
    '--az': `${gridZ * ASSEMBLY_STEP}px`,
    '--sx': `${scatterX}px`,
    '--sy': `${scatterY}px`,
    '--sz': `${scatterZ}px`,
    '--srx': `${((index * 31) % 118) - 59}deg`,
    '--sry': `${((index * 47) % 126) - 63}deg`,
    '--srz': `${((index * 61) % 112) - 56}deg`,
  };

  return {
    index,
    label: assemblyLabels[index],
    tone: assemblyTones[index],
    style,
  };
});

function AssemblyCube({
  label,
  tone = 'paper',
  style,
}: {
  label?: string;
  tone?: AssemblyTone;
  style: AssemblyCubeStyle;
}) {
  const toneClass = {
    paper: styles.cubeTonePaper,
    teal: styles.cubeToneTeal,
    rust: styles.cubeToneRust,
    yellow: styles.cubeToneYellow,
    green: styles.cubeToneGreen,
    ink: styles.cubeToneInk,
  }[tone];

  return (
    <div className={`${styles.assemblyBlock} ${toneClass}`} style={style} aria-hidden="true">
      <span className={`${styles.cubeFace} ${styles.cubeFront}`}>{label && <b>{label}</b>}</span>
      <span className={`${styles.cubeFace} ${styles.cubeBack}`} />
      <span className={`${styles.cubeFace} ${styles.cubeRight}`} />
      <span className={`${styles.cubeFace} ${styles.cubeLeft}`} />
      <span className={`${styles.cubeFace} ${styles.cubeTop}`} />
      <span className={`${styles.cubeFace} ${styles.cubeBottom}`} />
    </div>
  );
}

function DecisionAssembly() {
  return (
    <div className={styles.assemblyStage} aria-label="Animated ForkRoom decision assembly">
      <div className={styles.assemblyHalo} aria-hidden="true" />
      <div className={styles.assemblyGuide} aria-hidden="true"><i /><i /><i /></div>
      <div className={styles.assemblyScene}>
        {assemblyCubes.map((cube) => (
          <AssemblyCube
            key={cube.index}
            label={cube.label}
            tone={cube.tone}
            style={cube.style}
          />
        ))}
      </div>

      <div className={styles.assemblyLegend} aria-hidden="true">
        <span><i /> Scattered context</span>
        <b>→</b>
        <strong><i /> One durable decision</strong>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 72);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = 'true';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.liveBackground} aria-hidden="true">
        <div className={styles.gridLayer} />
        <div className={`${styles.orb} ${styles.orbOne}`} />
        <div className={`${styles.orb} ${styles.orbTwo}`} />
        <div className={`${styles.orb} ${styles.orbThree}`} />
        <div className={styles.signalLine}><i /><i /><i /><i /></div>
        <div className={styles.floatingWordOne}>DECIDE</div>
        <div className={styles.floatingWordTwo}>EVIDENCE</div>
        <div className={styles.floatingWordThree}>ALIGN</div>
      </div>

      <header className={`${styles.navShell} ${scrolled ? styles.navShellScrolled : ''}`}>
        <div className={styles.navbar}>
          <Link href="/" className={styles.brand} aria-label="ForkRoom home">
            <span><MarkIcon /></span>
            <strong>ForkRoom</strong>
          </Link>

          <nav className={`${styles.desktopNav} ${menuOpen ? styles.mobileNavOpen : ''}`} aria-label="Public navigation">
            <Link href="#problem" onClick={() => setMenuOpen(false)}>Platform</Link>
            <Link href="#features" onClick={() => setMenuOpen(false)}>Features</Link>
            <Link href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</Link>
            <Link href="#use-cases" onClick={() => setMenuOpen(false)}>Use cases</Link>
            <Link href="#footer" onClick={() => setMenuOpen(false)}>Resources</Link>
          </nav>

          <div className={styles.navActions}>
            <Link href="/login" className={styles.signIn}>Sign in</Link>
            <Link href="/register" className={styles.navCta}>Start a workspace</Link>
            <button
              type="button"
              className={styles.menuButton}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <span /><span />
            </button>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy} data-reveal>
          <div className={styles.heroBadge}><i /><span>DECISION INFRASTRUCTURE FOR TEAMS</span></div>
          <h1>TURN SCATTERED INPUT INTO <em>ONE DECISION.</em></h1>
          <p>
            ForkRoom pulls proposals, evidence, objections, votes, owners, and review dates into one living decision record—so the reasoning never disappears after the meeting.
          </p>
          <div className={styles.heroActions}>
            <Link href="/register" className={styles.primaryAction}>Start deciding clearly <ArrowIcon /></Link>
            <Link href="#how-it-works" className={styles.secondaryAction}><span className={styles.playIcon}>▶</span> See how it works</Link>
          </div>
          <div className={styles.heroProof}>
            <div><strong>Frame the question</strong><span>Context and constraints</span></div>
            <i />
            <div><strong>Resolve the trade-offs</strong><span>Evidence and objections</span></div>
            <i />
            <div><strong>Lock the reasoning</strong><span>Vote → owner → review</span></div>
          </div>
        </div>

        <div className={styles.heroVisual} data-reveal>
          <DecisionAssembly />
        </div>

        <div className={styles.scrollCue} aria-hidden="true"><span>SCROLL TO EXPLORE</span><i /></div>
      </section>

      <section className={styles.problemSection} id="problem">
        <div className={styles.sectionWrap}>
          <div className={styles.sectionIntro} data-reveal>
            <span className={styles.sectionKicker}>THE PROBLEM</span>
            <h2>Your team remembers the outcome.<br /><em>The context disappears.</em></h2>
            <p>
              Important choices are usually spread across meetings, chat threads, docs, comments, and someone&apos;s memory.
              When the decision is questioned weeks later, reconstructing the “why” becomes another project.
            </p>
          </div>

          <div className={styles.problemStoryGrid}>
            <article className={styles.problemStoryCard} data-reveal>
              <div className={styles.problemCardMedia}>
                <img src={problemPhotos.scattered} alt="Team discussing work across several laptops and notes" loading="lazy" />
                <div className={styles.problemMediaShade} />
                <div className={`${styles.problemFloatChip} ${styles.problemChipOne}`}>Slack thread</div>
                <div className={`${styles.problemFloatChip} ${styles.problemChipTwo}`}>Meeting notes</div>
                <div className={`${styles.problemFloatChip} ${styles.problemChipThree}`}>Proposal</div>
                <span className={styles.problemMediaIndex}>01</span>
              </div>
              <div className={styles.problemCardBody}>
                <span className={styles.problemCardMeta}>INPUT FRAGMENTATION</span>
                <h3>Discussion is scattered</h3>
                <p>Proposals live in docs, objections in chat, and the context that made the choice sensible disappears across tools.</p>
              </div>
            </article>

            <article className={styles.problemStoryCard} data-reveal>
              <div className={styles.problemCardMedia}>
                <img src={problemPhotos.ambiguous} alt="Team members discussing a decision together around a table" loading="lazy" />
                <div className={styles.problemMediaShade} />
                <div className={styles.problemMemorySignal} aria-hidden="true">
                  <i /><i /><i /><i />
                  <span>4 interpretations</span>
                </div>
                <span className={styles.problemMediaIndex}>02</span>
              </div>
              <div className={styles.problemCardBody}>
                <span className={styles.problemCardMeta}>CONSENSUS GAP</span>
                <h3>“We agreed” is ambiguous</h3>
                <p>Teams move forward without a durable record of who supported the choice, what quorum meant, or what remained unresolved.</p>
              </div>
            </article>

            <article className={styles.problemStoryCard} data-reveal>
              <div className={styles.problemCardMedia}>
                <img src={problemPhotos.followThrough} alt="Laptop showing project work and follow-through tasks" loading="lazy" />
                <div className={styles.problemMediaShade} />
                <div className={styles.problemActionSignal} aria-hidden="true">
                  <span><i /> Decision</span>
                  <b><em /></b>
                  <span><i /> Action</span>
                </div>
                <span className={styles.problemMediaIndex}>03</span>
              </div>
              <div className={styles.problemCardBody}>
                <span className={styles.problemCardMeta}>FOLLOW-THROUGH</span>
                <h3>Ownership gets detached</h3>
                <p>The decision and the work it created separate immediately, making owners, review dates, and accountability easy to lose.</p>
              </div>
            </article>
          </div>

          <div className={styles.valueStrip} data-reveal>
            <span className={styles.valueMark}><MarkIcon /></span>
            <p><strong>ForkRoom keeps the whole chain together:</strong> question → proposals → evidence → objections → vote → locked outcome → follow-through.</p>
            <Link href="#features">See the workflow <ArrowIcon /></Link>
          </div>
        </div>
      </section>

      <section className={styles.featuresSection} id="features">
        <div className={styles.sectionWrap}>
          <div className={styles.featureHeading} data-reveal>
            <div>
              <span className={styles.sectionKicker}>KEY FEATURES</span>
              <h2>Everything important stays<br />inside the <em>decision.</em></h2>
            </div>
            <p>ForkRoom is deliberately opinionated about the few things teams need to make consequential choices understandable and repeatable.</p>
          </div>

          <article className={styles.featureRow} data-reveal>
            <div className={styles.featureCopy}>
              <span className={styles.featureIndex}>01 / DECISION ROOMS</span>
              <h3>One room for the question, the options, and the trade-offs.</h3>
              <p>Build proposals in context instead of scattering the work across separate docs and threads. Every contributor can see what is changing and why.</p>
              <ul>
                <li><CheckIcon /> Structured proposals and criteria</li>
                <li><CheckIcon /> Comments, mentions, and live collaboration</li>
                <li><CheckIcon /> Clear lifecycle from draft to locked</li>
              </ul>
            </div>
            <div className={styles.featureMedia}>
              <img src={featurePhotos.collaboration} alt="Team collaborating around a table" loading="lazy" />
              <div className={`${styles.photoOverlayCard} ${styles.photoOverlayDecision}`}>
                <span>DECISION ROOM</span>
                <strong>Q4 onboarding strategy</strong>
                <div><i>3</i> proposals <i>8</i> participants <i>12</i> evidence items</div>
              </div>
            </div>
          </article>

          <article className={`${styles.featureRow} ${styles.featureRowReverse}`} data-reveal>
            <div className={styles.featureCopy}>
              <span className={styles.featureIndex}>02 / EVIDENCE + OBJECTIONS</span>
              <h3>Make disagreement useful before it becomes expensive.</h3>
              <p>Attach research, files, links, and rationale directly to the choice. Blocking objections stay visible until the team resolves or explicitly accepts them.</p>
              <ul>
                <li><CheckIcon /> Evidence processing and references</li>
                <li><CheckIcon /> Blocking vs. non-blocking objections</li>
                <li><CheckIcon /> Resolution history preserved</li>
              </ul>
            </div>
            <div className={styles.featureMedia}>
              <img src={featurePhotos.workshop} alt="Team planning with sticky notes on a glass wall" loading="lazy" />
              <div className={`${styles.photoOverlayCard} ${styles.objectionCard}`}>
                <div className={styles.objectionTop}><span>BLOCKING OBJECTION</span><b>RESOLVED</b></div>
                <strong>“What happens if a refresh token is replayed?”</strong>
                <p>Added token-family revocation to the selected approach.</p>
              </div>
            </div>
          </article>

          <article className={styles.featureRow} data-reveal>
            <div className={styles.featureCopy}>
              <span className={styles.featureIndex}>03 / READINESS + VOTING</span>
              <h3>Vote when the decision is ready—not just when the meeting ends.</h3>
              <p>ForkRoom checks the structure around the vote: active proposals, eligible voters, quorum, blockers, and frozen fields. The rules are visible before anyone commits.</p>
              <ul>
                <li><CheckIcon /> Explicit quorum and eligible voters</li>
                <li><CheckIcon /> Readiness reasons before voting</li>
                <li><CheckIcon /> Bounded rounds with preserved results</li>
              </ul>
            </div>
            <div className={`${styles.featureMedia} ${styles.featureUiMedia}`}>
              <div className={styles.votingProof}>
                <div className={styles.voteProofHeader}><span>VOTING ROUND #2</span><b><i /> OPEN</b></div>
                <h4>Choose the authentication architecture</h4>
                <div className={styles.voteProgress}><span style={{ width: '78%' }} /></div>
                <div className={styles.voteSummary}><strong>7 / 9 voted</strong><span>Quorum: 6</span><span>18 min remaining</span></div>
                <div className={styles.voteOptionSelected}><b>A</b><div><strong>HTTP-only session cookies</strong><small>5 votes · 71%</small></div><i>✓</i></div>
                <div className={styles.voteOption}><b>B</b><div><strong>Short-lived JWT + refresh</strong><small>2 votes · 29%</small></div></div>
                <div className={styles.voteFooter}><span><i /> Quorum reached</span><button type="button">Close voting</button></div>
              </div>
              <div className={styles.miniReadiness}><span>READINESS</span><strong>All checks passed</strong><small><CheckIcon /> 0 blocking objections</small><small><CheckIcon /> Evidence complete</small><small><CheckIcon /> Structure frozen</small></div>
            </div>
          </article>

          <article className={`${styles.featureRow} ${styles.featureRowReverse}`} data-reveal>
            <div className={styles.featureCopy}>
              <span className={styles.featureIndex}>04 / LIVE COLLABORATION</span>
              <h3>Discuss live without turning the decision into a disappearing call.</h3>
              <p>Use the meeting layer when conversation is faster, while the durable decision record remains the center of gravity for evidence, notes, actions, and votes.</p>
              <ul>
                <li><CheckIcon /> Compact meeting dock inside the decision</li>
                <li><CheckIcon /> Presence, comments, and collaborative editing</li>
                <li><CheckIcon /> Context survives after the call ends</li>
              </ul>
            </div>
            <div className={styles.featureMedia}>
              <img src={featurePhotos.meeting} alt="Team collaborating around laptops in an office" loading="lazy" />
              <div className={styles.meetingDock}>
                <div className={styles.meetingPerson}><span>AK</span><i>●</i></div>
                <div><strong>Decision sync</strong><small>6 participants · 18:42</small></div>
                <button type="button">⌁</button><button type="button">◉</button><button type="button" className={styles.hangup}>×</button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.howSection} id="how-it-works">
        <div className={styles.howBackdropText} aria-hidden="true">HOW IT WORKS</div>
        <div className={styles.sectionWrap}>
          <div className={styles.howHeading} data-reveal>
            <span className={styles.sectionKicker}>A DURABLE WORKFLOW</span>
            <h2>From an open question<br />to an accountable <em>record.</em></h2>
          </div>
          <div className={styles.workflowLine}>
            {workflow.map((step, index) => (
              <article key={step.number} data-reveal>
                <div className={styles.stepMarker}><span>{step.number}</span>{index < workflow.length - 1 && <i />}</div>
                <div className={styles.stepBody}>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.lockedRecord} data-reveal>
            <div className={styles.recordTop}>
              <span><MarkIcon /> LOCKED DECISION RECORD</span>
              <b>SHA-256 VERIFIED</b>
            </div>
            <div className={styles.recordGrid}>
              <div><span>DECISION</span><strong>Authentication architecture</strong></div>
              <div><span>OUTCOME</span><strong>HTTP-only cookie sessions</strong></div>
              <div><span>DECIDED</span><strong>26 Aug 2026 · 18:42</strong></div>
              <div><span>VOTE</span><strong>6 / 7 · Quorum reached</strong></div>
            </div>
            <div className={styles.recordBottom}><span>3 proposals</span><span>14 evidence items</span><span>2 objections resolved</span><span>Review in 90 days</span><button type="button">Export PDF ↗</button></div>
          </div>
        </div>
      </section>

      <section className={styles.useCasesSection} id="use-cases">
        <div className={styles.sectionWrap}>
          <div className={styles.useCaseHeading} data-reveal>
            <span className={styles.sectionKicker}>WHERE IT FITS</span>
            <h2>For choices that are too important<br />to end as <em>“sounds good.”</em></h2>
            <p>Use ForkRoom when the reasoning will matter again—during implementation, onboarding, audits, reviews, or the next version of the same decision.</p>
          </div>
          <div className={styles.useCaseGrid}>
            {useCases.map((item) => (
              <article key={item.tag} data-reveal>
                <span>{item.tag}</span>
                <h3>{item.title}</h3>
                <blockquote>{item.quote}</blockquote>
                <small>{item.person}</small>
              </article>
            ))}
          </div>
          <p className={styles.testimonialNote}>These examples illustrate intended workflows and are not presented as customer endorsements.</p>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.ctaOrb} aria-hidden="true" />
        <div className={styles.ctaGrid} aria-hidden="true" />
        <div className={styles.finalCtaInner} data-reveal>
          <span className={styles.ctaMark}><MarkIcon /></span>
          <span className={styles.sectionKicker}>START WITH ONE DECISION</span>
          <h2>Your next important choice<br />deserves a <em>clear why.</em></h2>
          <p>Create a workspace, invite the people who matter, and turn the next messy discussion into a decision your team can understand later.</p>
          <div className={styles.ctaActions}>
            <Link href="/register" className={styles.primaryAction}>Get started for free <ArrowIcon /></Link>
            <Link href="/login" className={styles.ctaSignIn}>Already have an account? <strong>Sign in →</strong></Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer} id="footer">
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.brand}><span><MarkIcon /></span><strong>ForkRoom</strong></Link>
            <p>Collaborative decisions with<br />the reasoning preserved.</p>
            <a href="mailto:hello@forkroom.app">hello@forkroom.app</a>
          </div>
          <div className={styles.footerLinks}>
            <div><strong>Product</strong><Link href="#features">Features</Link><Link href="#how-it-works">How it works</Link><Link href="#use-cases">Use cases</Link><Link href="/register">Create account</Link></div>
            <div><strong>Resources</strong><Link href="/login">Sign in</Link><Link href="#problem">Why ForkRoom</Link><a href="mailto:hello@forkroom.app">Contact</a><Link href="/register">Get started</Link></div>
            <div><strong>Legal</strong><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><span>Security</span><span>Accessibility</span></div>
            <div><strong>Social</strong><a href="https://github.com" target="_blank" rel="noreferrer">GitHub ↗</a><a href="https://www.linkedin.com" target="_blank" rel="noreferrer">LinkedIn ↗</a><a href="https://x.com" target="_blank" rel="noreferrer">X / Twitter ↗</a></div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 ForkRoom. All rights reserved.</span>
          <span className={styles.status}><i /> All systems operational</span>
          <span>Built for decisions that need to last.</span>
        </div>
      </footer>
    </main>
  );
}
