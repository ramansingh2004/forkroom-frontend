"use client";

import { useEffect, useState } from "react";
import { Button, Skeleton } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconCloudCheck,
  IconCloudOff,
  IconRefresh,
  IconWifi,
} from "@tabler/icons-react";

import { getApiErrorInfo } from "@/lib/api/errors";

import styles from "./app-feedback.module.css";

type ConnectionState = "online" | "offline" | "reconnecting" | "reconnected";

export function ConnectionStatus() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ConnectionState>(() =>
    typeof navigator !== "undefined" && !navigator.onLine
      ? "offline"
      : "online",
  );

  useEffect(() => {
    let successTimer: ReturnType<typeof setTimeout> | undefined;

    const handleOffline = () => {
      if (successTimer) clearTimeout(successTimer);
      setState("offline");
    };
    const handleOnline = async () => {
      setState("reconnecting");
      await queryClient.refetchQueries({ type: "active" });
      setState("reconnected");
      successTimer = setTimeout(() => setState("online"), 4_000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      if (successTimer) clearTimeout(successTimer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [queryClient]);

  if (state === "online") return null;

  const content = {
    offline: {
      icon: IconCloudOff,
      title: "You are offline",
      detail:
        "Server actions are paused. ForkRoom will reconnect automatically.",
    },
    reconnecting: {
      icon: IconWifi,
      title: "Reconnecting…",
      detail: "Refreshing permissions and the latest decision state.",
    },
    reconnected: {
      icon: IconCloudCheck,
      title: "Reconnected",
      detail: "Active ForkRoom data has been refreshed.",
    },
  }[state];
  const Icon = content.icon;

  return (
    <div
      className={styles.connectionBanner}
      data-state={state}
      role="status"
      aria-live="polite"
    >
      <Icon size={19} aria-hidden="true" />
      <div>
        <strong>{content.title}</strong>
        <span>{content.detail}</span>
      </div>
    </div>
  );
}

export function RecoveryState({
  error,
  fallback,
  title,
  onRetry,
}: {
  error: unknown;
  fallback: string;
  title: string;
  onRetry?: () => void;
}) {
  const info = getApiErrorInfo(error, fallback);

  return (
    <section
      className={styles.statePanel}
      data-kind={info.kind === "forbidden" ? "permission" : "error"}
    >
      <IconAlertTriangle size={24} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{info.message}</p>
      {onRetry && info.retryable && (
        <div className={styles.stateActions}>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={onRetry}
          >
            Retry
          </Button>
        </div>
      )}
    </section>
  );
}

export function PageSkeleton({ label = "Loading page" }: { label?: string }) {
  return (
    <div className={styles.pageSkeleton} role="status" aria-label={label}>
      <div className={styles.skeletonHeader}>
        <Skeleton width={110} height={12} radius={0} />
        <Skeleton width="min(420px, 72%)" height={34} radius={0} />
        <Skeleton width="min(620px, 90%)" height={15} radius={0} />
      </div>
      <div className={styles.skeletonGrid}>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} height={74} radius={0} />
        ))}
      </div>
    </div>
  );
}

export function DecisionRoomSkeleton() {
  return (
    <div
      className={styles.roomSkeleton}
      role="status"
      aria-label="Opening decision room"
    >
      <Skeleton height="100%" radius={0} />
      <Skeleton height="100%" radius={0} />
      <Skeleton height="100%" radius={0} />
    </div>
  );
}
