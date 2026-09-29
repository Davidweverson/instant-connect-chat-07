import { useCallback, useEffect, useRef, useState } from "react";
import { createPeerConnection, getUserMedia } from "@/lib/webrtc";
import { supabase } from "@/integrations/supabase/client";
import { playCallJoinSound, playCallLeaveSound } from "@/lib/notification-sounds";
import { toast } from "sonner";

export type GroupCallState = "idle" | "joining" | "in-call";

export interface GroupParticipant {
  userId: string;
  name: string;
  avatar: string | null;
  stream: MediaStream | null;
  /** silenciado só para mim */
  locallyMuted: boolean;
  /** silenciado por um admin (para todos) */
  forceMuted: boolean;
}

interface Signal {
  type: "offer" | "answer" | "ice" | "force-mute";
  from: string;
  to: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  value?: boolean;
}

interface PeerBox {
  pc: RTCPeerConnection;
  stream: MediaStream;
  pendingIce: RTCIceCandidateInit[];
  remoteSet: boolean;
}

/**
 * Chamada em grupo (mesh WebRTC) por canal, com sinalização e presença
 * via Supabase Realtime no canal `gcall-{channelId}`.
 */
export function useGroupCall(
  groupId: string | null,
  channelId: string | null,
  userId: string | undefined,
  userName: string,
  userAvatar: string | null,
  isAdmin: boolean
) {
  const [state, setState] = useState<GroupCallState>("idle");
  const [kind, setKind] = useState<"voice" | "video">("voice");
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [forceMuted, setForceMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peersRef = useRef<Map<string, PeerBox>>(new Map());
  const localRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const stateRef = useRef<GroupCallState>("idle");
  const kindRef = useRef<"voice" | "video">("voice");
  const forceMutedRef = useRef(false);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { kindRef.current = kind; }, [kind]);
  useEffect(() => { forceMutedRef.current = forceMuted; }, [forceMuted]);

  useEffect(() => {
    if (state !== "in-call") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [state]);

  const send = useCallback((payload: Signal) => {
    chanRef.current?.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const upsertParticipant = useCallback((p: Partial<GroupParticipant> & { userId: string }) => {
    setParticipants((prev) => {
      const i = prev.findIndex((x) => x.userId === p.userId);
      if (i === -1) {
        return [...prev, { name: "?", avatar: null, stream: null, locallyMuted: false, forceMuted: false, ...p }];
      }
      const next = [...prev];
      next[i] = { ...next[i], ...p };
      return next;
    });
  }, []);

  const createPeer = useCallback((peerId: string, initiator: boolean) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;
    const pc = createPeerConnection();
    const stream = new MediaStream();
    const box: PeerBox = { pc, stream, pendingIce: [], remoteSet: false };
    peersRef.current.set(peerId, box);

    localRef.current?.getTracks().forEach((t) => pc.addTrack(t, localRef.current!));

    pc.ontrack = (ev) => {
      ev.streams[0].getTracks().forEach((t) => { if (!stream.getTracks().includes(t)) stream.addTrack(t); });
      upsertParticipant({ userId: peerId, stream: new MediaStream(stream.getTracks()) });
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate && userId) send({ type: "ice", from: userId, to: peerId, candidate: ev.candidate.toJSON() });
    };

    if (initiator) {
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (userId) send({ type: "offer", from: userId, to: peerId, sdp: offer.sdp! });
      })();
    }
    return box;
  }, [send, upsertParticipant, userId]);

  const removePeer = useCallback((peerId: string) => {
    const box = peersRef.current.get(peerId);
    if (box) { try { box.pc.close(); } catch { /* noop */ } peersRef.current.delete(peerId); }
    setParticipants((prev) => prev.filter((p) => p.userId !== peerId));
  }, []);

  const leave = useCallback((silent = false) => {
    peersRef.current.forEach((b) => { try { b.pc.close(); } catch { /* noop */ } });
    peersRef.current.clear();
    if (chanRef.current) { supabase.removeChannel(chanRef.current); chanRef.current = null; }
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    setLocalStream(null);
    setParticipants([]);
    setMuted(false);
    setCamOff(false);
    setForceMuted(false);
    setElapsed(0);
    setState("idle");
    if (!silent) playCallLeaveSound();
  }, []);

  const join = useCallback(async (callKind: "voice" | "video") => {
    if (!userId || !channelId || stateRef.current !== "idle") return;
    setKind(callKind);
    setState("joining");
    let local: MediaStream;
    try {
      local = await getUserMedia(callKind === "video");
    } catch {
      toast.error("Erro ao acessar microfone/câmera.");
      setState("idle");
      return;
    }
    localRef.current = local;
    setLocalStream(local);

    const ch = supabase.channel(`gcall-${channelId}`, {
      config: { broadcast: { self: false }, presence: { key: userId } },
    });
    chanRef.current = ch;

    ch.on("broadcast", { event: "signal" }, async ({ payload }) => {
      const msg = payload as Signal;
      if (msg.to !== userId) return;

      if (msg.type === "force-mute") {
        setForceMuted(!!msg.value);
        localRef.current?.getAudioTracks().forEach((t) => (t.enabled = !msg.value));
        setMuted(!!msg.value);
        toast.info(msg.value ? "Um administrador silenciou seu microfone." : "Um administrador liberou seu microfone.");
        return;
      }

      const box = peersRef.current.get(msg.from) || createPeer(msg.from, false);
      const pc = box.pc;
      if (msg.type === "offer") {
        await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp! });
        box.remoteSet = true;
        for (const c of box.pendingIce) await pc.addIceCandidate(c);
        box.pendingIce = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: "answer", from: userId, to: msg.from, sdp: answer.sdp! });
      } else if (msg.type === "answer") {
        await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp! });
        box.remoteSet = true;
        for (const c of box.pendingIce) await pc.addIceCandidate(c);
        box.pendingIce = [];
      } else if (msg.type === "ice" && msg.candidate) {
        if (box.remoteSet) await pc.addIceCandidate(msg.candidate);
        else box.pendingIce.push(msg.candidate);
      }
    });

    ch.on("presence", { event: "sync" }, () => {
      const st = ch.presenceState() as Record<string, Array<{ userId: string; name: string; avatar: string | null }>>;
      const present = Object.values(st).flat().filter((m) => m && m.userId && m.userId !== userId);
      present.forEach((m) => {
        const isNew = !peersRef.current.has(m.userId);
        upsertParticipant({ userId: m.userId, name: m.name, avatar: m.avatar });
        if (isNew) {
          playCallJoinSound();
          // Quem tem o id "maior" inicia a oferta (evita glare)
          createPeer(m.userId, userId > m.userId);
        }
      });
      const ids = new Set(present.map((m) => m.userId));
      peersRef.current.forEach((_b, id) => { if (!ids.has(id)) { playCallLeaveSound(); removePeer(id); } });
    });

    await new Promise<void>((res) => ch.subscribe((s) => { if (s === "SUBSCRIBED") res(); }));
    await ch.track({ userId, name: userName, avatar: userAvatar, kind: callKind });

    if (groupId) {
      await supabase.from("group_calls").insert({ group_id: groupId, started_by: userId, kind: callKind, participants: [userId] });
    }

    startedAtRef.current = Date.now();
    setState("in-call");
    playCallJoinSound();
  }, [userId, channelId, groupId, userName, userAvatar, createPeer, removePeer, send, upsertParticipant]);

  useEffect(() => () => { if (chanRef.current) supabase.removeChannel(chanRef.current); }, []);

  const toggleMute = useCallback(() => {
    if (forceMutedRef.current) { toast.error("Você foi silenciado por um administrador."); return; }
    const next = !muted;
    localRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  const toggleCam = useCallback(() => {
    const next = !camOff;
    localRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCamOff(next);
  }, [camOff]);

  /** Silencia o participante só para mim. */
  const toggleLocalMute = useCallback((peerId: string) => {
    setParticipants((prev) => prev.map((p) => (p.userId === peerId ? { ...p, locallyMuted: !p.locallyMuted } : p)));
  }, []);

  /** Admin: silencia o participante para todos. */
  const toggleForceMute = useCallback((peerId: string) => {
    if (!isAdmin || !userId) return;
    const target = participants.find((p) => p.userId === peerId);
    const value = !target?.forceMuted;
    send({ type: "force-mute", from: userId, to: peerId, value });
    setParticipants((prev) => prev.map((p) => (p.userId === peerId ? { ...p, forceMuted: value } : p)));
    toast.success(value ? `${target?.name} foi silenciado para todos.` : `${target?.name} foi liberado.`);
  }, [isAdmin, participants, send, userId]);

  return {
    state, kind, participants, localStream, muted, camOff, forceMuted, elapsed, isAdmin,
    join, leave, toggleMute, toggleCam, toggleLocalMute, toggleForceMute,
  };
}
