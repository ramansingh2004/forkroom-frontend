"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createMeetingPeerConnection,
  findTransceiver,
} from "@/lib/meeting/peer-connection";
import type {
  MeetingClientEvent,
  MeetingConnectionQuality,
  MeetingConnectionStatus,
  MeetingEventEnvelope,
  MeetingIssue,
  MeetingMediaState,
  MeetingParticipant,
  MeetingReadyPayload,
  PeerConnectionStatus,
} from "@/lib/meeting/types";
import { getApiErrorInfo } from "@/lib/api/errors";
import {
  issueMeetingToken,
  type MeetingIceServer,
  type MeetingPermission,
} from "@/services/meeting .service";

const HEARTBEAT_INTERVAL_MS = 20_000;
const QUALITY_INTERVAL_MS = 5_000;
const MAX_RECONNECT_ATTEMPTS = 3;

type UseMeetingOptions = {
  workspaceId: string;
  decisionId: string;
  currentUser: {
    id: string;
    displayName: string;
    role: string;
  };
};

type ParticipantSeed = Pick<
  MeetingParticipant,
  "userId" | "displayName" | "role"
> &
  Partial<MeetingParticipant>;

function toRtcIceServers(servers: MeetingIceServer[]): RTCIceServer[] {
  return servers.map((server) => ({
    urls: server.urls,
    username: server.username ?? undefined,
    credential: server.credential ?? undefined,
  }));
}

function websocketUrl(baseUrl: string, token: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMeetingEnvelope(value: unknown): value is MeetingEventEnvelope {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (!isRecord(value.sender)) return false;

  return (
    typeof value.sender.user_id === "string" &&
    typeof value.sender.display_name === "string" &&
    typeof value.sender.role === "string" &&
    isRecord(value.payload)
  );
}

function readReadyPayload(payload: Record<string, unknown>) {
  if (!Array.isArray(payload.participants)) return null;
  return payload as unknown as MeetingReadyPayload;
}

function readDescription(payload: Record<string, unknown>) {
  if (
    (payload.type === "offer" || payload.type === "answer") &&
    typeof payload.sdp === "string"
  ) {
    return {
      type: payload.type,
      sdp: payload.sdp,
    } satisfies RTCSessionDescriptionInit;
  }

  if (isRecord(payload.description)) {
    const { type, sdp } = payload.description;
    if ((type === "offer" || type === "answer") && typeof sdp === "string") {
      return { type, sdp } satisfies RTCSessionDescriptionInit;
    }
  }

  return null;
}

function readCandidate(payload: Record<string, unknown>) {
  if (isRecord(payload.candidate)) {
    return payload.candidate as RTCIceCandidateInit;
  }

  if (typeof payload.candidate === "string") {
    return {
      candidate: payload.candidate,
      sdpMid: typeof payload.sdpMid === "string" ? payload.sdpMid : undefined,
      sdpMLineIndex:
        typeof payload.sdpMLineIndex === "number"
          ? payload.sdpMLineIndex
          : undefined,
    } satisfies RTCIceCandidateInit;
  }

  return null;
}

function peerStatus(state: RTCPeerConnectionState): PeerConnectionStatus {
  if (state === "connected") return "connected";
  if (state === "connecting") return "connecting";
  if (state === "disconnected" || state === "closed") return "disconnected";
  if (state === "failed") return "failed";
  return "new";
}

function issue(
  kind: MeetingIssue["kind"],
  title: string,
  message: string,
  retryable = false,
): MeetingIssue {
  return { kind, title, message, retryable };
}

function socketCloseIssue(code: number, reason: string) {
  if (code === 4409) {
    return issue(
      "signaling",
      "Meeting is full",
      "This meeting has reached its participant limit.",
      true,
    );
  }
  if (code === 4403) {
    return issue(
      "permission",
      "Meeting access blocked",
      "This browser origin is not allowed to join the meeting. Ask a workspace administrator to verify the allowed meeting origins.",
    );
  }
  if (code === 4401) {
    return issue(
      "permission",
      "Meeting session expired",
      "Your meeting session expired. Join again to request fresh access.",
      true,
    );
  }
  if (code === 4429) {
    return issue(
      "signaling",
      "Meeting connection paused",
      "The meeting connection sent too many live updates. Wait a moment, then join again.",
      true,
    );
  }
  return issue(
    "signaling",
    "Live connection interrupted",
    reason ||
      "ForkRoom could not maintain the live meeting connection. Check your network and try again.",
    true,
  );
}

function deviceIssue(error: unknown, device: "camera" | "microphone") {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return issue(
      "permission",
      `${device === "camera" ? "Camera" : "Microphone"} permission denied`,
      `Allow ${device} access in your browser's site settings, then try again.`,
      true,
    );
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return issue(
      "media",
      `${device === "camera" ? "Camera" : "Microphone"} not found`,
      `ForkRoom could not find an available ${device} on this device.`,
    );
  }
  if (error instanceof DOMException && error.name === "NotReadableError") {
    return issue(
      "media",
      `${device === "camera" ? "Camera" : "Microphone"} is unavailable`,
      `Another application may be using your ${device}. Close it there, then try again.`,
      true,
    );
  }
  return issue(
    "media",
    `${device === "camera" ? "Camera" : "Microphone"} unavailable`,
    `ForkRoom could not start your ${device}. Check the selected device and try again.`,
    true,
  );
}

