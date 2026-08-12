"use client";

import { useMemo, useState } from "react";
import { Alert, Badge, Button, Group, Loader, Menu } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconBan,
  IconCalendarEvent,
  IconCheck,
  IconDots,
  IconEdit,
  IconPlus,
  IconRefresh,
} from "@tabler/icons-react";

import {
  useCancelDecisionReview,
  useDecisionReviews,
} from "@/hooks/use-workspaces";
import { getApiErrorMessage } from "@/services/auth.service";
import type {
  DecisionReview,
  ReviewOutcomeResponse,
  WorkspaceMember,
} from "@/services/workspace.service";

import styles from "./decision-room.module.css";
import { ReviewOutcomeModal } from "./review-outcome-modal";
import { ReviewScheduleModal } from "./review-schedule-modal";

type DecisionReviewsPanelProps = {
  workspaceId: string;
  decisionId: string;
  members: WorkspaceMember[];
  canManageReviews: boolean;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));

const outcomeLabel = {
  confirmed: "Decision confirmed",
  reopened: "Reopened for revision",
  superseded: "Decision superseded",
};

export function DecisionReviewsPanel({
  workspaceId,
  decisionId,
  members,
  canManageReviews,
}: DecisionReviewsPanelProps) {
  const reviews = useDecisionReviews(workspaceId, decisionId);
  const cancelReview = useCancelDecisionReview(workspaceId, decisionId);
  const [scheduleEditor, setScheduleEditor] = useState<
    DecisionReview | null | undefined
  >();
  const [outcomeReview, setOutcomeReview] = useState<DecisionReview | null>(
    null,
  );
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member])),
    [members],
  );
  const [referenceTime] = useState(() => Date.now());
  const reviewItems = [...(reviews.data ?? [])].sort((left, right) => {
    if (left.status === "scheduled" && right.status !== "scheduled") return -1;
    if (right.status === "scheduled" && left.status !== "scheduled") return 1;
    return (
      new Date(left.scheduled_for).getTime() -
      new Date(right.scheduled_for).getTime()
    );
  });
  const scheduledReviews = reviewItems.filter(
    (review) => review.status === "scheduled",
  );
  const dueCount = scheduledReviews.filter(
    (review) => new Date(review.scheduled_for).getTime() <= referenceTime,
  ).length;
  const completedCount = reviewItems.filter(
    (review) => review.status === "completed",
  ).length;

  const confirmCancel = (review: DecisionReview) => {
    modals.openConfirmModal({
      title: "Cancel this review checkpoint?",
      children: (
        <p className={styles.confirmCopy}>
          The cancelled checkpoint remains in the decision timeline for
          traceability. No review outcome will be recorded.
        </p>
      ),
      labels: { confirm: "Cancel review", cancel: "Keep scheduled" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await cancelReview.mutateAsync(review.id);
          notifications.show({
            color: "orange",
            title: "Review cancelled",
            message: "The cancelled checkpoint remains in the review history.",
          });
        } catch {
          // The panel exposes the backend error.
        }
      },
    });
  };

  const handleOutcome = (result: ReviewOutcomeResponse) => {
    const outcome = result.review.outcome;
    notifications.show({
      color: outcome === "confirmed" ? "green" : "orange",
      title: outcome ? outcomeLabel[outcome] : "Review completed",
      message: result.successor_decision
        ? `Successor decision created: ${result.successor_decision.title}.`
        : result.revision
          ? "A linked decision revision was created."
          : "The outcome is now part of the locked decision record.",
    });
  };

  if (reviews.isPending) {
    return (
      <div className={styles.followThroughState}>
        <Loader color="rust" size="xs" /> Loading review checkpoints…
      </div>
    );
  }

  if (reviews.isError) {
    return (
      <Alert color="red" title="Reviews could not be loaded">
        {getApiErrorMessage(
          reviews.error,
          "ForkRoom could not load this decision review timeline.",
        )}
        <Button
          mt="sm"
          size="compact-sm"
          variant="default"
          leftSection={<IconRefresh size={14} />}
          onClick={() => void reviews.refetch()}
        >
          Retry reviews
        </Button>
      </Alert>
    );
  }

  return (
    <section className={styles.followThroughPanel}>
      <div className={styles.followThroughHeading}>
        <div>
          <div className={styles.sectionIndex}>01 / REVIEW</div>
          <h2>Decision checkpoints</h2>
          <p>
            Revisit assumptions without rewriting the immutable decision record.
          </p>
        </div>
        {canManageReviews && (
          <Button
            color="rust"
            leftSection={<IconPlus size={16} />}
            onClick={() => setScheduleEditor(null)}
          >
            Schedule review
          </Button>
        )}
      </div>

      <div className={styles.followThroughMetrics}>
        <div className={dueCount > 0 ? styles.metricAttention : undefined}>
          <span>DUE NOW</span>
          <strong>{dueCount}</strong>
        </div>
        <div>
          <span>UPCOMING</span>
          <strong>{scheduledReviews.length - dueCount}</strong>
        </div>
        <div>
          <span>COMPLETED</span>
          <strong>{completedCount}</strong>
        </div>
      </div>

      {cancelReview.error && (
        <Alert color="red" title="Review was not cancelled">
          {getApiErrorMessage(
            cancelReview.error,
            "ForkRoom rejected this review transition.",
          )}
        </Alert>
      )}

      {reviewItems.length === 0 ? (
        <div className={styles.followThroughEmpty}>
          <IconCalendarEvent size={25} />
          <strong>No review scheduled</strong>
          <p>
            Add a checkpoint for the team to confirm, reopen, or supersede this
            decision when new evidence arrives.
          </p>
        </div>
      ) : (
        <div className={styles.reviewTimeline}>
          {reviewItems.map((review) => {
            const due =
              review.status === "scheduled" &&
              new Date(review.scheduled_for).getTime() <= referenceTime;
            const scheduledBy = memberById.get(review.scheduled_by_id);
            const completedBy = review.completed_by_id
              ? memberById.get(review.completed_by_id)
              : null;

            return (
              <article key={review.id} className={styles.reviewRow}>
                <div
                  className={styles.reviewTimelineMarker}
                  aria-hidden="true"
                />
                <div className={styles.reviewContent}>
                  <Group
                    justify="space-between"
                    align="flex-start"
                    wrap="nowrap"
                  >
                    <div>
                      <Group gap="xs">
                        <Badge
                          color={
                            review.status === "completed"
                              ? "green"
                              : review.status === "cancelled"
                                ? "gray"
                                : due
                                  ? "orange"
                                  : "blue"
                          }
                          variant="light"
                        >
                          {review.status === "scheduled" && due
                            ? "Due for review"
                            : review.status}
                        </Badge>
                        {review.outcome && (
                          <Badge color="dark" variant="light">
                            {outcomeLabel[review.outcome]}
                          </Badge>
                        )}
                      </Group>
                      <h3>{formatDateTime(review.scheduled_for)}</h3>
                    </div>

                    {canManageReviews && review.status === "scheduled" && (
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <Button
                            variant="default"
                            size="xs"
                            rightSection={<IconDots size={14} />}
                            aria-label={`Manage review scheduled for ${formatDateTime(
                              review.scheduled_for,
                            )}`}
                          >
                            Manage
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconCheck size={15} />}
                            onClick={() => setOutcomeReview(review)}
                          >
                            Record outcome
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconEdit size={15} />}
                            onClick={() => setScheduleEditor(review)}
                          >
                            Reschedule
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconBan size={15} />}
                            onClick={() => confirmCancel(review)}
                          >
                            Cancel review
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    )}
                  </Group>

                  {review.notes && <p>{review.notes}</p>}
                  {review.outcome_rationale && (
                    <blockquote>{review.outcome_rationale}</blockquote>
                  )}

                  <div className={styles.reviewMetadata}>
                    <span>
                      Scheduled by{" "}
                      <strong>
                        {scheduledBy?.display_name ??
                          scheduledBy?.email ??
                          "Workspace admin"}
                      </strong>
                    </span>
                    {review.completed_at && (
                      <span>
                        Completed {formatDateTime(review.completed_at)}
                        {completedBy
                          ? ` by ${completedBy.display_name ?? completedBy.email}`
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ReviewScheduleModal
        workspaceId={workspaceId}
        decisionId={decisionId}
        review={scheduleEditor ?? null}
        opened={scheduleEditor !== undefined}
        onClose={() => setScheduleEditor(undefined)}
      />
      <ReviewOutcomeModal
        workspaceId={workspaceId}
        decisionId={decisionId}
        review={outcomeReview}
        opened={Boolean(outcomeReview)}
        onClose={() => setOutcomeReview(null)}
        onCompleted={handleOutcome}
      />
    </section>
  );
}
