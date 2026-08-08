import { ForkRoomShell } from '@/components/app-shell/forkroom-shell';
import { AuthBoundary } from '@/components/auth/auth-boundary';

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthBoundary>
      <ForkRoomShell>
        {children}
      </ForkRoomShell>
    </AuthBoundary>
  );
}