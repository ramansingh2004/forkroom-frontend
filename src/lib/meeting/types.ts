import type { MeetingPermission } from "@/services/meeting .service";

export type MeetingConnectionStatus =
  "idle" | "joining" | "connected" | "reconnecting" | "error";

export type MeetingConnectionQuality = "waiting" | "good" | "fair" | "poor";

export type PeerConnectionStatus =
  "new" | "connecting" | "connected" | "disconnected" | "failed";

export type MeetingMediaState = {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
};

export type MeetingParticipant = MeetingMediaState & {
  userId: string;
  displayName: string;
  role: string;
  canFacilitate: boolean;
  isLocal: boolean;
  joinedAt?: string;
  stream: MediaStream | null;
  connectionStatus: PeerConnectionStatus;
};

export type MeetingSender = {
  user_id: string;
  display_name: string;
  role: string;
};

export type MeetingEventEnvelope = {
  type: string;
  sender: MeetingSender;
  target_user_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
};

export type MeetingReadyParticipant = {
  user_id: string;
  display_name: string;
  role: string;
  can_facilitate: boolean;
  joined_at: string;
};

export type MeetingReadyPayload = {
  participants: MeetingReadyParticipant[];
  speaking_queue: string[];
  timer: unknown | null;
};

export type MeetingClientEvent = {
  type: string;
  target_user_id?: string;
  payload?: Record<string, unknown>;
};

export type MeetingStateSnapshot = {
  status: MeetingConnectionStatus;
  permission: MeetingPermission | null;
  participantCount: number;
};