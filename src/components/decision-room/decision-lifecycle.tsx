import {
  IconAlertTriangle,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconFileCheck,
  IconLock,
  IconUsers,
} from "@tabler/icons-react";

import styles from "./decision-room.module.css";

export type DecisionLifecycleStage =
  "draft" | "active" | "voting" | "closed" | "locked";

export type VotingReadiness = {
  activeProposalCount: number;
  eligibleVoterCount: number;
  quorumPercentage: number | null;
  blockingObjectionCount: number | null;
  processingEvidenceCount: number | null;
  issues: string[];
  isChecking: boolean;
  votingIsOpen: boolean;
};

const lifecycleSteps: Array<{
  value: DecisionLifecycleStage;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "voting", label: "Voting" },
  { value: "closed", label: "Closed" },
  { value: "locked", label: "Locked" },
];

export function DecisionLifecycleIndicator({
  stage,
}: {
  stage: DecisionLifecycleStage;
}) {
  const activeIndex = lifecycleSteps.findIndex((step) => step.value === stage);

  return (
    <nav className={styles.lifecycle} aria-label="Decision lifecycle">
      <ol>
        {lifecycleSteps.map((step, index) => {
          const completed = index < activeIndex;
          const current = index === activeIndex;

          return (
            <li
              key={step.value}
              className={`${completed ? styles.lifecycleComplete : ""} ${
                current ? styles.lifecycleCurrent : ""
              }`}
              aria-current={current ? "step" : undefined}
            >
              <span className={styles.lifecycleMarker}>
                {completed ? <IconCheck size={11} stroke={2.4} /> : index + 1}
              </span>
              <span className={styles.lifecycleLabel}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ReadinessMetric({
  icon,
  label,
  value,
  detail,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  status: "ready" | "warning" | "neutral";
}) {
  return (
    <div
      className={`${styles.readinessMetric} ${styles[`readinessMetric${status}`]}`}
    >
      <span className={styles.readinessMetricIcon}>{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export function VotingReadinessPanel({
  readiness,
}: {
  readiness: VotingReadiness;
}) {
  const ready = readiness.issues.length === 0 && !readiness.isChecking;
  const requiredVotes =
    readiness.quorumPercentage === null
      ? null
      : Math.ceil(
          (readiness.eligibleVoterCount * readiness.quorumPercentage) / 100,
        );
  const exactReason = readiness.isChecking
    ? "ForkRoom is still verifying voting readiness."
    : readiness.votingIsOpen
      ? "Voting is open. Eligibility and ballot proposals are now snapshotted."
      : (readiness.issues[0] ??
        "All checks passed. This draft round can be opened for voting.");

  return (
    <section
      className={styles.readinessPanel}
      aria-labelledby="voting-readiness-title"
    >
      <div className={styles.readinessHeader}>
        <div>
          <span className={styles.sectionIndex}>VOTING READINESS</span>
          <h2 id="voting-readiness-title">Ready to start voting?</h2>
        </div>
        <span
          className={`${styles.readinessState} ${
            ready ? styles.readinessStateReady : styles.readinessStateBlocked
          }`}
        >
          {ready ? (
            <IconCircleCheck size={15} />
          ) : readiness.isChecking ? (
            <IconClock size={15} />
          ) : (
            <IconAlertTriangle size={15} />
          )}
          {readiness.votingIsOpen
            ? "Voting open"
            : ready
              ? "Ready"
              : readiness.isChecking
                ? "Checking"
                : "Not ready"}
        </span>
      </div>

      <div className={styles.readinessMetrics}>
        <ReadinessMetric
          icon={<IconFileCheck size={17} />}
          label="ACTIVE PROPOSALS"
          value={String(readiness.activeProposalCount)}
          detail="2 submitted proposals required"
          status={readiness.activeProposalCount >= 2 ? "ready" : "warning"}
        />
        <ReadinessMetric
          icon={<IconUsers size={17} />}
          label="ELIGIBLE VOTERS"
          value={String(readiness.eligibleVoterCount)}
          detail="Owners, admins, and members"
          status={readiness.eligibleVoterCount > 0 ? "ready" : "warning"}
        />
        <ReadinessMetric
          icon={<IconCircleCheck size={17} />}
          label="QUORUM"
          value={
            readiness.quorumPercentage === null
              ? "Not configured"
              : `${readiness.quorumPercentage}%`
          }
          detail={
            requiredVotes === null
              ? "Configured when a draft round is created"
              : `${requiredVotes} of ${readiness.eligibleVoterCount} eligible voters required`
          }
          status={readiness.quorumPercentage === null ? "neutral" : "ready"}
        />
        <ReadinessMetric
          icon={<IconAlertTriangle size={17} />}
          label="BLOCKING OBJECTIONS"
          value={
            readiness.blockingObjectionCount === null
              ? "Checking"
              : String(readiness.blockingObjectionCount)
          }
          detail="Every blocking concern must be addressed"
          status={readiness.blockingObjectionCount === 0 ? "ready" : "warning"}
        />
        <ReadinessMetric
          icon={<IconClock size={17} />}
          label="EVIDENCE PROCESSING"
          value={
            readiness.processingEvidenceCount === null
              ? "Checking"
              : String(readiness.processingEvidenceCount)
          }
          detail="Wait for uploads to finish verification"
          status={readiness.processingEvidenceCount === 0 ? "ready" : "warning"}
        />
      </div>

      <div className={styles.freezeSummary}>
        <IconLock size={17} />
        <div>
          <strong>What becomes fixed</strong>
          <p>
            Opening voting snapshots eligible voters and submitted proposal IDs.
            Locking later preserves the decision context, selected proposal,
            voting result, and recorded objections and dissent.
          </p>
        </div>
      </div>

      <div
        className={`${styles.readinessReason} ${
          ready ? styles.readinessReasonReady : styles.readinessReasonBlocked
        }`}
        role="status"
      >
        {ready ? (
          <IconCircleCheck size={17} />
        ) : (
          <IconAlertTriangle size={17} />
        )}
        <div>
          <strong>
            {readiness.votingIsOpen
              ? "Current state"
              : ready
                ? "Voting can start"
                : "Why voting cannot start"}
          </strong>
          <span>{exactReason}</span>
          {!readiness.isChecking && readiness.issues.length > 1 && (
            <ul>
              {readiness.issues.slice(1).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}