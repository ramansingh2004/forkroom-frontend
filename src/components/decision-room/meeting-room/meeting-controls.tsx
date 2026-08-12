"use client";

import { ActionIcon, Group, Tooltip } from "@mantine/core";
import {
  IconMicrophone,
  IconMicrophoneOff,
  IconPhoneOff,
  IconScreenShare,
  IconScreenShareOff,
  IconVideo,
  IconVideoOff,
} from "@tabler/icons-react";

import type { MeetingPermission } from "@/services/meeting .service";

import styles from "./meeting.module.css";

type MeetingControlsProps = {
  permission: MeetingPermission;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  onToggleAudio: () => Promise<void>;
  onToggleVideo: () => Promise<void>;
  onToggleScreenShare: () => Promise<void>;
  onLeave: () => void;
};

export function MeetingControls({
  permission,
  audioEnabled,
  videoEnabled,
  screenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
}: MeetingControlsProps) {
  const receiveOnly = permission === "observe";

  return (
    <Group className={styles.controls} gap={8} justify="center" wrap="nowrap">
      <Tooltip
        label={
          receiveOnly
            ? "Viewers join without a microphone"
            : audioEnabled
              ? "Mute microphone"
              : "Turn on microphone"
        }
      >
        <span>
          <ActionIcon
            className={styles.controlButton}
            variant={audioEnabled ? "light" : "filled"}
            color={audioEnabled ? "dark" : "red"}
            size={42}
            radius="xl"
            disabled={receiveOnly}
            aria-label={audioEnabled ? "Mute microphone" : "Turn on microphone"}
            aria-pressed={audioEnabled}
            onClick={() => void onToggleAudio()}
          >
            {audioEnabled ? (
              <IconMicrophone size={20} />
            ) : (
              <IconMicrophoneOff size={20} />
            )}
          </ActionIcon>
        </span>
      </Tooltip>

      <Tooltip
        label={
          receiveOnly
            ? "Viewers join without a camera"
            : screenSharing
              ? "Stop sharing before changing the camera"
              : videoEnabled
                ? "Turn off camera"
                : "Turn on camera"
        }
      >
        <span>
          <ActionIcon
            className={styles.controlButton}
            variant={videoEnabled ? "light" : "filled"}
            color={videoEnabled ? "dark" : "red"}
            size={42}
            radius="xl"
            disabled={receiveOnly || screenSharing}
            aria-label={videoEnabled ? "Turn off camera" : "Turn on camera"}
            aria-pressed={videoEnabled}
            onClick={() => void onToggleVideo()}
          >
            {videoEnabled ? (
              <IconVideo size={20} />
            ) : (
              <IconVideoOff size={20} />
            )}
          </ActionIcon>
        </span>
      </Tooltip>

      <Tooltip
        label={
          receiveOnly
            ? "Viewers cannot share their screen"
            : screenSharing
              ? "Stop sharing screen"
              : "Share screen"
        }
      >
        <span>
          <ActionIcon
            className={styles.controlButton}
            variant={screenSharing ? "filled" : "light"}
            color={screenSharing ? "rust" : "dark"}
            size={42}
            radius="xl"
            disabled={receiveOnly}
            aria-label={screenSharing ? "Stop sharing screen" : "Share screen"}
            aria-pressed={screenSharing}
            onClick={() => void onToggleScreenShare()}
          >
            {screenSharing ? (
              <IconScreenShareOff size={20} />
            ) : (
              <IconScreenShare size={20} />
            )}
          </ActionIcon>
        </span>
      </Tooltip>

      <Tooltip label="Leave meeting">
        <ActionIcon
          className={`${styles.controlButton} ${styles.leaveButton}`}
          variant="filled"
          color="red"
          size={42}
          radius="xl"
          aria-label="Leave meeting"
          onClick={onLeave}
        >
          <IconPhoneOff size={20} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}