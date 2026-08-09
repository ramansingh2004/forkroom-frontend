'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  ActionIcon,
  Avatar,
  Burger,
  Divider,
  Drawer,
  Indicator,
  Kbd,
  Menu,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAt,
  IconBell,
  IconChevronDown,
  IconChevronRight,
  IconFileText,
  IconHelpCircle,
  IconHistory,
  IconHome,
  IconLogout,
  IconPlug,
  IconSearch,
  IconSettings,
  IconUsers,
  IconVocabulary,
} from '@tabler/icons-react';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';
import { useWorkspace, useWorkspaceMembers } from '@/hooks/use-workspaces';
import { useUiStore } from '@/stores/use-ui-store';
import styles from './forkroom-shell.module.css';

type NavItem = {
  label: string;
  icon: typeof IconHome;
  href?: string;
  active?: boolean;
  badge?: number;
};

function NavGroup({
  compact = false,
  label,
  items,
}: {
  compact?: boolean;
  label: string;
  items: NavItem[];
}) {
  return (
    <div className={styles.navGroup}>
      <div className={styles.navLabel}>{label}</div>
      {items.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            <Icon size={19} stroke={1.75} aria-hidden="true" />
            <span className={styles.navText}>{item.label}</span>
            {Boolean(item.badge) && (
              <span className={styles.navBadge} aria-label={`${item.badge} unread`}>
                {item.badge! > 99 ? '99+' : item.badge}
              </span>
            )}
          </>
        );

        if (!item.href) {
          return (
            <div
              key={item.label}
              className={`${styles.navItem} ${styles.navItemDisabled}`}
              aria-disabled="true"
            >
              {content}
            </div>
          );
        }

        return (
          <Tooltip key={item.label} label={item.label} position="right" disabled={!compact}>
            <Link
              href={item.href}
              className={`${styles.navItem} ${item.active ? styles.navItemActive : ''}`}
              aria-current={item.active ? 'page' : undefined}
            >
              {content}
            </Link>
          </Tooltip>
        );
      })}
    </div>
  );
}

function WorkspaceNavigation({
  compact = false,
  pathname,
  unreadCount = 0,
  workspaceId,
}: {
  compact?: boolean;
  pathname: string;
  unreadCount?: number;
  workspaceId?: string;
}) {
  const workspaceItems: NavItem[] = [
    {
      label: 'Overview',
      icon: IconHome,
      href: workspaceId ? `/w/${workspaceId}` : '/workspaces',
      active: workspaceId ? pathname === `/w/${workspaceId}` : pathname.startsWith('/workspaces'),
    },
    {
      label: 'Decisions',
      icon: IconVocabulary,
      href: workspaceId ? `/w/${workspaceId}/decisions` : undefined,
      active: Boolean(workspaceId && pathname.startsWith(`/w/${workspaceId}/decisions`)),
    },
    { label: 'Documents', icon: IconFileText },
    { label: 'Members', icon: IconUsers },
  ];

  const activityItems: NavItem[] = [
    {
      label: 'Notifications',
      icon: IconBell,
      href: '/notifications',
      active: pathname.startsWith('/notifications'),
      badge: unreadCount,
    },
    { label: 'Recent activity', icon: IconHistory },
    { label: 'Mentions', icon: IconAt },
  ];

  const systemItems: NavItem[] = [
    { label: 'Integrations', icon: IconPlug },
    { label: 'Workspace settings', icon: IconSettings },
  ];

  return (
    <nav className={styles.navigation} aria-label="Workspace navigation">
      <NavGroup compact={compact} label="WORKSPACE" items={workspaceItems} />
      <NavGroup compact={compact} label="ACTIVITY" items={activityItems} />
      <NavGroup compact={compact} label="SYSTEM" items={systemItems} />
    </nav>
  );
}

