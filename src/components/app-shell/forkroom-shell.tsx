'use client';

import Link from 'next/link';
import {
  ActionIcon,
  Avatar,
  Burger,
  Button,
  Divider,
  Drawer,
  Indicator,
  Kbd,
  Tooltip,
} from '@mantine/core';
import {
  IconBell,
  IconBolt,
  IconChevronDown,
  IconFileExport,
  IconHome,
  IconListCheck,
  IconSearch,
  IconSettings,
  IconUsers,
  IconVocabulary,
} from '@tabler/icons-react';
import { useUiStore } from '@/stores/use-ui-store';
import styles from './forkroom-shell.module.css';

const navigation = [
  { label: 'Home', icon: IconHome, href: '#' },
  { label: 'Decisions', icon: IconVocabulary, href: '/decisions/authentication-strategy', active: true },
  { label: 'Actions', icon: IconListCheck, href: '#' },
  { label: 'Reviews', icon: IconBolt, href: '#' },
  { label: 'Exports', icon: IconFileExport, href: '#' },
  { label: 'Members', icon: IconUsers, href: '#' },
];

function NavigationLinks({ compact = false }: { compact?: boolean }) {
  return (
    <nav className={styles.navigation} aria-label="Workspace navigation">
      <div className={styles.navLabel}>WORKSPACE</div>
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <Tooltip key={item.label} label={item.label} position="right" disabled={!compact}>
            <Link
              href={item.href}
              className={`${styles.navItem} ${item.active ? styles.navItemActive : ''}`}
              aria-current={item.active ? 'page' : undefined}
            >
              <Icon size={19} stroke={1.8} aria-hidden="true" />
              <span className={styles.navText}>{item.label}</span>
            </Link>
          </Tooltip>
        );
      })}
    </nav>
  );
}

export function ForkRoomShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const navigationOpen = useUiStore((state) => state.navigationOpen);
  const setNavigationOpen = useUiStore((state) => state.setNavigationOpen);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandArea}>
          <Burger
            className={styles.mobileBurger}
            opened={navigationOpen}
            onClick={() => setNavigationOpen(!navigationOpen)}
            size="sm"
            aria-label="Open navigation"
          />
          <Link href="/" className={styles.brand} aria-label="ForkRoom home">
            <span className={styles.brandMark} aria-hidden="true">F</span>
            <span className={styles.brandName}>ForkRoom</span>
          </Link>
        </div>

        <div className={styles.context} aria-label="Current workspace">
          <span className={styles.contextName}>Nexus Engineering</span>
          <IconChevronDown size={14} stroke={2} aria-hidden="true" />
        </div>

        <div className={styles.headerActions}>
          <Button
            className={styles.searchButton}
            variant="subtle"
            leftSection={<IconSearch size={17} stroke={1.8} />}
            rightSection={<Kbd className={styles.searchKey}>Ctrl K</Kbd>}
          >
            Search
          </Button>
          <Indicator color="rust" size={7} offset={5}>
            <ActionIcon variant="subtle" color="dark" size={40} aria-label="Notifications">
              <IconBell size={20} stroke={1.8} />
            </ActionIcon>
          </Indicator>
          <Avatar color="rust" radius="xl" size={34} aria-label="Raman Singh">RS</Avatar>
        </div>
      </header>

      <aside className={styles.sidebar}>
        <NavigationLinks />
        <div className={styles.sidebarBottom}>
          <Divider color="var(--fr-border-strong)" />
          <Link href="#" className={styles.navItem}>
            <IconSettings size={19} stroke={1.8} aria-hidden="true" />
            <span className={styles.navText}>Settings</span>
          </Link>
          <div className={styles.profileBlock}>
            <Avatar color="dark" size={30} radius="xl">RS</Avatar>
            <div className={styles.profileCopy}>
              <strong>Raman Singh</strong>
              <span>Workspace owner</span>
            </div>
          </div>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>

      <Drawer
        opened={navigationOpen}
        onClose={() => setNavigationOpen(false)}
        title={<span className={styles.drawerTitle}>ForkRoom</span>}
        size="min(320px, 88vw)"
        padding="md"
      >
        <NavigationLinks />
        <Divider my="md" />
        <Link href="#" className={styles.navItem}>
          <IconSettings size={19} stroke={1.8} />
          <span>Settings</span>
        </Link>
      </Drawer>
    </div>
  );
}