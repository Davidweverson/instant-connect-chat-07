import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { parseVoiceMeta } from "@/lib/voice-recorder";

interface VoiceMessageProps {
  url: string;
  fileName?: string;
  isOwn?: boolean;
}

const SPEEDS = [1, 1.5, 2];

export function VoiceMessage({ url, fileName, isOwn }: VoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const meta = parseVoiceMeta(fileName);
  const waveform = meta.waveform.length > 0 ? meta.waveform : Array.from({ length: 32 }, () => 0.3);
  const duration = meta.duration;

  useEffect(() => {
    const a = new Audio(url);
    audioRef.current = a;
    a.preload = "metadata";
    const onTime = () => setCurrent(a.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, [url]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const seekToBar = (i: number) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const t = (i / waveform.length) * duration;
    a.currentTime = t;
    setCurrent(t);
  };

  const progress = duration ? current / duration : 0;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 min-w-[220px] max-w-[300px] py-1">
      <button
        onClick={toggle}
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          isOwn ? "bg-background/20 hover:bg-background/30" : "bg-primary/15 hover:bg-primary/25 text-primary"
        }`}
        title={playing ? "Pausar" : "Reproduzir"}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-end gap-[2px] h-7 cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          seekToBar(Math.floor(ratio * waveform.length));
        }}>
          {waveform.map((v, i) => {
            const active = i / waveform.length <= progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${active ? (isOwn ? "bg-background" : "bg-primary") : "bg-current opacity-30"}`}
                style={{ height: `${Math.max(15, v * 100)}%` }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] opacity-70 tabular-nums">
            {mmss(playing || current > 0 ? current : duration)}
          </span>
          <button
            onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
            className="text-[10px] px-1.5 py-0.5 rounded bg-current/10 hover:bg-current/20 transition-colors font-medium tabular-nums"
            title="Velocidade"
          >
            {SPEEDS[speedIdx]}x
          </button>
        </div>
      </div>
    </div>
  );
}
