"use client";

import { useState } from "react";
import { ActionIcon, Alert, Button, Loader, Tooltip } from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconEye,
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
  onOpen: () => void;
  onClose: () => void;
};

export function MeetingDock({
  workspaceId,
  decisionId,
  currentUser,
  opened,
  onOpen,
  onClose,
}: MeetingDockProps) {
  const [expanded, setExpanded] = useState(false);
  const meeting = useMeeting({ workspaceId, decisionId, currentUser });
  const connected = meeting.status === "connected";
  const connecting = ["joining", "reconnecting"].includes(meeting.status);

  const leaveMeeting = () => {
    meeting.leave();
    setExpanded(false);
    onClose();
  };

  if (!opened) {
    if (!connected && meeting.status !== "reconnecting") return null;
    return (
      <button
        type="button"
        className={styles.minimizedMeeting}
        onClick={onOpen}
      >
        <span className={styles.liveDot} />
        <IconVideo size={17} />
        <strong>Meeting live</strong>
        <span>{meeting.participants.length}</span>
      </button>
    );
  }

  return (
    <aside
      className={`${styles.meetingDock} ${
        expanded ? styles.meetingExpanded : ""
      }`}
      aria-label="Live decision meeting"
    >
      <header className={styles.meetingHeader}>
        <div>
          <span className={styles.meetingKicker}>LIVE MEETING</span>
          <div className={styles.meetingTitleRow}>
            <h2>Decision call</h2>
            {connected && <span className={styles.liveLabel}>LIVE</span>}
          </div>
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
            color="red"
            title="Could not join meeting"
            icon={<IconAlertTriangle />}
          >
            {meeting.error}
          </Alert>
        )}
        {meeting.warning && (
          <Alert
            color="orange"
            title="Meeting notice"
            icon={<IconAlertTriangle />}
          >
            {meeting.warning}
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

            <div className={styles.tileGrid}>
              {meeting.participants.map((participant) => (
                <MeetingTile
                  key={participant.userId}
                  participant={participant}
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