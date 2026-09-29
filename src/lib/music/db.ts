import { openDB, type IDBPDatabase } from "idb";

export interface TrackMeta {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  trackNo: number | null;
  duration: number;
  mime: string;
  fileName: string;
  size: number;
  hasCover: boolean;
  favorite: boolean;
  addedAt: number;
  lastPlayedAt: number | null;
  playCount: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = "flashchat-music";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("tracks")) {
          const s = db.createObjectStore("tracks", { keyPath: "id" });
          s.createIndex("addedAt", "addedAt");
          s.createIndex("artist", "artist");
          s.createIndex("album", "album");
        }
        if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
        if (!db.objectStoreNames.contains("covers")) db.createObjectStore("covers");
        if (!db.objectStoreNames.contains("playlists")) db.createObjectStore("playlists", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export const MUSIC_MIME_EXT = [".mp3", ".flac", ".wav", ".ogg", ".oga", ".m4a", ".aac", ".mp4"];

export function isSupportedAudio(file: File) {
  const name = file.name.toLowerCase();
  return file.type.startsWith("audio/") || MUSIC_MIME_EXT.some((e) => name.endsWith(e));
}

export async function listTracks(): Promise<TrackMeta[]> {
  const db = await getDB();
  return (await db.getAll("tracks")) as TrackMeta[];
}

export async function listPlaylists(): Promise<Playlist[]> {
  const db = await getDB();
  return (await db.getAll("playlists")) as Playlist[];
}

export async function saveTrack(meta: TrackMeta, file: Blob, cover: Blob | null) {
  const db = await getDB();
  const tx = db.transaction(["tracks", "files", "covers"], "readwrite");
  await tx.objectStore("tracks").put(meta);
  await tx.objectStore("files").put(file, meta.id);
  if (cover) await tx.objectStore("covers").put(cover, meta.id);
  await tx.done;
}

export async function updateTrack(meta: TrackMeta) {
  const db = await getDB();
  await db.put("tracks", meta);
}

export async function deleteTrack(id: string) {
  const db = await getDB();
  const tx = db.transaction(["tracks", "files", "covers"], "readwrite");
  await tx.objectStore("tracks").delete(id);
  await tx.objectStore("files").delete(id);
  await tx.objectStore("covers").delete(id);
  await tx.done;
  const playlists = await listPlaylists();
  for (const p of playlists) {
    if (p.trackIds.includes(id)) {
      await savePlaylist({ ...p, trackIds: p.trackIds.filter((t) => t !== id), updatedAt: Date.now() });
    }
  }
}

export async function getFileBlob(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  return db.get("files", id);
}

export async function getCoverBlob(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  return db.get("covers", id);
}

export async function savePlaylist(p: Playlist) {
  const db = await getDB();
  await db.put("playlists", p);
}

export async function deletePlaylist(id: string) {
  const db = await getDB();
  await db.delete("playlists", id);
}
