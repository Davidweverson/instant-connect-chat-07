import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Pencil, Trash2, Wallpaper as WallpaperIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  WALLPAPER_ACCEPT,
  deleteWallpaper,
  listWallpapers,
  setActiveWallpaper,
  signedUrl,
  type UserWallpaper,
} from "@/lib/wallpaper";
import type { EditorSource } from "./WallpaperEditor";

const WallpaperEditor = lazy(() => import("./WallpaperEditor"));

/** Informs (never blocks) when a wallpaper video looks heavy: above 1080p, high bitrate or very large file. */
function warnIfHeavyVideo(file: File) {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.preload = "metadata";
  v.muted = true;
  const done = () => URL.revokeObjectURL(url);
  v.onloadedmetadata = () => {
    const pixels = v.videoWidth * v.videoHeight;
    const duration = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    const mbps = duration ? (file.size * 8) / duration / 1_000_000 : 0;
    const heavy = pixels > 1920 * 1080 || mbps > 12 || file.size > 25 * 1024 * 1024;
    if (heavy) {
      const res = v.videoWidth && v.videoHeight ? ` (${v.videoWidth}×${v.videoHeight})` : "";
      toast.warning(`Este vídeo é pesado${res}`, {
        description:
          "Vídeos de wallpaper em qualidade muito alta podem deixar o site lento. O impacto depende do seu dispositivo e navegador. Para uma experiência mais fluida, prefira um vídeo com resolução mais moderada (até 1080p).",
        duration: 9000,
      });
    }
    done();
  };
  v.onerror = done;
  v.src = url;
}

export default function WallpaperSection({ userId }: { userId?: string }) {
  const [items, setItems] = useState<UserWallpaper[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorSource | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const rows = await listWallpapers(userId);
      setItems(rows);
      const entries = await Promise.all(
        rows.map(async (w) => [w.id, await signedUrl("wallpapers", w.media_url)] as const)
      );
      setPreviews(Object.fromEntries(entries));
    } catch {
      toast.error("Não foi possível carregar seus wallpapers");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!userId) return null;

  const handleFile = (file: File) => {
    const ok = WALLPAPER_ACCEPT.split(",").includes(file.type);
    if (!ok) {
      toast.error("Formato não suportado. Use JPG, PNG, WEBP, GIF, MP4 ou WEBM.");
      return;
    }
    if (file.type.startsWith("video/")) warnIfHeavyVideo(file);
    setEditor({ kind: "new", file });
  };

  const activate = async (w: UserWallpaper) => {
    try {
      await setActiveWallpaper(userId, w.is_active ? null : w.id);
      await refresh();
      toast.success(w.is_active ? "Wallpaper removido do fundo" : "Wallpaper aplicado");
    } catch {
      toast.error("Não foi possível aplicar o wallpaper");
    }
  };

  const remove = async (w: UserWallpaper) => {
    try {
      await deleteWallpaper(w);
      await refresh();
      toast.success("Wallpaper apagado");
    } catch {
      toast.error("Não foi possível apagar");
    }
  };

  return (
    <div className="py-2">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meus wallpapers</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Imagens, GIFs animados e vídeos curtos (MP4/WEBM) ficam salvos na sua conta.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-3.5 w-3.5" /> Adicionar
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={WALLPAPER_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-4 py-8 text-center">
          <WallpaperIcon className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-foreground">Nenhum wallpaper ainda</p>
          <p className="text-xs text-muted-foreground">Envie uma imagem, GIF ou vídeo e ajuste do seu jeito.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((w) => (
            <div
              key={w.id}
              className={`group relative overflow-hidden rounded-2xl border transition-all ${
                w.is_active ? "border-primary ring-2 ring-primary/40" : "border-border/60 hover:border-primary/50"
              }`}
            >
              <div className="aspect-video w-full bg-black/30">
                {previews[w.id] ? (
                  w.media_type === "video" ? (
                    <video src={previews[w.id]} className="h-full w-full object-cover" muted loop playsInline preload="metadata" />
                  ) : (
                    <img src={previews[w.id]} alt={w.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  )
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="truncate text-xs text-foreground">{w.name}</span>
                <div className="flex flex-shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => activate(w)}
                    title={w.is_active ? "Remover do fundo" : "Aplicar"}
                    className={`rounded-lg p-1.5 transition-colors ${
                      w.is_active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditor({ kind: "edit", wallpaper: w })}
                    title="Editar"
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(w)}
                    title="Apagar"
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editor && (
        <Suspense fallback={null}>
          <WallpaperEditor userId={userId} source={editor} onClose={() => setEditor(null)} onSaved={refresh} />
        </Suspense>
      )}
    </div>
  );
}
