// Simple WebRTC 1:1 and mesh peer wrapper using Supabase Realtime broadcast for signaling.
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Free public TURN (Open Relay Project) — enables calls through symmetric NAT.
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

export type SignalPayload =
  | { type: "offer"; sdp: string; from: string; to: string }
  | { type: "answer"; sdp: string; from: string; to: string }
  | { type: "ice"; candidate: RTCIceCandidateInit; from: string; to: string }
  | { type: "bye"; from: string; to: string };

export interface PeerHandle {
  pc: RTCPeerConnection;
  peerId: string;
  remoteStream: MediaStream;
  close: () => void;
}

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 4 });
}

export async function getUserMedia(video: boolean): Promise<MediaStream> {
  return await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: video ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
  });
}

export function signalingChannel(callId: string) {
  return supabase.channel(`call-${callId}`, { config: { broadcast: { self: false, ack: false } } });
}
