// MediaRecorder helper for voice messages
import { supabase } from "@/integrations/supabase/client";
import type { AttachmentData } from "./image-utils";

export interface RecordingResult {
  blob: Blob;
  duration: number;
  waveform: number[];
  mimeType: string;
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private waveSamples: number[] = [];
  private rafId: number | null = null;
  private startedAt = 0;
  private mimeType = "audio/webm";

  async start(onLevel?: (level: number) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const supportedTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    this.mimeType = supportedTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "audio/webm";
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    this.chunks = [];
    this.waveSamples = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.startedAt = Date.now();
    this.mediaRecorder.start(100);

    // Live waveform sampling
    this.audioCtx = new AudioContext();
    const src = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    src.connect(this.analyser);
    const buf = new Uint8Array(this.analyser.frequencyBinCount);

    let lastSample = 0;
    const tick = () => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      const now = Date.now();
      if (now - lastSample >= 80) {
        this.waveSamples.push(Math.min(1, rms * 2));
        lastSample = now;
      }
      onLevel?.(rms);
      this.rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  async stop(): Promise<RecordingResult> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve({ blob: new Blob(), duration: 0, waveform: [], mimeType: this.mimeType });
        return;
      }
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType });
        const duration = (Date.now() - this.startedAt) / 1000;
        this.cleanup();
        // Normalize waveform to ~40 bars
        const target = 40;
        const samples = this.waveSamples;
        const out: number[] = [];
        if (samples.length <= target) {
          out.push(...samples);
          while (out.length < target) out.push(0);
        } else {
          const bucket = samples.length / target;
          for (let i = 0; i < target; i++) {
            const start = Math.floor(i * bucket);
            const end = Math.floor((i + 1) * bucket);
            let max = 0;
            for (let j = start; j < end; j++) max = Math.max(max, samples[j]);
            out.push(max);
          }
        }
        resolve({ blob, duration, waveform: out, mimeType: this.mimeType });
      };
      this.mediaRecorder.stop();
    });
  }

  cancel() {
    try {
      this.mediaRecorder?.stop();
    } catch {}
    this.cleanup();
  }

  private cleanup() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
  }
}

export async function uploadVoiceMessage(
  blob: Blob,
  userId: string,
  duration: number,
  waveform: number[]
): Promise<AttachmentData> {
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const path = `${userId}/voice-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, blob, { contentType: blob.type || "audio/webm" });
  if (error) throw error;
  const { data } = supabase.storage.from("attachments").getPublicUrl(path);
  // Embed duration+waveform in fileName as JSON metadata (since schema is fixed)
  const meta = JSON.stringify({ d: Math.round(duration * 10) / 10, w: waveform });
  return {
    url: data.publicUrl,
    thumbnailUrl: data.publicUrl,
    width: 0,
    height: 0,
    fileName: `voice.${ext}|${meta}`,
    size: blob.size,
    mimeType: blob.type || "audio/webm",
    kind: "audio",
  };
}

export function parseVoiceMeta(fileName: string | undefined | null): { duration: number; waveform: number[] } {
  if (!fileName) return { duration: 0, waveform: [] };
  const idx = fileName.indexOf("|");
  if (idx === -1) return { duration: 0, waveform: [] };
  try {
    const obj = JSON.parse(fileName.slice(idx + 1));
    return { duration: obj.d || 0, waveform: Array.isArray(obj.w) ? obj.w : [] };
  } catch {
    return { duration: 0, waveform: [] };
  }
}
