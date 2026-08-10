import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Pre-launch ForkRoom product terms.',
  robots: { index: false, follow: false },
};

const sections: LegalSection[] = [
  {
    id: 'scope',
    title: 'Using ForkRoom',
    paragraphs: [
      'ForkRoom is a collaborative workspace for documenting proposals, evidence, objections, votes, decisions, actions, and later reviews. These terms apply when you access a ForkRoom deployment or create an account.',
      'Your organization or deployment operator may provide additional rules. Where those rules conflict with this product draft, the operator must publish the terms that govern the deployed service.',
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts and access',
    paragraphs: [
      'Provide accurate account information, protect access to your email and password, and promptly report suspected unauthorized use to the operator that provided your access.',
      'Workspace roles control what members may view or change. Do not attempt to bypass role restrictions or use another person’s identity or session.',
    ],
  },
  {
    id: 'content',
    title: 'Workspace content',
    paragraphs: [
      'You retain responsibility for content you submit. You must have the right to upload evidence, personal data, documents, and other material placed in a workspace.',
      'ForkRoom preserves decision history, including votes, objections, locked snapshots, revisions, and audit events. Authorized administrators may manage access, but immutable records are intentionally not edited as ordinary drafts.',
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    paragraphs: [
      'Do not use ForkRoom to break the law, violate another person’s rights, distribute malware, probe or disrupt the service, evade access controls, or upload content that you are not authorized to process.',
      'Do not treat a ForkRoom outcome as a substitute for professional legal, medical, financial, safety, or regulatory review when such review is required.',
    ],
  },
  {
    id: 'availability',
    title: 'Availability and changes',
    paragraphs: [
      'The service may change, pause, or become unavailable. Deployment operators are responsible for publishing their support, backup, retention, recovery, and service-level commitments.',
      'Material changes to final terms should include a new version and effective date. Continued use after notice may constitute acceptance only where permitted by applicable law.',
    ],
  },
  {
    id: 'termination',
    title: 'Suspension and termination',
    paragraphs: [
      'Access may be suspended or removed for security, misuse, legal requirements, workspace administration, or service discontinuation. The deployment operator must define any export or deletion rights that apply after access ends.',
    ],
  },
  {
    id: 'contact',
    title: 'Questions and notices',
    paragraphs: [
      'Contact the organization or deployment operator that provided your ForkRoom access. That operator must publish its legal name, support contact, governing law, dispute terms, and any jurisdiction-specific consumer notices before production launch.',
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Use"
      description="The rules intended to govern access to and use of a ForkRoom deployment."
      sections={sections}
    />
  );
}