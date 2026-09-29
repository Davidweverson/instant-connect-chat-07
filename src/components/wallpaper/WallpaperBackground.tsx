import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  WALLPAPER_CHANGED_EVENT,
  getActiveWallpaper,
  signedUrl,
  type UserWallpaper,
} from "@/lib/wallpaper";

/**
 * Renders the user's active custom wallpaper behind everything else.
 * Videos autoplay muted in loop and pause whenever the tab is not visible.
 */
export function WallpaperBackground() {
  const { user } = useAuth();
  const [wallpaper, setWallpaper] = useState<UserWallpaper | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [stickerUrls, setStickerUrls] = useState<Record<string, string>>({});
  const videoRef = useRef<HTMLVideoElement>(null);

  const load = useMemo(
    () => async (uid: string) => {
      const w = await getActiveWallpaper(uid);
      setWallpaper(w);
      if (!w) {
        setMediaUrl("");
        return;
      }
      setMediaUrl(await signedUrl("wallpapers", w.media_url));
      const entries = await Promise.all(
        w.stickers.map(async (s) => [s.path, await signedUrl("stickers", s.path)] as const)
      );
      setStickerUrls(Object.fromEntries(entries));
    },
    []
  );

  useEffect(() => {
    if (!user?.id) {
      setWallpaper(null);
      setMediaUrl("");
      return;
    }
    load(user.id);
    const handler = () => load(user.id);
    window.addEventListener(WALLPAPER_CHANGED_EVENT, handler);
    return () => window.removeEventListener(WALLPAPER_CHANGED_EVENT, handler);
  }, [user?.id, load]);

  // Pause offscreen/hidden videos to save battery and GPU
  useEffect(() => {
    const onVisibility = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [mediaUrl]);

  if (!wallpaper || !mediaUrl) return null;

  const t = wallpaper.transform;
  const mediaStyle: React.CSSProperties = {
    transform: `translate3d(${t.offsetX * 100}%, ${t.offsetY * 100}%, 0) scale(${t.zoom})`,
    filter: t.blur > 0 ? `blur(${t.blur}px)` : undefined,
    willChange: "transform",
    backfaceVisibility: "hidden",
  };

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {wallpaper.media_type === "video" ? (
        <video
          ref={videoRef}
          src={mediaUrl}
          className="absolute inset-0 h-full w-full object-cover"
          style={mediaStyle}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
      ) : (
        <img
          src={mediaUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={mediaStyle}
        />
      )}

      {t.dim > 0 && <div className="absolute inset-0 bg-background" style={{ opacity: t.dim }} />}

      {[...wallpaper.stickers]
        .sort((a, b) => a.z - b.z)
        .map((s) => (
          <img
            key={s.id}
            src={stickerUrls[s.path] || ""}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute"
            style={{
              left: `${s.x * 100}%`,
              top: `${s.y * 100}%`,
              width: `${s.scale * 100}%`,
              opacity: s.opacity,
              transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
            }}
          />
        ))}
    </div>
  );
}

export default WallpaperBackground;
