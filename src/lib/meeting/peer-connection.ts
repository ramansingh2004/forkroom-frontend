type PeerConnectionHandlers = {
  localStream: MediaStream | null;
  iceServers: RTCIceServer[];
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
};

export function createMeetingPeerConnection({
  localStream,
  iceServers,
  onIceCandidate,
  onRemoteStream,
  onConnectionStateChange,
}: PeerConnectionHandlers) {
  const peer = new RTCPeerConnection({ iceServers });
  const localKinds = new Set<MediaStreamTrack["kind"]>();

  localStream?.getTracks().forEach((track) => {
    localKinds.add(track.kind);
    peer.addTrack(track, localStream);
  });

  // A viewer, or a participant without device permission, still needs receive
  // transceivers so offers can request remote audio and video.
  if (!localKinds.has("audio")) {
    peer.addTransceiver("audio", { direction: "recvonly" });
  }
  if (!localKinds.has("video")) {
    peer.addTransceiver("video", { direction: "recvonly" });
  }

  peer.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate(event.candidate.toJSON());
  };

  peer.ontrack = (event) => {
    const stream = event.streams[0] ?? new MediaStream([event.track]);
    onRemoteStream(stream);
  };

  peer.onconnectionstatechange = () => {
    onConnectionStateChange(peer.connectionState);
  };

  return peer;
}

export function findSender(
  peer: RTCPeerConnection,
  kind: MediaStreamTrack["kind"],
) {
  return peer.getSenders().find((sender) => sender.track?.kind === kind);
}

export function findTransceiver(
  peer: RTCPeerConnection,
  kind: MediaStreamTrack["kind"],
) {
  return peer
    .getTransceivers()
    .find(
      (transceiver) =>
        transceiver.sender.track?.kind === kind ||
        transceiver.receiver.track.kind === kind,
    );
}