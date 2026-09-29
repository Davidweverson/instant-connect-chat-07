import { supabase } from "@/integrations/supabase/client";

export type WallpaperMediaType = "image" | "gif" | "video";

export interface WallpaperSticker {
  id: string;
  /** storage path inside the `stickers` bucket */
  path: string;
  /** center position, 0..1 relative to the wallpaper area */
  x: number;
  y: number;
  /** size relative to the shortest side of the wallpaper area (0..1) */
  scale: number;
  rotation: number;
  opacity: number;
  z: number;
}

export interface WallpaperTransform {
  mode: "auto" | "manual";
  /** zoom multiplier over the "cover" baseline */
  zoom: number;
  /** pan offset, fraction of the wallpaper area */
  offsetX: number;
  offsetY: number;
  blur: number;
  dim: number;
}

export interface UserWallpaper {
  id: string;
  user_id: string;
  name: string;
  /** storage path inside the `wallpapers` bucket */
  media_url: string;
  media_type: WallpaperMediaType;
  thumbnail_url: string | null;
  transform: WallpaperTransform;
  stickers: WallpaperSticker[];
  is_active: boolean;
  created_at: string;
}

export const DEFAULT_TRANSFORM: WallpaperTransform = {
  mode: "auto",
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  blur: 0,
  dim: 0.25,
};

export const WALLPAPER_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/webm";
export const STICKER_ACCEPT = "image/png,image/webp,image/gif,image/svg+xml";

const MAX_WALLPAPER_BYTES = 40 * 1024 * 1024;
const MAX_STICKER_BYTES = 8 * 1024 * 1024;

export function detectMediaType(file: File): WallpaperMediaType {
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "image/gif") return "gif";
  return "image";
}

/** Compress a static image to webp, capped to the given max side. Animated/vector files pass through. */
async function compressStatic(file: File, maxSide: number, quality: number): Promise<Blob> {
  if (file.type === "image/gif" || file.type === "image/svg+xml" || file.type.startsWith("video/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const ratio = Math.min(1, maxSide / Math.max(width, height));
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function extensionFor(blob: Blob, original: File): string {
  if (blob.type === "image/webp") return "webp";
  const fromName = original.name.split(".").pop();
  return (fromName || "bin").toLowerCase().slice(0, 5);
}

export async function uploadWallpaperFile(file: File, userId: string): Promise<{ path: string; type: WallpaperMediaType }> {
  if (file.size > MAX_WALLPAPER_BYTES) throw new Error("Arquivo muito grande. Máximo: 40MB.");
  const type = detectMediaType(file);
  const blob = await compressStatic(file, 2560, 0.9);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionFor(blob, file)}`;
  const { error } = await supabase.storage
    .from("wallpapers")
    .upload(path, blob, { contentType: blob.type || file.type || "application/octet-stream", upsert: false });
  if (error) throw error;
  return { path, type };
}

export async function uploadStickerFile(file: File, userId: string): Promise<string> {
  if (file.size > MAX_STICKER_BYTES) throw new Error("Figurinha muito grande. Máximo: 8MB.");
  const blob = await compressStatic(file, 1024, 0.92);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionFor(blob, file)}`;
  const { error } = await supabase.storage
    .from("stickers")
    .upload(path, blob, { contentType: blob.type || file.type || "application/octet-stream", upsert: false });
  if (error) throw error;
  return path;
}

/** Signed URL cache — buckets are private, so every render needs a fresh-ish signed link. */
const urlCache = new Map<string, { url: string; expires: number }>();
const SIGN_TTL = 60 * 60 * 6;

export async function signedUrl(bucket: "wallpapers" | "stickers", path: string): Promise<string> {
  if (!path) return "";
  const key = `${bucket}:${path}`;
  const hit = urlCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGN_TTL);
  if (error || !data) return "";
  urlCache.set(key, { url: data.signedUrl, expires: Date.now() + (SIGN_TTL - 300) * 1000 });
  return data.signedUrl;
}

export const WALLPAPER_CHANGED_EVENT = "flashchat:wallpaper-changed";

export function notifyWallpaperChanged() {
  window.dispatchEvent(new CustomEvent(WALLPAPER_CHANGED_EVENT));
}

function normalize(row: any): UserWallpaper {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    media_url: row.media_url,
    media_type: (row.media_type as WallpaperMediaType) ?? "image",
    thumbnail_url: row.thumbnail_url ?? null,
    transform: { ...DEFAULT_TRANSFORM, ...(row.transform || {}) },
    stickers: Array.isArray(row.stickers) ? (row.stickers as WallpaperSticker[]) : [],
    is_active: !!row.is_active,
    created_at: row.created_at,
  };
}

export async function listWallpapers(userId: string): Promise<UserWallpaper[]> {
  const { data, error } = await supabase
    .from("user_wallpapers" as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as any[]) || []).map(normalize);
}

export async function getActiveWallpaper(userId: string): Promise<UserWallpaper | null> {
  const { data } = await supabase
    .from("user_wallpapers" as any)
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return data ? normalize(data) : null;
}

export async function createWallpaper(input: {
  userId: string;
  name: string;
  path: string;
  mediaType: WallpaperMediaType;
  transform: WallpaperTransform;
  stickers: WallpaperSticker[];
  activate: boolean;
}): Promise<UserWallpaper> {
  const { data, error } = await supabase
    .from("user_wallpapers" as any)
    .insert({
      user_id: input.userId,
      name: input.name,
      media_url: input.path,
      media_type: input.mediaType,
      transform: input.transform as any,
      stickers: input.stickers as any,
      is_active: input.activate,
    } as any)
    .select("*")
    .single();
  if (error) throw error;
  notifyWallpaperChanged();
  return normalize(data);
}

export async function updateWallpaper(
  id: string,
  patch: { name?: string; transform?: WallpaperTransform; stickers?: WallpaperSticker[]; is_active?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from("user_wallpapers" as any)
    .update(patch as any)
    .eq("id", id);
  if (error) throw error;
  notifyWallpaperChanged();
}

export async function setActiveWallpaper(userId: string, id: string | null): Promise<void> {
  if (id) {
    const { error } = await supabase.from("user_wallpapers" as any).update({ is_active: true } as any).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("user_wallpapers" as any)
      .update({ is_active: false } as any)
      .eq("user_id", userId)
      .eq("is_active", true);
    if (error) throw error;
  }
  notifyWallpaperChanged();
}

export async function deleteWallpaper(w: UserWallpaper): Promise<void> {
  const { error } = await supabase.from("user_wallpapers" as any).delete().eq("id", w.id);
  if (error) throw error;
  await supabase.storage.from("wallpapers").remove([w.media_url]);
  notifyWallpaperChanged();
}