function initialMediaIssue(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return issue(
      "permission",
      "Camera and microphone blocked",
      "You joined without camera or microphone access. Allow access in your browser settings, then enable either device from the meeting controls.",
      true,
    );
  }
  return issue(
    "media",
    "Camera or microphone unavailable",
    "You joined without camera or microphone. Check that your devices are connected and not in use by another application.",
    true,
  );
}

export function useMeeting({
  workspaceId,
  decisionId,
  currentUser,
}: UseMeetingOptions) {
  const [status, setStatus] = useState<MeetingConnectionStatus>("idle");
  const [permission, setPermission] = useState<MeetingPermission | null>(null);
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [localDisplayStream, setLocalDisplayStream] =
    useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [quality, setQuality] = useState<MeetingConnectionQuality>("waiting");
  const [error, setError] = useState<MeetingIssue | null>(null);
  const [warning, setWarning] = useState<MeetingIssue | null>(null);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const pendingCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const participantStoreRef = useRef(new Map<string, MeetingParticipant>());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const selfUserIdRef = useRef(currentUser.id);
  const permissionRef = useRef<MeetingPermission | null>(null);
  const activeSessionRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const generationRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qualityRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef(
    async (_reconnecting: boolean, _generation: number) => {
      void _reconnecting;
      void _generation;
    },
  );
  const handleEventRef = useRef(async (_event: MeetingEventEnvelope) => {
    void _event;
  });

  const publishParticipants = useCallback(() => {
    const ordered = [...participantStoreRef.current.values()].sort(
      (left, right) => {
        if (left.isLocal !== right.isLocal) return left.isLocal ? -1 : 1;
        return (left.joinedAt ?? "").localeCompare(right.joinedAt ?? "");
      },
    );
    setParticipants(ordered);
  }, []);

  const upsertParticipant = useCallback(
    (seed: ParticipantSeed) => {
      const previous = participantStoreRef.current.get(seed.userId);
      const isLocal = seed.userId === selfUserIdRef.current;
      participantStoreRef.current.set(seed.userId, {
        userId: seed.userId,
        displayName: seed.displayName,
        role: seed.role,
        canFacilitate:
          seed.canFacilitate ??
          previous?.canFacilitate ??
          ["owner", "admin"].includes(seed.role),
        isLocal,
        joinedAt: seed.joinedAt ?? previous?.joinedAt,
        stream:
          seed.stream !== undefined
            ? seed.stream
            : isLocal
              ? localDisplayStream
              : (previous?.stream ?? null),
        audioEnabled:
          seed.audioEnabled ??
          previous?.audioEnabled ??
          (isLocal && audioEnabled),
        videoEnabled:
          seed.videoEnabled ??
          previous?.videoEnabled ??
          (isLocal && videoEnabled),
        screenSharing:
          seed.screenSharing ??
          previous?.screenSharing ??
          (isLocal && screenSharing),
        connectionStatus:
          seed.connectionStatus ??
          previous?.connectionStatus ??
          (isLocal ? "connected" : "new"),
      });
      publishParticipants();
    },
    [
      audioEnabled,
      localDisplayStream,
      publishParticipants,
      screenSharing,
      videoEnabled,
    ],
  );

  const removeParticipant = useCallback(
    (userId: string) => {
      participantStoreRef.current.delete(userId);
      publishParticipants();
    },
    [publishParticipants],
  );

  const sendEvent = useCallback((event: MeetingClientEvent) => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ payload: {}, ...event }));
    return true;
  }, []);

  const localMediaState = useCallback(
    (): MeetingMediaState => ({
      audioEnabled,
      videoEnabled: screenSharing || videoEnabled,
      screenSharing,
    }),
    [audioEnabled, screenSharing, videoEnabled],
  );

  const publishMediaState = useCallback(
    (targetUserId?: string) => {
      const media = localMediaState();
      sendEvent({
        type: "media.state",
        target_user_id: targetUserId,
        payload: {
          audio_enabled: media.audioEnabled,
          video_enabled: media.videoEnabled,
          screen_sharing: media.screenSharing,
        },
      });
    },
    [localMediaState, sendEvent],
  );

  const closePeer = useCallback((userId: string) => {
    const peer = peersRef.current.get(userId);
    if (!peer) return;
    peer.onicecandidate = null;
    peer.ontrack = null;
    peer.onconnectionstatechange = null;
    peer.close();
    peersRef.current.delete(userId);
    pendingCandidatesRef.current.delete(userId);
  }, []);

  const closeAllPeers = useCallback(() => {
    [...peersRef.current.keys()].forEach(closePeer);
    setQuality("waiting");
  }, [closePeer]);

  const ensurePeer = useCallback(
    (remoteUserId: string, sender?: MeetingEventEnvelope["sender"]) => {
      const existing = peersRef.current.get(remoteUserId);
      if (existing && existing.connectionState !== "closed") return existing;

      if (sender) {
        upsertParticipant({
          userId: sender.user_id,
          displayName: sender.display_name,
          role: sender.role,
        });
      }

      const peer = createMeetingPeerConnection({
        localStream: localStreamRef.current,
        iceServers: iceServersRef.current,
        onIceCandidate: (candidate) => {
          sendEvent({
            type: "signal.ice",
            target_user_id: remoteUserId,
            payload: { candidate },
          });
        },
        onRemoteStream: (stream) => {
          const participant = participantStoreRef.current.get(remoteUserId);
          upsertParticipant({
            userId: remoteUserId,
            displayName: participant?.displayName ?? "Participant",
            role: participant?.role ?? "member",
            stream,
          });
        },
        onConnectionStateChange: (connectionState) => {
          const participant = participantStoreRef.current.get(remoteUserId);
          if (participant) {
            upsertParticipant({
              ...participant,
              connectionStatus: peerStatus(connectionState),
            });
          }
          if (connectionState === "failed") {
            setWarning(
              issue(
                "relay",
                "Media connection failed",
                "ForkRoom reached the meeting, but audio and video could not establish a direct or relayed path. Check the TURN service or network firewall, then retry media.",
                true,
              ),
            );
          }
        },
      });

      peersRef.current.set(remoteUserId, peer);
      return peer;
    },
    [sendEvent, upsertParticipant],
  );

  const flushCandidates = useCallback(async (remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    const queued = pendingCandidatesRef.current.get(remoteUserId) ?? [];
    if (!peer?.remoteDescription || queued.length === 0) return;

    pendingCandidatesRef.current.delete(remoteUserId);
    for (const candidate of queued) {
      await peer.addIceCandidate(candidate);
    }
  }, []);

  const startOffer = useCallback(
    async (remoteUserId: string) => {
      const peer = ensurePeer(remoteUserId);
      if (peer.signalingState !== "stable") return;

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendEvent({
        type: "signal.offer",
        target_user_id: remoteUserId,
        payload: { type: offer.type, sdp: offer.sdp ?? "" },
      });
    },
    [ensurePeer, sendEvent],
  );

  const renegotiatePeers = useCallback(async () => {
    await Promise.allSettled(
      [...peersRef.current.keys()].map((userId) => startOffer(userId)),
    );
  }, [startOffer]);

  const handleOffer = useCallback(
    async (event: MeetingEventEnvelope) => {
      const description = readDescription(event.payload);
      if (!description) return;
      const peer = ensurePeer(event.sender.user_id, event.sender);

      if (peer.signalingState !== "stable") {
        await peer.setLocalDescription({ type: "rollback" });
      }
      await peer.setRemoteDescription(description);
      await flushCandidates(event.sender.user_id);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      sendEvent({
        type: "signal.answer",
        target_user_id: event.sender.user_id,
        payload: { type: answer.type, sdp: answer.sdp ?? "" },
      });
    },
    [ensurePeer, flushCandidates, sendEvent],
  );

  const handleAnswer = useCallback(
    async (event: MeetingEventEnvelope) => {
      const description = readDescription(event.payload);
      const peer = peersRef.current.get(event.sender.user_id);
      if (!description || !peer) return;
      await peer.setRemoteDescription(description);
      await flushCandidates(event.sender.user_id);
    },
    [flushCandidates],
  );

  const handleIce = useCallback(async (event: MeetingEventEnvelope) => {
    const candidate = readCandidate(event.payload);
    if (!candidate) return;
    const peer = peersRef.current.get(event.sender.user_id);

    if (!peer?.remoteDescription) {
      const queued =
        pendingCandidatesRef.current.get(event.sender.user_id) ?? [];
      queued.push(candidate);
      pendingCandidatesRef.current.set(event.sender.user_id, queued);
      return;
    }

    await peer.addIceCandidate(candidate);
  }, []);

  const measureQuality = useCallback(async () => {
    const peers = [...peersRef.current.values()];
    if (peers.length === 0) {
      setQuality("waiting");
      return;
    }
    if (
      peers.some((peer) =>
        ["failed", "disconnected"].includes(peer.connectionState),
      )
    ) {
      setQuality("poor");
      return;
    }
    if (peers.some((peer) => peer.connectionState !== "connected")) {
      setQuality("fair");
      return;
    }

    let worst: MeetingConnectionQuality = "good";
    for (const peer of peers) {
      const report = await peer.getStats();
      report.forEach((stat) => {
        if (stat.type === "candidate-pair" && stat.state === "succeeded") {
          const roundTripTime = Number(stat.currentRoundTripTime ?? 0);
          if (roundTripTime > 0.5) worst = "poor";
          else if (roundTripTime > 0.25 && worst === "good") worst = "fair";
        }
        if (stat.type === "inbound-rtp") {
          const lost = Number(stat.packetsLost ?? 0);
          const received = Number(stat.packetsReceived ?? 0);
          const lossRatio = lost / Math.max(1, lost + received);
          if (lossRatio > 0.1) worst = "poor";
          else if (lossRatio > 0.03 && worst === "good") worst = "fair";
        }
      });
    }
    setQuality(worst);
  }, []);

  const clearTimers = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (qualityRef.current) clearInterval(qualityRef.current);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    heartbeatRef.current = null;
    qualityRef.current = null;
    reconnectRef.current = null;
  }, []);

  const setLocalParticipantStream = useCallback(
    (stream: MediaStream | null) => {
      setLocalDisplayStream(stream);
      const localParticipant = participantStoreRef.current.get(
        selfUserIdRef.current,
      );
      if (localParticipant) {
        participantStoreRef.current.set(selfUserIdRef.current, {
          ...localParticipant,
          stream,
        });
        publishParticipants();
      }
    },
    [publishParticipants],
  );

  const stopLocalMedia = useCallback(() => {
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    cameraTrackRef.current = null;
    setLocalParticipantStream(null);
    setAudioEnabled(false);
    setVideoEnabled(false);
    setScreenSharing(false);
  }, [setLocalParticipantStream]);

  const resetParticipants = useCallback(() => {
    participantStoreRef.current.clear();
    pendingCandidatesRef.current.clear();
    setParticipants([]);
  }, []);

  // Mutable dispatchers intentionally keep WebSocket callbacks connected to
  // the latest render without recreating the socket for every state change.
  // eslint-disable-next-line react-hooks/refs
  handleEventRef.current = async (event) => {
    try {
      if (event.type === "meeting.ready") {
        const payload = readReadyPayload(event.payload);
        if (!payload) throw new Error("The meeting returned an invalid state.");
        selfUserIdRef.current = event.sender.user_id;
        resetParticipants();

        payload.participants.forEach((participant) => {
          upsertParticipant({
            userId: participant.user_id,
            displayName: participant.display_name,
            role: participant.role,
            canFacilitate: participant.can_facilitate,
            joinedAt: participant.joined_at,
            stream:
              participant.user_id === event.sender.user_id
                ? localDisplayStream
                : null,
          });
        });

        reconnectAttemptRef.current = 0;
        setStatus("connected");
        setError(null);
        heartbeatRef.current = setInterval(
          () => sendEvent({ type: "heartbeat" }),
          HEARTBEAT_INTERVAL_MS,
        );
        qualityRef.current = setInterval(
          () => void measureQuality(),
          QUALITY_INTERVAL_MS,
        );

        const existingUsers = payload.participants.filter(
          (participant) => participant.user_id !== event.sender.user_id,
        );
        for (const participant of existingUsers) {
          await startOffer(participant.user_id);
        }
        publishMediaState();
        return;
      }

      if (event.type === "presence.joined") {
        if (event.sender.user_id === selfUserIdRef.current) return;
        upsertParticipant({
          userId: event.sender.user_id,
          displayName: event.sender.display_name,
          role: event.sender.role,
        });
        publishMediaState(event.sender.user_id);
        return;
      }

      if (event.type === "presence.left") {
        closePeer(event.sender.user_id);
        removeParticipant(event.sender.user_id);
        return;
      }

      if (event.type === "signal.offer") {
        await handleOffer(event);
        return;
      }
      if (event.type === "signal.answer") {
        await handleAnswer(event);
        return;
      }
      if (event.type === "signal.ice") {
        await handleIce(event);
        return;
      }

      if (event.type === "media.state") {
        const participant = participantStoreRef.current.get(
          event.sender.user_id,
        );
        upsertParticipant({
          userId: event.sender.user_id,
          displayName: participant?.displayName ?? event.sender.display_name,
          role: participant?.role ?? event.sender.role,
          audioEnabled: event.payload.audio_enabled === true,
          videoEnabled: event.payload.video_enabled === true,
          screenSharing: event.payload.screen_sharing === true,
        });
        return;
      }

      if (event.type === "meeting.error") {
        const code = event.payload.code;
        setWarning(
          code === "facilitator_required"
            ? issue(
                "permission",
                "Facilitator permission required",
                "Only a workspace owner or administrator can use that meeting control.",
              )
            : issue(
                "signaling",
                "Meeting update failed",
                "The meeting could not apply that live update. Refresh the participant state or retry the action.",
                true,
              ),
        );
      }
    } catch (eventError) {
      setWarning(
        issue(
          "signaling",
          "Meeting update failed",
          eventError instanceof Error
            ? eventError.message
            : "A live meeting update could not be processed.",
          true,
        ),
      );
    }
  };

  // See handleEventRef above; reconnect timers must call the latest closure.
  // eslint-disable-next-line react-hooks/refs
  connectRef.current = async (reconnecting, generation) => {
    try {
      const token = await issueMeetingToken(workspaceId, decisionId);
      if (!activeSessionRef.current || generation !== generationRef.current) {
        return;
      }

      permissionRef.current = token.permission;
      setPermission(token.permission);
      setMaxParticipants(token.max_participants);
      iceServersRef.current = toRtcIceServers(token.ice_servers);

      if (!reconnecting && token.permission !== "observe") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          if (
            !activeSessionRef.current ||
            generation !== generationRef.current
          ) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          localStreamRef.current = stream;
          cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
          setAudioEnabled(Boolean(stream.getAudioTracks()[0]));
          setVideoEnabled(Boolean(stream.getVideoTracks()[0]));
          setLocalParticipantStream(stream);
        } catch (mediaError) {
          setWarning(initialMediaIssue(mediaError));
        }
      }

      const socket = new WebSocket(
        websocketUrl(token.websocket_url, token.token),
      );
      socketRef.current = socket;

      socket.onmessage = (message) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(String(message.data));
        } catch {
          setWarning(
            issue(
              "signaling",
              "Unreadable meeting update",
              "ForkRoom received a live update it could not read. The meeting will continue while the connection recovers.",
              true,
            ),
          );
          return;
        }
        if (isMeetingEnvelope(parsed)) void handleEventRef.current(parsed);
      };

      socket.onclose = (closeEvent) => {
        if (socketRef.current !== socket) return;
        socketRef.current = null;
        clearTimers();
        closeAllPeers();
        if (intentionalCloseRef.current || !activeSessionRef.current) return;

        const terminalClose = [4401, 4403, 4409, 4429].includes(
          closeEvent.code,
        );
        if (terminalClose) {
          activeSessionRef.current = false;
          stopLocalMedia();
          resetParticipants();
          setStatus("error");
          setError(socketCloseIssue(closeEvent.code, closeEvent.reason));
          return;
        }

        if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptRef.current += 1;
          setStatus("reconnecting");
          reconnectRef.current = setTimeout(
            () => void connectRef.current(true, generation),
            reconnectAttemptRef.current * 1_500,
          );
          return;
        }

        activeSessionRef.current = false;
        stopLocalMedia();
        resetParticipants();
        setStatus("error");
        setError(socketCloseIssue(closeEvent.code, closeEvent.reason));
      };

      socket.onerror = () => {
        // The close event carries the actionable code and owns reconnection.
      };
    } catch (connectionError) {
      if (!activeSessionRef.current || generation !== generationRef.current) {
        return;
      }
      if (
        reconnecting &&
        reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS
      ) {
        reconnectAttemptRef.current += 1;
        setStatus("reconnecting");
        reconnectRef.current = setTimeout(
          () => void connectRef.current(true, generation),
          reconnectAttemptRef.current * 1_500,
        );
        return;
      }

      activeSessionRef.current = false;
      stopLocalMedia();
      resetParticipants();
      setStatus("error");
      const apiError = getApiErrorInfo(
        connectionError,
        "ForkRoom could not open the live meeting.",
      );
      setError(
        issue(
          apiError.kind === "forbidden" ? "permission" : "signaling",
          apiError.kind === "forbidden"
            ? "Meeting access denied"
            : "Could not start meeting",
          apiError.message,
          apiError.retryable,
        ),
      );
    }
  };

  const join = useCallback(async () => {
    if (activeSessionRef.current) return;
    if (!window.isSecureContext) {
      setStatus("error");
      setError(
        issue(
          "permission",
          "Secure connection required",
          "Camera and microphone access require HTTPS or localhost.",
        ),
      );
      return;
    }
    if (!("RTCPeerConnection" in window) || !("WebSocket" in window)) {
      setStatus("error");
      setError(
        issue(
          "media",
          "Browser not supported",
          "This browser does not support live audio and video meetings. Use a current version of Chrome, Edge, Firefox, or Safari.",
        ),
      );
      return;
    }

    intentionalCloseRef.current = false;
    activeSessionRef.current = true;
    reconnectAttemptRef.current = 0;
    generationRef.current += 1;
    setStatus("joining");
    setError(null);
    setWarning(null);
    await connectRef.current(false, generationRef.current);
  }, []);

  const leave = useCallback(() => {
    intentionalCloseRef.current = true;
    activeSessionRef.current = false;
    generationRef.current += 1;
    clearTimers();
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000);
    closeAllPeers();
    stopLocalMedia();
    resetParticipants();
    permissionRef.current = null;
    setPermission(null);
    setStatus("idle");
    setError(null);
    setWarning(null);
  }, [clearTimers, closeAllPeers, resetParticipants, stopLocalMedia]);

  const addTrackToPeers = useCallback(
    async (track: MediaStreamTrack) => {
      let needsNegotiation = false;
      for (const peer of peersRef.current.values()) {
        const transceiver = findTransceiver(peer, track.kind);
        if (transceiver) {
          await transceiver.sender.replaceTrack(track);
          if (
            transceiver.direction === "recvonly" ||
            transceiver.direction === "inactive"
          ) {
            transceiver.direction = "sendrecv";
            needsNegotiation = true;
          }
        } else if (localStreamRef.current) {
          peer.addTrack(track, localStreamRef.current);
          needsNegotiation = true;
        }
      }
      if (needsNegotiation) await renegotiatePeers();
    },
    [renegotiatePeers],
  );

  const acquireTrack = useCallback(
    async (kind: "audio" | "video") => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: kind === "audio",
        video: kind === "video",
      });
      const track =
        kind === "audio"
          ? stream.getAudioTracks()[0]
          : stream.getVideoTracks()[0];
      if (!track) throw new Error(`No ${kind} device is available.`);

      if (!localStreamRef.current) localStreamRef.current = new MediaStream();
      localStreamRef.current.addTrack(track);
      if (kind === "video") cameraTrackRef.current = track;
      await addTrackToPeers(track);
      setLocalParticipantStream(localStreamRef.current);
      return track;
    },
    [addTrackToPeers, setLocalParticipantStream],
  );

  const toggleAudio = useCallback(async () => {
    if (permissionRef.current === "observe") return;
    try {
      let track = localStreamRef.current?.getAudioTracks()[0];
      if (!track || track.readyState === "ended")
        track = await acquireTrack("audio");
      else track.enabled = !track.enabled;
      setAudioEnabled(track.enabled);
      setWarning(null);
    } catch (mediaError) {
      setWarning(deviceIssue(mediaError, "microphone"));
    }
  }, [acquireTrack]);

  const toggleVideo = useCallback(async () => {
    if (permissionRef.current === "observe" || screenTrackRef.current) return;
    try {
      let track = cameraTrackRef.current;
      if (!track || track.readyState === "ended")
        track = await acquireTrack("video");
      else track.enabled = !track.enabled;
      setVideoEnabled(track.enabled);
      setWarning(null);
    } catch (mediaError) {
      setWarning(deviceIssue(mediaError, "camera"));
    }
  }, [acquireTrack]);

  const stopScreenShare = useCallback(async () => {
    const screenTrack = screenTrackRef.current;
    if (!screenTrack) return;
    screenTrack.onended = null;
    screenTrack.stop();
    screenTrackRef.current = null;
    const cameraTrack = cameraTrackRef.current;
    await Promise.all(
      [...peersRef.current.values()].map(async (peer) => {
        const transceiver = findTransceiver(peer, "video");
        await transceiver?.sender.replaceTrack(cameraTrack);
      }),
    );
    setScreenSharing(false);
    setLocalParticipantStream(localStreamRef.current);
  }, [setLocalParticipantStream]);

  const toggleScreenShare = useCallback(async () => {
    if (permissionRef.current === "observe") return;
    if (screenTrackRef.current) {
      await stopScreenShare();
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const track = display.getVideoTracks()[0];
      if (!track) return;
      screenTrackRef.current = track;
      track.onended = () => void stopScreenShare();

      let needsNegotiation = false;
      for (const peer of peersRef.current.values()) {
        const transceiver = findTransceiver(peer, "video");
        if (transceiver) {
          await transceiver.sender.replaceTrack(track);
          if (
            transceiver.direction === "recvonly" ||
            transceiver.direction === "inactive"
          ) {
            transceiver.direction = "sendrecv";
            needsNegotiation = true;
          }
        } else {
          const stream = localStreamRef.current ?? new MediaStream();
          peer.addTrack(track, stream);
          needsNegotiation = true;
        }
      }
      if (needsNegotiation) await renegotiatePeers();

      const preview = new MediaStream([
        track,
        ...(localStreamRef.current?.getAudioTracks() ?? []),
      ]);
      setScreenSharing(true);
      setLocalParticipantStream(preview);
      setWarning(null);
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name === "NotAllowedError"
      ) {
        return;
      }
      setWarning(
        issue(
          "media",
          "Screen sharing unavailable",
          "ForkRoom could not start screen sharing in this browser. Check browser and system screen-recording permissions, then try again.",
          true,
        ),
      );
    }
  }, [renegotiatePeers, setLocalParticipantStream, stopScreenShare]);

  useEffect(() => {
    if (status !== "connected") return;
    const local = participantStoreRef.current.get(selfUserIdRef.current);
    if (local) {
      participantStoreRef.current.set(selfUserIdRef.current, {
        ...local,
        stream: localDisplayStream,
        audioEnabled,
        videoEnabled: screenSharing || videoEnabled,
        screenSharing,
      });
      publishParticipants();
    }
    publishMediaState();
  }, [
    audioEnabled,
    localDisplayStream,
    publishMediaState,
    publishParticipants,
    screenSharing,
    status,
    videoEnabled,
  ]);

  useEffect(() => {
    if (status !== "connected") {
      const frame = window.requestAnimationFrame(() =>
        setActiveSpeakerId(null),
      );
      return () => window.cancelAnimationFrame(frame);
    }

    const audibleParticipants = participants.filter(
      (participant) =>
        participant.audioEnabled &&
        Boolean(participant.stream?.getAudioTracks().length),
    );
    if (audibleParticipants.length === 0 || !("AudioContext" in window)) {
      const frame = window.requestAnimationFrame(() =>
        setActiveSpeakerId(null),
      );
      return () => window.cancelAnimationFrame(frame);
    }

    const audioContext = new AudioContext();
    const meters = audibleParticipants.flatMap((participant) => {
      const track = participant.stream?.getAudioTracks()[0];
      if (!track) return [];
      const source = audioContext.createMediaStreamSource(
        new MediaStream([track]),
      );
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);
      return [{ userId: participant.userId, analyser, source }];
    });
    let lastVoiceAt = 0;

    void audioContext.resume().catch(() => undefined);
    const meter = window.setInterval(() => {
      let loudestUserId: string | null = null;
      let loudestLevel = 0.035;

      meters.forEach(({ userId, analyser }) => {
        const samples = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(samples);
        const meanSquare =
          samples.reduce((total, sample) => {
            const normalized = (sample - 128) / 128;
            return total + normalized * normalized;
          }, 0) / samples.length;
        const level = Math.sqrt(meanSquare);
        if (level > loudestLevel) {
          loudestLevel = level;
          loudestUserId = userId;
        }
      });

      if (loudestUserId) {
        lastVoiceAt = Date.now();
        setActiveSpeakerId(loudestUserId);
      } else if (Date.now() - lastVoiceAt > 900) {
        setActiveSpeakerId(null);
      }
    }, 180);

    return () => {
      window.clearInterval(meter);
      meters.forEach(({ source }) => source.disconnect());
      void audioContext.close();
    };
  }, [participants, status]);

  const retryMediaConnection = useCallback(async () => {
    const remoteParticipants = [...participantStoreRef.current.values()].filter(
      (participant) => !participant.isLocal,
    );
    setWarning(null);
    await Promise.allSettled(
      remoteParticipants.map(async (participant) => {
        closePeer(participant.userId);
        await startOffer(participant.userId);
      }),
    );
    await measureQuality();
  }, [closePeer, measureQuality, startOffer]);

  const leaveRef = useRef(leave);
  useEffect(() => {
    leaveRef.current = leave;
  }, [leave]);
  useEffect(() => () => leaveRef.current(), []);

  return {
    status,
    permission,
    maxParticipants,
    participants,
    audioEnabled,
    videoEnabled,
    screenSharing,
    activeSpeakerId,
    quality,
    error,
    warning,
    join,
    leave,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    retryMediaConnection,
  };
}
