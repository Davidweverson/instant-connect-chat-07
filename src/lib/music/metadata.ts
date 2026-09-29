import { getCoverBlob, type TrackMeta } from "./db";

export interface ParsedTrack {
  meta: Omit<TrackMeta, "id" | "favorite" | "addedAt" | "lastPlayedAt" | "playCount">;
  cover: Blob | null;
}

function fallbackTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/_/g, " ").trim();
}

async function probeDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (v: number) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => done(0);
    audio.src = url;
  });
}

export async function parseTrackFile(file: File): Promise<ParsedTrack> {
  let title = fallbackTitle(file.name);
  let artist = "Artista desconhecido";
  let album = "Álbum desconhecido";
  let genre = "";
  let year: number | null = null;
  let trackNo: number | null = null;
  let duration = 0;
  let cover: Blob | null = null;

  try {
    const mm = await import("music-metadata");
    const parsed = await mm.parseBlob(file, { duration: true });
    const c = parsed.common;
    if (c.title) title = c.title;
    if (c.artist) artist = c.artist;
    if (c.album) album = c.album;
    if (c.genre?.length) genre = c.genre.join(", ");
    if (c.year) year = c.year;
    if (c.track?.no) trackNo = c.track.no;
    if (parsed.format.duration) duration = parsed.format.duration;
    const pic = c.picture?.[0];
    if (pic) cover = new Blob([pic.data as unknown as BlobPart], { type: pic.format || "image/jpeg" });
  } catch {
    // metadata parse failed — keep fallbacks
  }

  if (!duration) duration = await probeDuration(file);

  return {
    meta: {
      title,
      artist,
      album,
      genre,
      year,
      trackNo,
      duration,
      mime: file.type || "audio/mpeg",
      fileName: file.name,
      size: file.size,
      hasCover: !!cover,
    },
    cover,
  };
}

const coverUrlCache = new Map<string, string>();

export async function getCoverUrl(trackId: string, hasCover: boolean): Promise<string | null> {
  if (!hasCover) return null;
  const cached = coverUrlCache.get(trackId);
  if (cached) return cached;
  const blob = await getCoverBlob(trackId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  coverUrlCache.set(trackId, url);
  return url;
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
