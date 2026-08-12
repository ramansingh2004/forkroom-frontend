"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  IconMicrophone,
  IconMicrophoneOff,
  IconScreenShare,
  IconVideo,
  IconVideoOff,
} from "@tabler/icons-react";

import type { MeetingParticipant } from "@/lib/meeting/types";

import styles from "./meeting.module.css";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type MeetingTileProps = {
  participant: MeetingParticipant;
  activeSpeaker: boolean;
};

export function MeetingTile({ participant, activeSpeaker }: MeetingTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const label = useMemo(
    () => initials(participant.displayName) || "?",
    [participant.displayName],
  );
  const hasVisibleVideo =
    Boolean(participant.stream?.getVideoTracks().length) &&
    participant.videoEnabled;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = participant.stream;
    if (participant.stream) void video.play().catch(() => undefined);
    return () => {
      video.srcObject = null;
    };
  }, [participant.stream]);

  return (
    <article
      className={`${styles.tile} ${
        participant.screenSharing ? styles.tileScreenShare : ""
      } ${activeSpeaker ? styles.tileSpeaking : ""}`}
      aria-label={`${participant.displayName} video`}
      data-screen-sharing={participant.screenSharing || undefined}
      data-speaking={activeSpeaker || undefined}
    >
      <video
        ref={videoRef}
        className={`${styles.video} ${
          participant.isLocal ? styles.localVideo : ""
        } ${hasVisibleVideo ? styles.videoVisible : ""}`}
        autoPlay
        playsInline
        muted={participant.isLocal}
      />

      {!hasVisibleVideo && (
        <div className={styles.avatarFallback} aria-hidden="true">
          <span>{label}</span>
          <IconVideoOff size={17} />
        </div>
      )}

      {participant.screenSharing && (
        <span className={styles.screenBadge}>
          <IconScreenShare size={12} /> Sharing screen
        </span>
      )}

      <footer className={styles.tileFooter}>
        <div className={styles.tileIdentity}>
          <strong>
            {participant.displayName}
            {participant.isLocal ? " (You)" : ""}
          </strong>
          <span>{participant.role}</span>
        </div>
        <div className={styles.tileMedia}>
          <span
            className={`${styles.mediaIndicator} ${
              participant.audioEnabled ? styles.mediaOn : styles.mediaOff
            }`}
            aria-label={
              participant.audioEnabled ? "Microphone on" : "Microphone muted"
            }
            title={
              participant.audioEnabled ? "Microphone on" : "Microphone muted"
            }
          >
            {participant.audioEnabled ? (
              <IconMicrophone size={14} />
            ) : (
              <IconMicrophoneOff size={14} />
            )}
          </span>
          <span
            className={`${styles.mediaIndicator} ${
              participant.videoEnabled ? styles.mediaOn : styles.mediaOff
            }`}
            aria-label={participant.videoEnabled ? "Camera on" : "Camera off"}
            title={participant.videoEnabled ? "Camera on" : "Camera off"}
          >
            {participant.videoEnabled ? (
              <IconVideo size={14} />
            ) : (
              <IconVideoOff size={14} />
            )}
          </span>
        </div>
      </footer>

      {!participant.isLocal && participant.connectionStatus !== "connected" && (
        <span className={styles.peerState}>
          {participant.connectionStatus === "failed"
            ? "Connection failed"
            : "Connecting…"}
        </span>
      )}
    </article>
  );
}