import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Privacy Notice',
  description: 'Pre-launch ForkRoom privacy notice.',
  robots: { index: false, follow: false },
};

const sections: LegalSection[] = [
  {
    id: 'scope',
    title: 'Scope and responsibility',
    paragraphs: [
      'This notice describes the information ForkRoom is designed to process. The organization operating your deployment must identify itself as the responsible entity and adapt this notice to its hosting, vendors, jurisdiction, and actual practices.',
    ],
  },
  {
    id: 'information',
    title: 'Information processed',
    paragraphs: [
      'Account information may include your display name, email address, verification state, avatar reference, account status, and security credentials stored in protected form.',
      'Workspace information may include memberships and roles; decision titles and content; proposals, criteria, scores, objections, votes, locked records, actions, reviews, notifications, uploaded evidence, exports, revisions, and audit metadata.',
      'Technical information may include request timestamps, IP and device information available to the server, security events, service logs, connection state, and diagnostics needed to operate and protect the service.',
    ],
  },
  {
    id: 'purposes',
    title: 'Why information is used',
    paragraphs: [
      'Information is used to authenticate users, enforce workspace permissions, provide collaboration and decision workflows, send requested account messages, preserve accountable records, secure the service, diagnose failures, and comply with applicable obligations.',
    ],
  },
  {
    id: 'sharing',
    title: 'Access and sharing',
    paragraphs: [
      'Workspace content is available to authorized members according to their roles. Owners and administrators may manage access and view account details required for workspace administration.',
      'The deployment operator must disclose every hosting, email, storage, analytics, monitoring, and support provider that receives personal information. ForkRoom should not expose private attachments through permanent public URLs.',
    ],
  },
  {
    id: 'retention',
    title: 'Retention and deletion',
    paragraphs: [
      'Decision history is designed to be durable, especially after a decision is locked. The deployment operator must publish concrete retention periods, backup behavior, workspace-deletion consequences, and any legal preservation requirements.',
      'Deleting a workspace or account may not immediately remove information from protected backups or records that must be retained. The final notice must explain those limits and timelines.',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    paragraphs: [
      'ForkRoom is designed for server-managed authentication, role-based authorization, private object storage, short-lived download access, and auditable decision records. No system can guarantee absolute security.',
      'Report suspected unauthorized access to the organization or operator that provided your account. Do not send passwords or action tokens through support messages.',
    ],
  },
  {
    id: 'rights',
    title: 'Your choices and rights',
    paragraphs: [
      'Depending on applicable law, you may have rights to request access, correction, export, restriction, objection, or deletion. The deployment operator must publish a verified request channel and explain when workspace governance or immutable records limit a request.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact and changes',
    paragraphs: [
      'Contact the organization or deployment operator that provided your ForkRoom access. Before production launch, it must publish its legal identity, privacy contact, processing locations, retention schedule, subprocessors, lawful bases, and jurisdiction-specific notices.',
      'Material changes should be identified by an updated version and effective date and communicated through an appropriate in-product or account channel.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Notice"
      description="How a ForkRoom deployment is intended to handle account, workspace, and security information."
      sections={sections}
    />
  );
}