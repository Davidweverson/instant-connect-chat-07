import { supabase } from "@/integrations/supabase/client";

export interface AttachmentData {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  fileName: string;
  size: number;
  mimeType?: string;
  kind?: "image" | "video" | "audio" | "file";
}

export interface PendingAttachment {
  file: File;
  preview: string;
  id: string;
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

export function isGifFile(file: File): boolean {
  return file.type === "image/gif";
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
}

export function isGifUrl(url: string): boolean {
  return /\.gif(\?|$)/i.test(url);
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

function getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  });
}

function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;

      if (w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to compress image"));
        },
        "image/webp",
        quality
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
    img.src = URL.createObjectURL(file);
  });
}

function generateVideoThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      // Seek to 1s or 25% of duration, whichever is smaller
      video.currentTime = Math.min(1, video.duration * 0.25);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const w = Math.min(video.videoWidth, 500);
      const ratio = w / video.videoWidth;
      const h = Math.round(video.videoHeight * ratio);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src);
          if (blob) resolve(blob);
          else reject(new Error("Failed to generate video thumbnail"));
        },
        "image/webp",
        0.7
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video for thumbnail"));
    };

    video.src = URL.createObjectURL(file);
  });
}

async function uploadVideoAttachment(
  file: File,
  bucket: string,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<AttachmentData> {
  onProgress?.(10);

  const dims = await getVideoDimensions(file);
  onProgress?.(20);

  // Limit video size to 50MB
  if (file.size > 50 * 1024 * 1024) {
    throw new Error("Vídeo muito grande. Máximo: 50MB.");
  }

  // Generate thumbnail
  let thumbBlob: Blob;
  try {
    thumbBlob = await generateVideoThumbnail(file);
  } catch {
    // Fallback: no thumbnail
    thumbBlob = new Blob([], { type: "image/webp" });
  }
  onProgress?.(40);

  const ts = Date.now();
  const ext = file.name.split(".").pop() || "mp4";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const videoPath = `${userId}/${ts}-${baseName}.${ext}`;
  const thumbPath = `${userId}/${ts}-${baseName}-thumb.webp`;

  // Upload video
  const { error: vidErr } = await supabase.storage
    .from(bucket)
    .upload(videoPath, file, { contentType: file.type });
  if (vidErr) throw vidErr;
  onProgress?.(75);

  // Upload thumbnail
  if (thumbBlob.size > 0) {
    await supabase.storage
      .from(bucket)
      .upload(thumbPath, thumbBlob, { contentType: "image/webp" });
  }
  onProgress?.(90);

  const { data: vidUrl } = supabase.storage.from(bucket).getPublicUrl(videoPath);
  const { data: tUrl } = supabase.storage.from(bucket).getPublicUrl(thumbPath);
  onProgress?.(100);

  return {
    url: vidUrl.publicUrl,
    thumbnailUrl: thumbBlob.size > 0 ? tUrl.publicUrl : vidUrl.publicUrl,
    width: dims.width,
    height: dims.height,
    fileName: file.name,
    size: file.size,
  };
}

async function uploadGifAttachment(
  file: File,
  bucket: string,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<AttachmentData> {
  onProgress?.(10);
  const dims = await getImageDimensions(file);
  onProgress?.(30);

  const ts = Date.now();
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const gifPath = `${userId}/${ts}-${baseName}.gif`;

  // Upload GIF as-is (no compression to preserve animation)
  const { error } = await supabase.storage
    .from(bucket)
    .upload(gifPath, file, { contentType: "image/gif" });
  if (error) throw error;
  onProgress?.(90);

  const { data: gifUrl } = supabase.storage.from(bucket).getPublicUrl(gifPath);
  onProgress?.(100);

  return {
    url: gifUrl.publicUrl,
    thumbnailUrl: gifUrl.publicUrl,
    width: dims.width,
    height: dims.height,
    fileName: file.name,
    size: file.size,
  };
}

async function uploadGenericFile(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<AttachmentData> {
  onProgress?.(5);
  if (file.size > 50 * 1024 * 1024) {
    throw new Error("Arquivo muito grande. Máximo: 50MB.");
  }
  const ts = Date.now();
  // sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const path = `${userId}/${ts}-${safeName}`;
  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw error;
  onProgress?.(95);
  const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
  onProgress?.(100);
  const kind: AttachmentData["kind"] = file.type.startsWith("audio/") ? "audio" : "file";
  return {
    url: urlData.publicUrl,
    thumbnailUrl: urlData.publicUrl,
    width: 0,
    height: 0,
    fileName: file.name,
    size: file.size,
    mimeType: file.type,
    kind,
  };
}

export async function uploadAttachment(
  file: File,
  bucket: string,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<AttachmentData> {
  // Route to appropriate handler
  if (isVideoFile(file)) {
    const r = await uploadVideoAttachment(file, bucket, userId, onProgress);
    return { ...r, mimeType: file.type, kind: "video" };
  }
  if (isGifFile(file)) {
    const r = await uploadGifAttachment(file, bucket, userId, onProgress);
    return { ...r, mimeType: "image/gif", kind: "image" };
  }
  if (!file.type.startsWith("image/")) {
    return uploadGenericFile(file, userId, onProgress);
  }

  // Standard image compression flow
  onProgress?.(10);
  const dims = await getImageDimensions(file);
  onProgress?.(20);

  const fullBlob = await compressImage(file, 1920, 1920, 0.85);
  onProgress?.(40);

  const thumbBlob = await compressImage(file, 500, 500, 0.7);
  onProgress?.(60);

  const ts = Date.now();
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const fullPath = `${userId}/${ts}-${baseName}.webp`;
  const thumbPath = `${userId}/${ts}-${baseName}-thumb.webp`;

  const { error: fullErr } = await supabase.storage
    .from(bucket)
    .upload(fullPath, fullBlob, { contentType: "image/webp" });
  if (fullErr) throw fullErr;
  onProgress?.(80);

  const { error: thumbErr } = await supabase.storage
    .from(bucket)
    .upload(thumbPath, thumbBlob, { contentType: "image/webp" });
  if (thumbErr) throw thumbErr;
  onProgress?.(95);

  const { data: fullUrl } = supabase.storage.from(bucket).getPublicUrl(fullPath);
  const { data: thumbUrl } = supabase.storage.from(bucket).getPublicUrl(thumbPath);
  onProgress?.(100);

  return {
    url: fullUrl.publicUrl,
    thumbnailUrl: thumbUrl.publicUrl,
    width: dims.width,
    height: dims.height,
    fileName: file.name,
    size: file.size,
    mimeType: "image/webp",
    kind: "image",
  };
}

export function createPendingAttachment(file: File): PendingAttachment {
  return {
    file,
    preview: URL.createObjectURL(file),
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

export function revokePendingAttachments(attachments: PendingAttachment[]) {
  attachments.forEach((a) => URL.revokeObjectURL(a.preview));
}

/** Accepted file types for the file picker (mídia) */
export const ACCEPTED_MEDIA_TYPES = "image/*,video/mp4,video/webm,video/quicktime,.gif";

/** Aceita qualquer arquivo */
export const ACCEPTED_ANY_TYPES = "*/*";

export function isAcceptedFile(file: File): boolean {
  // Aceita qualquer arquivo (validação de tamanho ocorre no upload)
  return file.size > 0;
}

export function isAcceptedMediaFile(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}