export function ForkRoomShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ workspaceId?: string }>();
  const workspaceId = params.workspaceId;
  const workspace = useWorkspace(workspaceId);
  const members = useWorkspaceMembers(workspaceId);
  const { data: user } = useCurrentUser();
  const unreadNotifications = useUnreadNotificationCount();
  const logout = useLogout();
  const navigationOpen = useUiStore((state) => state.navigationOpen);
  const setNavigationOpen = useUiStore((state) => state.setNavigationOpen);
  const displayName = user?.display_name ?? 'ForkRoom user';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'FR';

  const unreadCount = unreadNotifications.data?.unread ?? 0;
  const section = pathname.startsWith('/notifications')
    ? 'Notifications'
    : pathname.includes('/decisions/')
      ? 'Decision'
      : pathname.endsWith('/decisions')
        ? 'Decisions'
        : workspaceId
          ? 'Overview'
          : 'Workspaces';

  const signOut = async () => {
    await logout.mutateAsync();
    router.replace('/login');
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.sidebarBrand}>
            <Link href="/" className={styles.brand} aria-label="ForkRoom home">
              <span className={styles.brandName}>FORKROOM</span>
              <span className={styles.brandTagline}>DECISION WORKSPACE</span>
            </Link>
          </div>

          <Link href="/workspaces" className={styles.workspaceSwitcher}>
            <span>
              <strong>{workspace.data?.name ?? 'Choose workspace'}</strong>
              <small>
                {workspaceId && members.data ? `${members.data.length} members` : 'Switch workspace'}
              </small>
            </span>
            <IconChevronDown size={16} stroke={1.8} aria-hidden="true" />
          </Link>

          <WorkspaceNavigation
            pathname={pathname}
            unreadCount={unreadCount}
            workspaceId={workspaceId}
          />
        </div>

        <div className={styles.sidebarBottom}>
          <Divider color="var(--fr-border-strong)" />
          <div className={styles.profileBlock}>
            <Avatar color="rust" size={34} radius="xl">{initials}</Avatar>
            <div className={styles.profileCopy}>
              <strong>{displayName}</strong>
              <span>{user?.email ?? 'Signed in'}</span>
            </div>
          </div>
        </div>
      </aside>

      <header className={styles.header}>
        <div className={styles.mobileBrand}>
          <Burger
            opened={navigationOpen}
            onClick={() => setNavigationOpen(!navigationOpen)}
            size="sm"
            aria-label="Open navigation"
          />
          <span>FORKROOM</span>
        </div>

        <div className={styles.breadcrumb} aria-label="Current location">
          <span>{workspace.data?.name ?? 'Workspace'}</span>
          <IconChevronRight size={14} aria-hidden="true" />
          <strong>{section}</strong>
        </div>

        <button type="button" className={styles.searchButton} aria-label="Search ForkRoom">
          <IconSearch size={19} stroke={1.8} aria-hidden="true" />
          <span>Search decisions, documents, people</span>
          <Kbd className={styles.searchKey}>Ctrl K</Kbd>
        </button>

        <div className={styles.headerActions}>
          <Indicator
            color="rust"
            size={16}
            offset={5}
            label={unreadCount > 99 ? '99+' : unreadCount}
            disabled={unreadCount === 0}
          >
            <ActionIcon
              component={Link}
              href="/notifications"
              variant="subtle"
              color="dark"
              size={38}
              aria-label={
                unreadNotifications.isError
                  ? 'Notifications; unread count unavailable'
                  : `${unreadCount} unread notifications`
              }
            >
              <IconBell size={19} stroke={1.8} />
            </ActionIcon>
          </Indicator>
          <ActionIcon
            className={styles.helpAction}
            variant="subtle"
            color="dark"
            size={38}
            aria-label="Help"
          >
            <IconHelpCircle size={19} stroke={1.8} />
          </ActionIcon>
          <Menu position="bottom-end" width={220} shadow="md">
            <Menu.Target>
              <UnstyledButton className={styles.profileButton} aria-label="Open account menu">
                <Avatar color="rust" radius="xl" size={34}>{initials}</Avatar>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{displayName}</Menu.Label>
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={16} stroke={1.8} />}
                onClick={() => void signOut()}
                disabled={logout.isPending}
              >
                Sign out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <Drawer
        opened={navigationOpen}
        onClose={() => setNavigationOpen(false)}
        title={<span className={styles.drawerTitle}>FORKROOM</span>}
        size="min(320px, 88vw)"
        padding="md"
      >
        <WorkspaceNavigation
          pathname={pathname}
          unreadCount={unreadCount}
          workspaceId={workspaceId}
        />
      </Drawer>
    </div>
  );
}
