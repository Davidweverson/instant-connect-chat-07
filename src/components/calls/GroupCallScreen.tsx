import { useEffect, useRef } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, VolumeX, ShieldOff, ShieldCheck } from "lucide-react";
import type { GroupParticipant } from "@/hooks/useGroupCall";

interface Props {
  channelName: string;
  kind: "voice" | "video";
  connecting: boolean;
  participants: GroupParticipant[];
  localStream: MediaStream | null;
  selfName: string;
  selfAvatar: string | null;
  muted: boolean;
  camOff: boolean;
  forceMuted: boolean;
  isAdmin: boolean;
  elapsed: number;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleCam: () => void;
  onToggleLocalMute: (peerId: string) => void;
  onToggleForceMute: (peerId: string) => void;
}

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

/** Waveform vibrante alimentada pelos streams remotos. */
function Waveform({ streams }: { streams: MediaStream[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const withAudio = streams.filter((s) => s.getAudioTracks().length > 0);
    if (!withAudio.length) return;
    const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const sources = withAudio.map((s) => {
      const src = ctx.createMediaStreamSource(s);
      src.connect(analyser);
      return src;
    });
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
        c.fillRect(i * bw + bw * 0.15, (height - h) / 2, bw * 0.7, h);
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      sources.forEach((s) => { try { s.disconnect(); } catch { /* noop */ } });
      try { ctx.close(); } catch { /* noop */ }
    };
  }, [streams]);

  return <canvas ref={canvasRef} width={640} height={48} className="w-full h-12 opacity-90" />;
}

function Tile({ p, isVideo, isAdmin, onToggleLocalMute, onToggleForceMute }: {
  p: GroupParticipant;
  isVideo: boolean;
  isAdmin: boolean;
  onToggleLocalMute: (id: string) => void;
  onToggleForceMute: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (videoRef.current && p.stream) videoRef.current.srcObject = p.stream;
    if (audioRef.current && p.stream) audioRef.current.srcObject = p.stream;
  }, [p.stream]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = p.locallyMuted;
    if (videoRef.current) videoRef.current.muted = true;
  }, [p.locallyMuted]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-background/50 backdrop-blur-md border border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.2)] aspect-video flex items-center justify-center">
      {isVideo ? (
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="w-20 h-20 rounded-full bg-primary/20 ring-2 ring-primary/50 overflow-hidden flex items-center justify-center">
          {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" />
            : <span className="text-primary font-bold text-3xl">{p.name[0]?.toUpperCase()}</span>}
        </div>
      )}
      <audio ref={audioRef} autoPlay />

      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
        <span className="text-xs font-medium text-foreground px-2 py-1 rounded-lg bg-background/70 backdrop-blur truncate">
          {p.name}{p.forceMuted && " 🔇"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => onToggleLocalMute(p.userId)}
            title={p.locallyMuted ? "Ouvir novamente" : "Silenciar só para mim"}
            className="p-1.5 rounded-lg bg-background/70 backdrop-blur text-muted-foreground hover:text-foreground transition-colors"
          >
            {p.locallyMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {isAdmin && (
            <button
              onClick={() => onToggleForceMute(p.userId)}
              title={p.forceMuted ? "Liberar microfone (todos)" : "Silenciar para todos"}
              className={`p-1.5 rounded-lg bg-background/70 backdrop-blur transition-colors ${p.forceMuted ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
            >
              {p.forceMuted ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GroupCallScreen(p: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const isVideo = p.kind === "video";

  useEffect(() => {
    if (localRef.current && p.localStream) localRef.current.srcObject = p.localStream;
  }, [p.localStream]);

  const remoteStreams = p.participants.map((x) => x.stream).filter(Boolean) as MediaStream[];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col animate-fade-in overflow-hidden">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-2xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--primary)/0.25),transparent_60%)]" />

      {/* Header */}
      <div className="relative z-10 p-4 flex items-center justify-between border-b border-border/40 bg-background/40 backdrop-blur">
        <div>
          <p className="font-semibold text-foreground font-display tracking-wide">
            {isVideo ? "Videochamada" : "Chamada de voz"} · #{p.channelName}
          </p>
          <p className="text-xs text-muted-foreground">
            {p.connecting ? "Entrando..." : `${p.participants.length + 1} na chamada · ${fmt(p.elapsed)}`}
          </p>
        </div>
      </div>

      {/* Grade de participantes */}
      <div className="relative z-0 flex-1 overflow-y-auto p-4 pb-44">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Eu */}
          <div className="relative rounded-2xl overflow-hidden bg-background/50 backdrop-blur-md border-2 border-primary shadow-[0_0_30px_hsl(var(--primary)/0.4)] aspect-video flex items-center justify-center">
            {isVideo ? (
              <video ref={localRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 ring-2 ring-primary overflow-hidden flex items-center justify-center">
                {p.selfAvatar ? <img src={p.selfAvatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-primary font-bold text-3xl">{p.selfName[0]?.toUpperCase()}</span>}
              </div>
            )}
            <span className="absolute bottom-2 left-2 text-xs font-medium text-foreground px-2 py-1 rounded-lg bg-background/70 backdrop-blur">
              {p.selfName} (você){p.muted && " 🔇"}
            </span>
          </div>

          {p.participants.map((part) => (
            <Tile
              key={part.userId}
              p={part}
              isVideo={isVideo}
              isAdmin={p.isAdmin}
              onToggleLocalMute={p.onToggleLocalMute}
              onToggleForceMute={p.onToggleForceMute}
            />
          ))}
        </div>

        {p.participants.length === 0 && !p.connecting && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            Você é o primeiro na chamada. Aguardando outros membros...
          </p>
        )}
      </div>

      {/* Controles */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-6 pt-4 px-4 flex flex-col items-center gap-3">
        <div className="w-full max-w-md rounded-2xl px-4 py-2 bg-background/50 backdrop-blur-md border border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.25)]">
          <Waveform streams={remoteStreams} />
        </div>

        <div className="relative flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-background/70 backdrop-blur-xl border border-primary/40 shadow-[0_0_40px_hsl(var(--primary)/0.35)]">
          <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-accent/30" />
          <button
            onClick={p.onToggleMute}
            title={p.forceMuted ? "Silenciado por um administrador" : "Microfone"}
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
          <button onClick={p.onLeave} className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_25px_hsl(var(--destructive)/0.7)]">
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
