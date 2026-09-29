import { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Send } from "lucide-react";
import { VoiceRecorder as Recorder, uploadVoiceMessage } from "@/lib/voice-recorder";
import { toast } from "@/hooks/use-toast";

interface VoiceRecorderButtonProps {
  userId: string;
  onSend: (attachment: {
    url: string;
    thumbnailUrl: string;
    width: number;
    height: number;
    fileName: string;
    size: number;
    mimeType?: string;
    kind?: string;
  }) => void;
  disabled?: boolean;
}

export function VoiceRecorderButton({ userId, onSend, disabled }: VoiceRecorderButtonProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [level, setLevel] = useState(0);
  const recRef = useRef<Recorder | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recRef.current?.cancel();
    };
  }, []);

  const start = async () => {
    try {
      const rec = new Recorder();
      await rec.start((l) => setLevel(l));
      recRef.current = rec;
      setRecording(true);
      setElapsed(0);
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }, 250);
    } catch (e) {
      console.error(e);
      toast({ title: "Microfone bloqueado", description: "Permita o acesso ao microfone.", variant: "destructive" });
    }
  };

  const stopAndSend = async () => {
    if (!recRef.current) return;
    setUploading(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const result = await recRef.current.stop();
      recRef.current = null;
      if (result.duration < 0.5) {
        toast({ title: "Áudio muito curto", description: "Segure o botão por mais tempo.", variant: "destructive" });
        setRecording(false);
        setUploading(false);
        return;
      }
      const att = await uploadVoiceMessage(result.blob, userId, result.duration, result.waveform);
      onSend(att);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Falha no áudio", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setRecording(false);
      setUploading(false);
    }
  };

  const cancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recRef.current?.cancel();
    recRef.current = null;
    setRecording(false);
  };

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!recording) {
    return (
      <button
        type="button"
        onClick={start}
        disabled={disabled || uploading}
        className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
        title="Gravar mensagem de voz"
      >
        <Mic className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30 flex-1">
      <button type="button" onClick={cancel} className="text-destructive p-1 rounded hover:bg-destructive/20" title="Cancelar">
        <Trash2 className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-1.5 flex-1">
        <span
          className="w-2 h-2 rounded-full bg-destructive"
          style={{ transform: `scale(${1 + level * 1.5})`, transition: "transform 0.1s" }}
        />
        <span className="text-xs text-foreground font-mono tabular-nums">{mmss(elapsed)}</span>
        <span className="text-xs text-muted-foreground ml-2">Gravando...</span>
      </div>
      <button
        type="button"
        onClick={stopAndSend}
        disabled={uploading}
        className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50"
        title="Enviar"
      >
        {uploading ? <Square className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
      </button>
    </div>
  );
}
