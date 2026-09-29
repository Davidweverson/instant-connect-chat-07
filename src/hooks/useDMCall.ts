import { useEffect, useRef, useState, useCallback } from "react";
import { createPeerConnection, getUserMedia, signalingChannel, type SignalPayload } from "@/lib/webrtc";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CallState = "idle" | "outgoing" | "incoming" | "connecting" | "in-call" | "ended";

export interface ActiveDMCall {
  callId: string;
  peerUserId: string;
  peerName: string;
  peerAvatar: string | null;
  kind: "voice" | "video";
  isCaller: boolean;
}

type ExtendedSignal =
  | SignalPayload
  | { type: "ready"; from: string; to: string };

/**
 * DM 1:1 call manager. Signaling via Supabase Realtime broadcast on `call-{callId}`.
 * Handshake:
 *  1. Caller inserts dm_calls row, subscribes to signaling channel.
 *  2. Caller pings the callee's inbox with a "ring" broadcast.
 *  3. Callee accepts → subscribes to signaling channel, sends "ready".
 *  4. Caller receives "ready" → creates offer + sends it.
 *  5. Callee answers → ICE flows → connected.
 */
export function useDMCall(userId: string | undefined, userName: string) {
  const [state, setState] = useState<CallState>("idle");
  const [active, setActive] = useState<ActiveDMCall | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const chanRef = useRef<ReturnType<typeof signalingChannel> | null>(null);
  const startedAtRef = useRef<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);
  const activeRef = useRef<ActiveDMCall | null>(null);
  const stateRef = useRef<CallState>("idle");
  const offerSentRef = useRef(false);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (state !== "in-call") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [state]);

  const cleanup = useCallback(() => {
    if (pcRef.current) { try { pcRef.current.close(); } catch { /* ignore */ } pcRef.current = null; }
    if (chanRef.current) { supabase.removeChannel(chanRef.current); chanRef.current = null; }
    setLocalStream((s) => { s?.getTracks().forEach((t) => t.stop()); return null; });
    setRemoteStream(null);
    setMuted(false);
    setCamOff(false);
    setElapsed(0);
    remoteDescSetRef.current = false;
    pendingIceRef.current = [];
    offerSentRef.current = false;
  }, []);

  const endCall = useCallback(async (silent = false) => {
    const a = activeRef.current;
    if (a && chanRef.current) {
      try {
        chanRef.current.send({ type: "broadcast", event: "signal", payload: { type: "bye", from: userId, to: a.peerUserId } });
      } catch { /* noop */ }
    }
    if (a) {
      await supabase.from("dm_calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", a.callId);
    }
    cleanup();
    setActive(null);
    setState("idle");
    if (!silent) toast.info("Chamada encerrada.");
  }, [cleanup, userId]);

  const setupPeer = useCallback(async (call: ActiveDMCall) => {
    const pc = createPeerConnection();
    pcRef.current = pc;
    const remote = new MediaStream();
    setRemoteStream(remote);

    const local = await getUserMedia(call.kind === "video");
    setLocalStream(local);
    local.getTracks().forEach((t) => pc.addTrack(t, local));

    pc.ontrack = (ev) => {
      ev.streams[0].getTracks().forEach((t) => remote.addTrack(t));
      setRemoteStream(new MediaStream(remote.getTracks()));
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && chanRef.current) {
        chanRef.current.send({ type: "broadcast", event: "signal", payload: { type: "ice", candidate: ev.candidate.toJSON(), from: userId, to: call.peerUserId } });
      }
    };

    const onConnected = () => {
      if (stateRef.current !== "in-call") {
        startedAtRef.current = Date.now();
        setState("in-call");
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") onConnected();
      else if (["failed", "closed"].includes(pc.connectionState)) {
        if (stateRef.current === "in-call" || stateRef.current === "connecting") endCall(true);
      }
    };
    // Fallback: some browsers only fire iceConnectionState reliably
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") onConnected();
      else if (pc.iceConnectionState === "failed") {
        if (stateRef.current === "in-call" || stateRef.current === "connecting") endCall(true);
      }
    };
    return pc;
  }, [userId, endCall]);

  const sendOffer = useCallback(async (call: ActiveDMCall) => {
    const pc = pcRef.current;
    if (!pc || !chanRef.current || offerSentRef.current) return;
    offerSentRef.current = true;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    chanRef.current.send({ type: "broadcast", event: "signal", payload: { type: "offer", sdp: offer.sdp!, from: userId, to: call.peerUserId } });
  }, [userId]);

  const attachChannel = useCallback((call: ActiveDMCall) => {
    const ch = signalingChannel(call.callId);
    chanRef.current = ch;
    ch.on("broadcast", { event: "signal" }, async ({ payload }) => {
      const msg = payload as ExtendedSignal;
      if (msg.to !== userId) return;
      const pc = pcRef.current;
      if (msg.type === "ready") {
        // Callee is ready to receive the offer
        if (call.isCaller) await sendOffer(call);
        return;
      }
      if (!pc) return;
      if (msg.type === "offer") {
        await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
        remoteDescSetRef.current = true;
        for (const c of pendingIceRef.current) await pc.addIceCandidate(c);
        pendingIceRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ch.send({ type: "broadcast", event: "signal", payload: { type: "answer", sdp: answer.sdp!, from: userId, to: msg.from } });
      } else if (msg.type === "answer") {
        await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
        remoteDescSetRef.current = true;
        for (const c of pendingIceRef.current) await pc.addIceCandidate(c);
        pendingIceRef.current = [];
      } else if (msg.type === "ice") {
        if (remoteDescSetRef.current) await pc.addIceCandidate(msg.candidate);
        else pendingIceRef.current.push(msg.candidate);
      } else if (msg.type === "bye") {
        toast.info("A outra pessoa encerrou a chamada.");
        cleanup();
        setActive(null);
        setState("idle");
      }
    });
    return new Promise<typeof ch>((resolve) => {
      ch.subscribe((status) => { if (status === "SUBSCRIBED") resolve(ch); });
    });
  }, [userId, cleanup, sendOffer]);

  // Global incoming listener. Realtime table events are the durable fallback when
  // a one-shot broadcast arrives before the recipient's inbox subscription is ready.
  useEffect(() => {
    if (!userId) return;
    const showIncoming = async (payload: { callId: string; callerId: string; callerName?: string; callerAvatar?: string | null; kind: "voice" | "video" }) => {
      if (stateRef.current !== "idle") return;
      let callerName = payload.callerName;
      let callerAvatar = payload.callerAvatar || null;
      if (!callerName) {
        const { data } = await supabase.from("profiles").select("username, avatar_url").eq("id", payload.callerId).maybeSingle();
        callerName = data?.username || "Alguém";
        callerAvatar = data?.avatar_url || null;
      }
      setActive({
        callId: payload.callId,
        peerUserId: payload.callerId,
        peerName: callerName,
        peerAvatar: callerAvatar,
        kind: payload.kind,
        isCaller: false,
      });
      setState("incoming");
      toast.info(`📞 ${callerName} está te ligando...`, { duration: 8000 });
    };
    const inbox = supabase
      .channel(`dm-inbox-${userId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "ring" }, ({ payload }) => {
        showIncoming(payload);
        try {
          const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
          audio.play().catch(() => { /* browsers may block */ });
        } catch { /* noop */ }
      })
      .subscribe();
    const calls = supabase
      .channel(`dm-call-rows-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_calls", filter: `callee_id=eq.${userId}` },
        ({ new: row }) => {
          const call = row as { id: string; caller_id: string; kind: "voice" | "video"; status: string };
          if (call.status === "ringing") showIncoming({ callId: call.id, callerId: call.caller_id, kind: call.kind });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dm_calls", filter: `caller_id=eq.${userId}` },
        ({ new: row }) => {
          const call = row as { id: string; status: string };
          const current = activeRef.current;
          if (current?.callId === call.id && current.isCaller && call.status === "accepted") sendOffer(current);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(inbox);
      supabase.removeChannel(calls);
    };
  }, [userId, sendOffer]);

  const startCall = useCallback(async (peerId: string, peerName: string, peerAvatar: string | null, kind: "voice" | "video") => {
    if (!userId || stateRef.current !== "idle") return;
    const { data, error } = await supabase.from("dm_calls").insert({ caller_id: userId, callee_id: peerId, kind, status: "ringing" }).select("id").single();
    if (error || !data) { toast.error("Não foi possível iniciar a chamada."); return; }
    const call: ActiveDMCall = { callId: data.id, peerUserId: peerId, peerName, peerAvatar, kind, isCaller: true };
    setActive(call);
    setState("outgoing");
    try {
      await attachChannel(call);
      await setupPeer(call);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao acessar microfone/câmera.");
      cleanup();
      setActive(null);
      setState("idle");
      return;
    }

    // Ring the peer's inbox (one-shot channel)
    const inbox = supabase.channel(`dm-inbox-${peerId}`, { config: { broadcast: { self: false } } });
    await new Promise<void>((res) => inbox.subscribe((s) => { if (s === "SUBSCRIBED") res(); }));
    await inbox.send({ type: "broadcast", event: "ring", payload: { callId: data.id, callerId: userId, callerName: userName, callerAvatar: peerAvatar, kind } });
    setTimeout(() => supabase.removeChannel(inbox), 800);

    // Auto missed after 40s
    setTimeout(async () => {
      if (pcRef.current && pcRef.current.connectionState !== "connected" && stateRef.current !== "in-call") {
        await supabase.from("dm_calls").update({ status: "missed", ended_at: new Date().toISOString() }).eq("id", data.id);
        toast.info("Sem resposta.");
        cleanup();
        setActive(null);
        setState("idle");
      }
    }, 40000);
  }, [userId, userName, attachChannel, setupPeer, cleanup]);

  const acceptCall = useCallback(async () => {
    const a = activeRef.current;
    if (!a || stateRef.current !== "incoming") return;
    setState("connecting");
    try {
      await attachChannel(a);
      await setupPeer(a);
      await supabase.from("dm_calls").update({ status: "accepted" }).eq("id", a.callId);
      // Signal caller we're ready to receive offer
      const sendReady = () => chanRef.current?.send({ type: "broadcast", event: "signal", payload: { type: "ready", from: userId, to: a.peerUserId } });
      await sendReady();
      window.setTimeout(sendReady, 400);
      window.setTimeout(sendReady, 1200);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao acessar microfone/câmera.");
      cleanup();
      setActive(null);
      setState("idle");
    }
  }, [attachChannel, setupPeer, userId, cleanup]);

  const declineCall = useCallback(async () => {
    const a = activeRef.current;
    if (!a) return;
    await supabase.from("dm_calls").update({ status: "declined", ended_at: new Date().toISOString() }).eq("id", a.callId);
    const ch = signalingChannel(a.callId);
    await new Promise<void>((res) => ch.subscribe((s) => { if (s === "SUBSCRIBED") res(); }));
    ch.send({ type: "broadcast", event: "signal", payload: { type: "bye", from: userId, to: a.peerUserId } });
    setTimeout(() => supabase.removeChannel(ch), 500);
    setActive(null);
    setState("idle");
  }, [userId]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const enabled = !muted;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !enabled));
    setMuted(enabled);
  }, [localStream, muted]);

  const toggleCam = useCallback(() => {
    if (!localStream) return;
    const enabled = !camOff;
    localStream.getVideoTracks().forEach((t) => (t.enabled = !enabled));
    setCamOff(enabled);
  }, [localStream, camOff]);

  return { state, active, remoteStream, localStream, muted, camOff, elapsed, startCall, acceptCall, declineCall, endCall, toggleMute, toggleCam };
}
