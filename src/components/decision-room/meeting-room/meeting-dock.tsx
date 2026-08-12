"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Alert, Button, Loader, Tooltip } from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconEye,
  IconMicrophone,
  IconMicrophoneOff,
  IconRefresh,
  IconUsers,
  IconVideo,
  IconWifi,
  IconWifiOff,
  IconX,
} from "@tabler/icons-react";

import { useMeeting } from "@/hooks/use-meeting";

import styles from "./meeting.module.css";
import { MeetingControls } from "./meeting-controls";
import { MeetingTile } from "./meeting-tile";

type MeetingDockProps = {
  workspaceId: string;
  decisionId: string;
  currentUser: {
    id: string;
    displayName: string;
    role: string;
  };
  opened: boolean;
  protectedActionVisible: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export function MeetingDock({
  workspaceId,
  decisionId,
  currentUser,
  opened,
  protectedActionVisible,
  onOpen,
  onClose,
}: MeetingDockProps) {
  const [expanded, setExpanded] = useState(false);
  const meeting = useMeeting({ workspaceId, decisionId, currentUser });
  const connected = meeting.status === "connected";
  const connecting = ["joining", "reconnecting"].includes(meeting.status);
  const orderedParticipants = useMemo(
    () =>
      [...meeting.participants].sort((left, right) => {
        if (left.screenSharing !== right.screenSharing) {
          return left.screenSharing ? -1 : 1;
        }
        if (
          (left.userId === meeting.activeSpeakerId) !==
          (right.userId === meeting.activeSpeakerId)
        ) {
          return left.userId === meeting.activeSpeakerId ? -1 : 1;
        }
        if (left.isLocal !== right.isLocal) return left.isLocal ? 1 : -1;
        return (left.joinedAt ?? "").localeCompare(right.joinedAt ?? "");
      }),
    [meeting.activeSpeakerId, meeting.participants],
  );

  const leaveMeeting = () => {
    meeting.leave();
    setExpanded(false);
    onClose();
  };

  useEffect(() => {
    if (!expanded) return;
    const exitFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", exitFocus);
    return () => window.removeEventListener("keydown", exitFocus);
  }, [expanded]);

  if (!opened) {
    if (!connected && meeting.status !== "reconnecting") return null;
    return (
      <button
        type="button"
        className={`${styles.minimizedMeeting} ${
          protectedActionVisible ? styles.aboveProtectedAction : ""
        }`}
        onClick={onOpen}
        aria-label={`Open live meeting. ${meeting.participants.length} participants. Your microphone is ${meeting.audioEnabled ? "on" : "muted"}.`}
      >
        <span className={styles.liveDot} />
        <IconVideo size={17} />
        <strong>Meeting live</strong>
        <span className={styles.minimizedCount}>
          <IconUsers size={13} /> {meeting.participants.length}
        </span>
        <span
          className={`${styles.minimizedMic} ${
            meeting.audioEnabled ? styles.minimizedMicOn : ""
          }`}
          title={meeting.audioEnabled ? "Microphone on" : "Microphone muted"}
        >
          {meeting.audioEnabled ? (
            <IconMicrophone size={14} />
          ) : (
            <IconMicrophoneOff size={14} />
          )}
        </span>
      </button>
    );
  }

  return (
    <aside
      className={`${styles.meetingDock} ${
        expanded ? styles.meetingExpanded : ""
      }`}
      aria-label="Live decision meeting"
      aria-modal={expanded || undefined}
      role={expanded ? "dialog" : "complementary"}
    >
      <header className={styles.meetingHeader}>
        <div>
          <span className={styles.meetingKicker}>
            {expanded ? "MEETING FOCUS" : "LIVE MEETING"}
          </span>
          <div className={styles.meetingTitleRow}>
            <h2>Decision call</h2>
            {connected && <span className={styles.liveLabel}>LIVE</span>}
          </div>
          {expanded && (
            <span className={styles.focusHint}>
              Press Esc to return to the Decision Room
            </span>
          )}
        </div>
        <div className={styles.meetingHeaderActions}>
          {connected && (
            <Tooltip
              label={expanded ? "Return to compact dock" : "Expand meeting"}
            >
              <ActionIcon
                variant="subtle"
                color="dark"
                size={40}
                aria-label={
                  expanded ? "Return to compact dock" : "Expand meeting"
                }
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? (
                  <IconArrowsMinimize size={19} />
                ) : (
                  <IconArrowsMaximize size={19} />
                )}
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip
            label={connected ? "Minimize meeting" : "Close meeting panel"}
          >
            <ActionIcon
              variant="subtle"
              color="dark"
              size={40}
              aria-label={
                connected ? "Minimize meeting" : "Close meeting panel"
              }
              onClick={() => {
                setExpanded(false);
                onClose();
              }}
            >
              <IconX size={19} />
            </ActionIcon>
          </Tooltip>
        </div>
      </header>

      <div className={styles.meetingBody}>
        {meeting.error && (
          <Alert
            className={styles.meetingIssue}
            color={meeting.error.kind === "permission" ? "orange" : "red"}
            title={meeting.error.title}
            icon={<IconAlertTriangle />}
            data-issue-kind={meeting.error.kind}
          >
            {meeting.error.message}
          </Alert>
        )}
        {meeting.warning && (
          <Alert
            className={styles.meetingIssue}
            color={meeting.warning.kind === "relay" ? "red" : "orange"}
            title={meeting.warning.title}
            icon={<IconAlertTriangle />}
            data-issue-kind={meeting.warning.kind}
          >
            <span>{meeting.warning.message}</span>
            {meeting.warning.kind === "relay" && meeting.warning.retryable && (
              <Button
                className={styles.issueAction}
                variant="default"
                size="compact-xs"
                leftSection={<IconRefresh size={14} />}
                onClick={() => void meeting.retryMediaConnection()}
              >
                Retry media
              </Button>
            )}
          </Alert>
        )}

        {meeting.status === "idle" || meeting.status === "error" ? (
          <div className={styles.preJoin}>
            <div className={styles.preJoinIcon}>
              {currentUser.role === "viewer" ? (
                <IconEye size={31} />
              ) : (
                <IconVideo size={31} />
              )}
            </div>
            <div>
              <h3>
                {currentUser.role === "viewer"
                  ? "Join as a viewer"
                  : "Join the decision call"}
              </h3>
              <p>
                {currentUser.role === "viewer"
                  ? "You can watch and listen. Viewer access is receive-only."
                  : "Your browser will ask for camera and microphone access. You can change both after joining."}
              </p>
            </div>
            <Button
              color="rust"
              leftSection={<IconVideo size={18} />}
              onClick={() => void meeting.join()}
              disabled={Boolean(meeting.error && !meeting.error.retryable)}
              title={
                meeting.error && !meeting.error.retryable
                  ? meeting.error.message
                  : undefined
              }
            >
              {meeting.status === "error"
                ? "Try joining again"
                : "Join meeting"}
            </Button>
            <span className={styles.capacityNote}>
              <IconUsers size={14} /> Up to {meeting.maxParticipants}{" "}
              participants
            </span>
          </div>
        ) : connecting ? (
          <div className={styles.connectingState} role="status">
            <Loader color="rust" size="sm" />
            <strong>
              {meeting.status === "reconnecting"
                ? "Reconnecting to the meeting…"
                : "Joining the meeting…"}
            </strong>
            <span>Your decision room remains available.</span>
          </div>
        ) : (
          <>
            <div className={styles.meetingMeta} aria-live="polite">
              <span>
                <IconUsers size={15} /> {meeting.participants.length}/
                {meeting.maxParticipants}
              </span>
              <span
                className={
                  meeting.quality === "poor" ? styles.qualityPoor : undefined
                }
              >
                {meeting.quality === "poor" ? (
                  <IconWifiOff size={15} />
                ) : (
                  <IconWifi size={15} />
                )}
                {meeting.quality === "waiting"
                  ? "Waiting for others"
                  : `${meeting.quality} connection`}
              </span>
              <span className={styles.permissionLabel}>
                {meeting.permission === "facilitate"
                  ? "Facilitator"
                  : meeting.permission === "observe"
                    ? "View only"
                    : "Participant"}
              </span>
            </div>

            <div
              className={`${styles.tileGrid} ${
                orderedParticipants.some((participant) =>
                  Boolean(participant.screenSharing),
                )
                  ? styles.tileGridWithShare
                  : ""
              }`}
            >
              {orderedParticipants.map((participant) => (
                <MeetingTile
                  key={participant.userId}
                  participant={participant}
                  activeSpeaker={participant.userId === meeting.activeSpeakerId}
                />
              ))}
            </div>

            {meeting.participants.length === 1 && (
              <div className={styles.waitingNote}>
                <span className={styles.liveDot} />
                You are the first here. Others can join from this Decision Room.
              </div>
            )}

            {meeting.permission && (
              <MeetingControls
                permission={meeting.permission}
                audioEnabled={meeting.audioEnabled}
                videoEnabled={meeting.videoEnabled}
                screenSharing={meeting.screenSharing}
                onToggleAudio={meeting.toggleAudio}
                onToggleVideo={meeting.toggleVideo}
                onToggleScreenShare={meeting.toggleScreenShare}
                onLeave={leaveMeeting}
              />
            )}
          </>
        )}
      </div>
    </aside>
  );
}