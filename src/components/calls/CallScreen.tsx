import { useEffect, useRef } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, X } from "lucide-react";
import type { ActiveDMCall, CallState } from "@/hooks/useDMCall";

interface Props {
  state: CallState;
  call: ActiveDMCall;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  camOff: boolean;
  elapsed: number;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCam: () => void;
}

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

/** Live audio waveform driven by the remote stream. */
function Waveform({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return;
    const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const canvas = canvasRef.current!;
    const c = canvas.getContext("2d")!;
    const rootStyles = getComputedStyle(document.documentElement);
    const resolve = (name: string, fallback: string) => {
      const v = rootStyles.getPropertyValue(name).trim();
      return v ? `hsl(${v})` : fallback;
    };
    const primaryColor = resolve("--primary", "#22d3ee");
    const accentColor = resolve("--accent", "#a78bfa");

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      const { width, height } = canvas;
      c.clearRect(0, 0, width, height);
      const bars = 48;
      const step = Math.floor(data.length / bars);
      const bw = width / bars;
      const grd = c.createLinearGradient(0, 0, width, 0);
      grd.addColorStop(0, primaryColor);
      grd.addColorStop(0.5, accentColor);
      grd.addColorStop(1, primaryColor);
      c.fillStyle = grd;
      for (let i = 0; i < bars; i++) {
        const v = data[i * step] / 255;
        const h = Math.max(3, v * height * 0.9);
        const x = i * bw + bw * 0.15;
        const y = (height - h) / 2;
        c.fillRect(x, y, bw * 0.7, h);
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      try { src.disconnect(); } catch { /* noop */ }
      try { ctx.close(); } catch { /* noop */ }
    };
  }, [stream]);

  return <canvas ref={canvasRef} width={640} height={48} className="w-full h-12 opacity-90" />;
}

export function CallScreen(p: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localRef.current && p.localStream) localRef.current.srcObject = p.localStream;
  }, [p.localStream]);
  useEffect(() => {
    if (p.call.kind === "video" && remoteRef.current && p.remoteStream) remoteRef.current.srcObject = p.remoteStream;
    if (audioRef.current && p.remoteStream) audioRef.current.srcObject = p.remoteStream;
  }, [p.remoteStream, p.call.kind]);

  const isIncoming = p.state === "incoming";
  const isOutgoing = p.state === "outgoing" || p.state === "connecting";
  const isInCall = p.state === "in-call";
  const isVideo = p.call.kind === "video";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col animate-fade-in overflow-hidden">
      {/* Vibrant animated backdrop */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-2xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--primary)/0.25),transparent_60%)]" />

      {/* Header */}
      <div className="relative z-10 p-4 flex items-center justify-between border-b border-border/40 bg-background/40 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden ring-2 ${isIncoming || isOutgoing ? "animate-pulse ring-primary shadow-[0_0_30px_hsl(var(--primary)/0.6)]" : "ring-primary/40"}`}>
            {p.call.peerAvatar
              ? <img src={p.call.peerAvatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-primary font-bold text-lg">{p.call.peerName[0]?.toUpperCase()}</span>}
          </div>
          <div>
            <p className="font-semibold text-foreground font-display tracking-wide">{p.call.peerName}</p>
            <p className="text-xs text-muted-foreground">
              {isIncoming ? `Chamada de ${isVideo ? "vídeo" : "voz"} recebida...`
               : isOutgoing ? "Chamando..."
               : isInCall ? fmt(p.elapsed) : "Encerrando..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isIncoming && (
            <button onClick={p.onDecline} className="text-muted-foreground hover:text-foreground p-2">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Video/Voice area */}
      <div className="relative z-0 flex-1 flex items-center justify-center overflow-hidden">
        {isVideo ? (
          <>
            <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-contain bg-background/60" />
            <video
              ref={localRef}
              autoPlay
              playsInline
              muted
              className="absolute top-4 right-4 w-32 h-24 md:w-48 md:h-36 object-cover rounded-2xl border-2 border-primary shadow-[0_0_30px_hsl(var(--primary)/0.5)] z-20"
            />
          </>
        ) : (
          <div className="text-center relative z-10">
            <div className="relative w-40 h-40 mx-auto mb-6">
              <span className="absolute inset-0 rounded-full bg-primary/30 blur-2xl animate-pulse-glow" />
              <div className="relative w-40 h-40 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden ring-4 ring-primary/50 shadow-[0_0_60px_hsl(var(--primary)/0.5)]">
                {p.call.peerAvatar
                  ? <img src={p.call.peerAvatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-primary font-bold text-6xl">{p.call.peerName[0]?.toUpperCase()}</span>}
              </div>
            </div>
            <p className="text-3xl font-display text-foreground">{p.call.peerName}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {isInCall ? fmt(p.elapsed) : isIncoming ? "Chamada de voz recebida" : "Chamando..."}
            </p>
            <audio ref={audioRef} autoPlay />
          </div>
        )}
      </div>

      {/* Controls - always overlaid at bottom, floating with glow */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-6 pt-4 px-4 flex flex-col items-center gap-3">
        {/* Waveform */}
        {isInCall && (
          <div className="w-full max-w-md rounded-2xl px-4 py-2 bg-background/50 backdrop-blur-md border border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.25)]">
            <Waveform stream={p.remoteStream} />
          </div>
        )}

        {/* Buttons */}
        <div className="relative flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-background/70 backdrop-blur-xl border border-primary/40 shadow-[0_0_40px_hsl(var(--primary)/0.35)]">
          <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-accent/30" />
          {isIncoming ? (
            <>
              <button onClick={p.onDecline} className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_25px_hsl(var(--destructive)/0.6)]">
                <PhoneOff className="w-6 h-6" />
              </button>
              <button onClick={p.onAccept} className="w-14 h-14 rounded-full bg-online text-white flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_25px_hsl(var(--online)/0.7)] animate-pulse">
                <Phone className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={p.onToggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 ${p.muted ? "bg-destructive text-destructive-foreground shadow-[0_0_20px_hsl(var(--destructive)/0.6)]" : "bg-muted/80 hover:bg-muted text-foreground"}`}
              >
                {p.muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              {isVideo && (
                <button
                  onClick={p.onToggleCam}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 ${p.camOff ? "bg-destructive text-destructive-foreground shadow-[0_0_20px_hsl(var(--destructive)/0.6)]" : "bg-muted/80 hover:bg-muted text-foreground"}`}
                >
                  {p.camOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}
              <button onClick={p.onEnd} className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_25px_hsl(var(--destructive)/0.7)]">
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
