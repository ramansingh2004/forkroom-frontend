"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { spotlight } from "@mantine/spotlight";
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
  IconMenu2,
  IconPlug,
  IconSearch,
  IconShieldLock,
  IconSettings,
  IconUserCircle,
  IconUsers,
  IconVocabulary,
} from "@tabler/icons-react";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";
import { useUnreadMentionCount } from "@/hooks/use-mentions";
import {
  useWorkspace,
  useWorkspaceMembers,
  useWorkspaces,
} from "@/hooks/use-workspaces";
import { useUiStore } from "@/stores/use-ui-store";
import { GlobalSearch } from "@/components/search/global-search";
import { getApiErrorMessage } from "@/services/auth.service";
import styles from "./forkroom-shell.module.css";

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
              <span
                className={styles.navBadge}
                aria-label={`${item.badge} unread`}
              >
                {item.badge! > 99 ? "99+" : item.badge}
              </span>
            )}
          </>
        );

        if (!item.href) {
          return (
            <Tooltip
              key={item.label}
              label={item.label}
              position="right"
              disabled={!compact}
              openDelay={250}
            >
              <div
                className={`${styles.navItem} ${styles.navItemDisabled}`}
                aria-disabled="true"
                aria-label={compact ? item.label : undefined}
              >
                {content}
              </div>
            </Tooltip>
          );
        }

        return (
          <Tooltip
            key={item.label}
            label={item.label}
            position="right"
            disabled={!compact}
            openDelay={250}
          >
            <Link
              href={item.href}
              className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`}
              aria-current={item.active ? "page" : undefined}
              aria-label={compact ? item.label : undefined}
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
  canManageWorkspace = false,
  compact = false,
  pathname,
  unreadMentionCount = 0,
  unreadCount = 0,
  workspaceId,
}: {
  canManageWorkspace?: boolean;
  compact?: boolean;
  pathname: string;
  unreadMentionCount?: number;
  unreadCount?: number;
  workspaceId?: string;
}) {
  const workspaceItems: NavItem[] = [
    {
      label: "Overview",
      icon: IconHome,
      href: workspaceId ? `/w/${workspaceId}` : "/workspaces",
      active: workspaceId
        ? pathname === `/w/${workspaceId}`
        : pathname.startsWith("/workspaces"),
    },
    {
      label: "Decisions",
      icon: IconVocabulary,
      href: workspaceId ? `/w/${workspaceId}/decisions` : undefined,
      active: Boolean(
        workspaceId && pathname.startsWith(`/w/${workspaceId}/decisions`),
      ),
    },
    {
      label: "Documents",
      icon: IconFileText,
      href: workspaceId ? `/w/${workspaceId}/documents` : undefined,
      active: Boolean(
        workspaceId && pathname.startsWith(`/w/${workspaceId}/documents`),
      ),
    },
    {
      label: "Members",
      icon: IconUsers,
      href: workspaceId ? `/w/${workspaceId}/members` : undefined,
      active: Boolean(
        workspaceId && pathname.startsWith(`/w/${workspaceId}/members`),
      ),
    },
  ];

  const activityItems: NavItem[] = [
    {
      label: "Notifications",
      icon: IconBell,
      href: "/notifications",
      active: pathname.startsWith("/notifications"),
      badge: unreadCount,
    },
    {
      label: "Recent activity",
      icon: IconHistory,
      href: workspaceId ? `/w/${workspaceId}/activity` : undefined,
      active: Boolean(
        workspaceId && pathname.startsWith(`/w/${workspaceId}/activity`),
      ),
    },
    {
      label: "Mentions",
      icon: IconAt,
      href: workspaceId ? `/w/${workspaceId}/mentions` : undefined,
      active: Boolean(
        workspaceId && pathname.startsWith(`/w/${workspaceId}/mentions`),
      ),
      badge: unreadMentionCount,
    },
  ];

  const systemItems: NavItem[] = [
    {
      label: "Integrations",
      icon: IconPlug,
      href: workspaceId ? `/w/${workspaceId}/integrations` : undefined,
      active: Boolean(
        workspaceId && pathname.startsWith(`/w/${workspaceId}/integrations`),
      ),
    },
    ...(canManageWorkspace && workspaceId
      ? [
          {
            label: "Workspace settings",
            icon: IconSettings,
            href: `/w/${workspaceId}/settings`,
            active: pathname.startsWith(`/w/${workspaceId}/settings`),
          },
        ]
      : []),
  ];

  return (
    <nav className={styles.navigation} aria-label="Workspace navigation">
      <NavGroup compact={compact} label="WORKSPACE" items={workspaceItems} />
      <NavGroup compact={compact} label="ACTIVITY" items={activityItems} />
      <NavGroup compact={compact} label="SYSTEM" items={systemItems} />
    </nav>
  );
}

export function ForkRoomShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ workspaceId?: string }>();
  const [hasMounted, setHasMounted] = useState(false);
  const routeWorkspaceId = params.workspaceId;
  const workspaceList = useWorkspaces();
  const activeWorkspaceId = useUiStore((state) => state.activeWorkspaceId);
  const setActiveWorkspaceId = useUiStore(
    (state) => state.setActiveWorkspaceId,
  );
  const rememberedWorkspaceId = hasMounted ? activeWorkspaceId : null;
  const rememberedWorkspaceIsAccessible = workspaceList.data?.some(
    (item) => item.id === rememberedWorkspaceId,
  );
  const workspaceId =
    routeWorkspaceId ??
    (workspaceList.isSuccess
      ? rememberedWorkspaceIsAccessible
        ? rememberedWorkspaceId
        : workspaceList.data[0]?.id
      : rememberedWorkspaceId) ??
    undefined;
  const workspace = useWorkspace(workspaceId);
  const members = useWorkspaceMembers(workspaceId);
  const { data: user } = useCurrentUser();
  const unreadNotifications = useUnreadNotificationCount();
  const unreadMentions = useUnreadMentionCount();
  const logout = useLogout();
  const navigationOpen = useUiStore((state) => state.navigationOpen);
  const setNavigationOpen = useUiStore((state) => state.setNavigationOpen);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const displayName = user?.display_name ?? "ForkRoom user";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "FR";

  useEffect(() => setHasMounted(true), []);

  useEffect(() => {
    if (routeWorkspaceId && routeWorkspaceId !== activeWorkspaceId) {
      setActiveWorkspaceId(routeWorkspaceId);
    }
  }, [activeWorkspaceId, routeWorkspaceId, setActiveWorkspaceId]);

  useEffect(() => {
    if (
      !routeWorkspaceId &&
      workspaceList.isSuccess &&
      workspaceId !== activeWorkspaceId
    ) {
      setActiveWorkspaceId(workspaceId ?? null);
    }
  }, [
    activeWorkspaceId,
    routeWorkspaceId,
    setActiveWorkspaceId,
    workspaceId,
    workspaceList.isSuccess,
  ]);

  const currentMember = members.data?.find(
    (member) => member.user_id === user?.id,
  );
  const canCreateDecision = ["owner", "admin", "member"].includes(
    currentMember?.role ?? "viewer",
  );
  const canManageWorkspace = ["owner", "admin"].includes(
    currentMember?.role ?? "viewer",
  );

  const unreadCount = unreadNotifications.data?.unread ?? 0;
  const unreadMentionCount = unreadMentions.data?.count ?? 0;
  const section = pathname.startsWith("/settings/profile")
    ? "Profile"
    : pathname.startsWith("/settings/security")
      ? "Security"
      : pathname.includes("/documents")
        ? "Documents"
        : pathname.includes("/activity")
          ? "Recent activity"
          : pathname.includes("/mentions")
            ? "Mentions"
            : pathname.includes("/integrations")
              ? "Integrations"
      : pathname.startsWith("/notifications")
        ? "Notifications"
        : pathname.includes("/settings")
          ? "Settings"
          : pathname.includes("/members")
            ? "Members"
            : pathname.includes("/decisions/")
              ? "Decision"
              : pathname.endsWith("/decisions")
                ? "Decisions"
                : workspaceId
                  ? "Overview"
                  : "Workspaces";

  const signOut = async () => {
    try {
      await logout.mutateAsync();
      router.replace("/login");
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Could not sign out",
        message: getApiErrorMessage(
          error,
          "Your session remains active. Check the connection and try again.",
        ),
      });
    }
  };

  return (
    <div
      className={`${styles.shell} ${sidebarCollapsed ? styles.shellCollapsed : ""}`}
      data-sidebar-state={sidebarCollapsed ? "collapsed" : "expanded"}
    >
      <div className={styles.desktopMasthead}>
        <Tooltip
          label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          position="right"
          openDelay={250}
        >
          <ActionIcon
            className={styles.sidebarToggle}
            variant="subtle"
            color="dark"
            size={38}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-expanded={!sidebarCollapsed}
            aria-controls="workspace-sidebar"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <IconMenu2 size={21} stroke={1.8} aria-hidden="true" />
          </ActionIcon>
        </Tooltip>
        <Link href="/" className={styles.brand} aria-label="ForkRoom home">
          <span className={styles.brandName}>FORKROOM</span>
          <span className={styles.brandTagline}>DECISION WORKSPACE</span>
        </Link>
      </div>

      <aside
        id="workspace-sidebar"
        className={styles.sidebar}
        aria-label="Workspace sidebar"
      >
        <div>
          <Tooltip
            label="Switch workspace"
            position="right"
            disabled={!sidebarCollapsed}
            openDelay={250}
          >
            <Link
              href="/workspaces"
              className={styles.workspaceSwitcher}
              aria-label={sidebarCollapsed ? "Switch workspace" : undefined}
            >
              <span>
                <strong>{workspace.data?.name ?? "Choose workspace"}</strong>
                <small>
                  {workspaceId && members.data
                    ? `${members.data.length} members`
                    : "Switch workspace"}
                </small>
              </span>
              <IconChevronDown size={16} stroke={1.8} aria-hidden="true" />
            </Link>
          </Tooltip>

          <WorkspaceNavigation
            canManageWorkspace={canManageWorkspace}
            compact={sidebarCollapsed}
            pathname={pathname}
            unreadMentionCount={unreadMentionCount}
            unreadCount={unreadCount}
            workspaceId={workspaceId}
          />
        </div>

        <div className={styles.sidebarBottom}>
          <Divider color="var(--fr-border-strong)" />
          <Tooltip
            label="Profile and account settings"
            position="right"
            disabled={!sidebarCollapsed}
            openDelay={250}
          >
            <Link
              href="/settings/profile"
              className={styles.profileBlock}
              aria-label={
                sidebarCollapsed ? "Profile and account settings" : undefined
              }
            >
              <Avatar color="rust" size={34} radius="xl">
                {initials}
              </Avatar>
              <div className={styles.profileCopy}>
                <strong>{displayName}</strong>
                <span>{user?.email ?? "Signed in"}</span>
              </div>
            </Link>
          </Tooltip>
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
          <span>
            {pathname.startsWith("/settings")
              ? "Account"
              : (workspace.data?.name ?? "Workspace")}
          </span>
          <IconChevronRight size={14} aria-hidden="true" />
          <strong>{section}</strong>
        </div>

        <button
          type="button"
          className={styles.searchButton}
          aria-label={
            workspaceId
              ? `Search ${workspace.data?.name ?? "current workspace"}`
              : "Open ForkRoom command menu"
          }
          onClick={spotlight.open}
        >
          <IconSearch size={19} stroke={1.8} aria-hidden="true" />
          <span>
            {workspaceId
              ? "Search decisions or run a command"
              : "Run a ForkRoom command"}
          </span>
          <Kbd className={styles.searchKey}>Ctrl K</Kbd>
        </button>

        <div className={styles.headerActions}>
          <ActionIcon
            className={styles.mobileSearchAction}
            variant="subtle"
            color="dark"
            size={38}
            aria-label="Open search and commands"
            onClick={spotlight.open}
          >
            <IconSearch size={19} stroke={1.8} />
          </ActionIcon>
          <Indicator
            color="rust"
            size={16}
            offset={5}
            label={unreadCount > 99 ? "99+" : unreadCount}
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
                  ? "Notifications; unread count unavailable"
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
              <UnstyledButton
                className={styles.profileButton}
                aria-label="Open account menu"
              >
                <Avatar color="rust" radius="xl" size={34}>
                  {initials}
                </Avatar>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{displayName}</Menu.Label>
              <Menu.Item
                component={Link}
                href="/settings/profile"
                leftSection={<IconUserCircle size={16} stroke={1.8} />}
              >
                Profile
              </Menu.Item>
              <Menu.Item
                component={Link}
                href="/settings/security"
                leftSection={<IconShieldLock size={16} stroke={1.8} />}
              >
                Security
              </Menu.Item>
              <Menu.Divider />
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

      <GlobalSearch
        workspaceId={workspaceId}
        workspaceName={workspace.data?.name}
        canCreateDecision={canCreateDecision}
        canManageWorkspace={canManageWorkspace}
      />

      <Drawer
        opened={navigationOpen}
        onClose={() => setNavigationOpen(false)}
        title={<span className={styles.drawerTitle}>FORKROOM</span>}
        size="min(320px, 88vw)"
        padding="md"
      >
        <WorkspaceNavigation
          canManageWorkspace={canManageWorkspace}
          pathname={pathname}
          unreadMentionCount={unreadMentionCount}
          unreadCount={unreadCount}
          workspaceId={workspaceId}
        />
      </Drawer>
    </div>
  );
}
