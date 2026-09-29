import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Maximize,
  Move,
  RotateCcw,
  Sticker as StickerIcon,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  DEFAULT_TRANSFORM,
  STICKER_ACCEPT,
  createWallpaper,
  detectMediaType,
  signedUrl,
  updateWallpaper,
  uploadStickerFile,
  uploadWallpaperFile,
  type UserWallpaper,
  type WallpaperMediaType,
  type WallpaperSticker,
  type WallpaperTransform,
} from "@/lib/wallpaper";

export type EditorSource =
  | { kind: "new"; file: File }
  | { kind: "edit"; wallpaper: UserWallpaper };

interface Props {
  userId: string;
  source: EditorSource;
  onClose: () => void;
  onSaved: () => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function WallpaperEditor({ userId, source, onClose, onSaved }: Props) {
  const isEdit = source.kind === "edit";
  const [name, setName] = useState(
    isEdit ? source.wallpaper.name : source.file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Wallpaper"
  );
  const [transform, setTransform] = useState<WallpaperTransform>(
    isEdit ? source.wallpaper.transform : { ...DEFAULT_TRANSFORM }
  );
  const [stickers, setStickers] = useState<WallpaperSticker[]>(isEdit ? source.wallpaper.stickers : []);
  const [stickerUrls, setStickerUrls] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingSticker, setUploadingSticker] = useState(false);

  const mediaType: WallpaperMediaType = isEdit ? source.wallpaper.media_type : detectMediaType(source.file);
  const stageRef = useRef<HTMLDivElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);

  // Resolve the media preview URL
  useEffect(() => {
    let revoke: string | null = null;
    if (source.kind === "new") {
      revoke = URL.createObjectURL(source.file);
      setMediaUrl(revoke);
    } else {
      signedUrl("wallpapers", source.wallpaper.media_url).then(setMediaUrl);
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [source]);

  // Resolve sticker URLs
  useEffect(() => {
    stickers.forEach((s) => {
      if (stickerUrls[s.path]) return;
      signedUrl("stickers", s.path).then((url) => {
        if (url) setStickerUrls((p) => ({ ...p, [s.path]: url }));
      });
    });
  }, [stickers, stickerUrls]);

  const deviceRatio = useMemo(() => window.innerWidth / window.innerHeight, []);

  const patchTransform = useCallback((p: Partial<WallpaperTransform>) => {
    setTransform((prev) => ({ ...prev, ...p }));
  }, []);

  const applyAutoFit = () => {
    patchTransform({ mode: "auto", zoom: 1, offsetX: 0, offsetY: 0 });
    toast.success("Ajuste automático aplicado para a resolução da sua tela");
  };

  /* ---------------- media pan & zoom ---------------- */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const dragging = useRef(false);

  const onStagePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).dataset.sticker) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) dragging.current = true;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: transform.zoom };
    }
    setSelected(null);
  };

  const onStagePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const next = clamp((pinchStart.current.zoom * dist) / pinchStart.current.dist, 1, 4);
      setTransform((t) => ({ ...t, mode: "manual", zoom: next }));
      return;
    }
    if (!dragging.current) return;
    const dx = (e.clientX - prev.x) / rect.width;
    const dy = (e.clientY - prev.y) / rect.height;
    setTransform((t) => {
      const limit = Math.max(0, (t.zoom - 1) / 2);
      return {
        ...t,
        mode: "manual",
        offsetX: clamp(t.offsetX + dx, -limit, limit),
        offsetY: clamp(t.offsetY + dy, -limit, limit),
      };
    });
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) dragging.current = false;
  };

  // Non-passive wheel listener so page scroll never steals the zoom
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    setTransform((t) => ({ ...t, mode: "manual", zoom: clamp(t.zoom * Math.exp(-dy * 0.0015), 1, 4) }));
  };
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  /* ---------------- stickers ---------------- */
  const addSticker = async (file: File) => {
    setUploadingSticker(true);
    try {
      const path = await uploadStickerFile(file, userId);
      const url = await signedUrl("stickers", path);
      setStickerUrls((p) => ({ ...p, [path]: url }));
      const sticker: WallpaperSticker = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        path,
        x: 0.5,
        y: 0.5,
        scale: 0.25,
        rotation: 0,
        opacity: 1,
        z: stickers.length,
      };
      setStickers((prev) => [...prev, sticker]);
      setSelected(sticker.id);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível enviar a figurinha");
    } finally {
      setUploadingSticker(false);
    }
  };

  const patchSticker = (id: string, p: Partial<WallpaperSticker>) =>
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)));

  const stickerDrag = useRef<{ id: string } | null>(null);
  const onStickerPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    stickerDrag.current = { id };
    setSelected(id);
  };
  const onStickerPointerMove = (e: React.PointerEvent) => {
    if (!stickerDrag.current) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    patchSticker(stickerDrag.current.id, {
      x: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((e.clientY - rect.top) / rect.height, 0, 1),
    });
  };
  const onStickerPointerUp = () => {
    stickerDrag.current = null;
  };

  const moveLayer = (id: string, dir: 1 | -1) => {
    setStickers((prev) => {
      const sorted = [...prev].sort((a, b) => a.z - b.z);
      const i = sorted.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return prev;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      return sorted.map((s, idx) => ({ ...s, z: idx }));
    });
  };

  const selectedSticker = stickers.find((s) => s.id === selected) || null;

  /* ---------------- save ---------------- */
  const handleSave = async () => {
    setSaving(true);
    try {
      if (source.kind === "new") {
        const { path, type } = await uploadWallpaperFile(source.file, userId);
        await createWallpaper({
          userId,
          name: name.trim() || "Wallpaper",
          path,
          mediaType: type,
          transform,
          stickers,
          activate: true,
        });
      } else {
        await updateWallpaper(source.wallpaper.id, {
          name: name.trim() || "Wallpaper",
          transform,
          stickers,
          is_active: true,
        });
      }
      toast.success("Wallpaper salvo e aplicado");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível salvar o wallpaper");
    } finally {
      setSaving(false);
    }
  };

  const mediaStyle: React.CSSProperties = {
    transform: `translate3d(${transform.offsetX * 100}%, ${transform.offsetY * 100}%, 0) scale(${transform.zoom})`,
    filter: transform.blur > 0 ? `blur(${transform.blur}px)` : undefined,
    willChange: "transform",
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/70 p-3 backdrop-blur-xl animate-fade-in">
      <div className="glass-panel flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border/60 shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">Editor de wallpaper</h2>
            <p className="text-xs text-muted-foreground">Arraste para mover • role ou pince para dar zoom</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[1.35fr_1fr]">
          {/* Stage */}
          <div
            ref={stageRef}
            onPointerDown={onStagePointerDown}
            onPointerMove={(e) => {
              onStagePointerMove(e);
              onStickerPointerMove(e);
            }}
            onPointerUp={(e) => {
              endPointer(e);
              onStickerPointerUp();
            }}
            onPointerCancel={(e) => {
              endPointer(e);
              onStickerPointerUp();
            }}
            className="relative select-none overflow-hidden rounded-2xl border border-border/60 bg-black/40 touch-none"
            style={{ aspectRatio: String(deviceRatio) }}
          >
            {mediaUrl ? (
              mediaType === "video" ? (
                <video
                  src={mediaUrl}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={mediaStyle}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Pré-visualização do wallpaper"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={mediaStyle}
                  draggable={false}
                />
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {transform.dim > 0 && (
              <div className="pointer-events-none absolute inset-0 bg-background" style={{ opacity: transform.dim }} />
            )}

            {[...stickers]
              .sort((a, b) => a.z - b.z)
              .map((s) => (
                <img
                  key={s.id}
                  data-sticker="1"
                  src={stickerUrls[s.path] || ""}
                  alt="Figurinha"
                  onPointerDown={(e) => onStickerPointerDown(e, s.id)}
                  className={`absolute cursor-move rounded-md ${selected === s.id ? "ring-2 ring-primary" : ""}`}
                  style={{
                    left: `${s.x * 100}%`,
                    top: `${s.y * 100}%`,
                    width: `${s.scale * 100}%`,
                    opacity: s.opacity,
                    transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                    touchAction: "none",
                  }}
                  draggable={false}
                />
              ))}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</label>
              <input
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={transform.mode === "auto" ? "default" : "secondary"}
                onClick={applyAutoFit}
                className="flex-1 gap-1.5"
              >
                <Maximize className="h-3.5 w-3.5" /> Automático
              </Button>
              <Button
                type="button"
                size="sm"
                variant={transform.mode === "manual" ? "default" : "secondary"}
                onClick={() => patchTransform({ mode: "manual" })}
                className="flex-1 gap-1.5"
              >
                <Move className="h-3.5 w-3.5" /> Manual
              </Button>
            </div>

            <ControlSlider
              label="Zoom"
              value={transform.zoom}
              min={1}
              max={4}
              step={0.01}
              format={(v) => `${v.toFixed(2)}x`}
              onChange={(v) => patchTransform({ mode: "manual", zoom: v })}
            />
            <ControlSlider
              label="Desfoque"
              value={transform.blur}
              min={0}
              max={24}
              step={1}
              format={(v) => `${v}px`}
              onChange={(v) => patchTransform({ blur: v })}
            />
            <ControlSlider
              label="Escurecer"
              value={transform.dim}
              min={0}
              max={0.85}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => patchTransform({ dim: v })}
            />

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs"
              onClick={() => patchTransform({ zoom: 1, offsetX: 0, offsetY: 0 })}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Redefinir enquadramento
            </Button>

            <div className="border-t border-border/50 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Figurinhas</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  disabled={uploadingSticker}
                  onClick={() => stickerInputRef.current?.click()}
                >
                  {uploadingSticker ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StickerIcon className="h-3.5 w-3.5" />}
                  Adicionar
                </Button>
                <input
                  ref={stickerInputRef}
                  type="file"
                  accept={STICKER_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) addSticker(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {stickers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Envie PNG, WEBP, GIF ou SVG e posicione livremente sobre o wallpaper.
                </p>
              )}

              {selectedSticker && (
                <div className="mt-3 space-y-3 rounded-2xl border border-border/60 bg-secondary/30 p-3">
                  <ControlSlider
                    label="Tamanho"
                    value={selectedSticker.scale}
                    min={0.05}
                    max={1}
                    step={0.01}
                    format={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => patchSticker(selectedSticker.id, { scale: v })}
                  />
                  <ControlSlider
                    label="Rotação"
                    value={selectedSticker.rotation}
                    min={-180}
                    max={180}
                    step={1}
                    format={(v) => `${Math.round(v)}°`}
                    onChange={(v) => patchSticker(selectedSticker.id, { rotation: v })}
                  />
                  <ControlSlider
                    label="Opacidade"
                    value={selectedSticker.opacity}
                    min={0.05}
                    max={1}
                    step={0.01}
                    format={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => patchSticker(selectedSticker.id, { opacity: v })}
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={() => moveLayer(selectedSticker.id, 1)}>
                      <ArrowUp className="h-3.5 w-3.5" /> Frente
                    </Button>
                    <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={() => moveLayer(selectedSticker.id, -1)}>
                      <ArrowDown className="h-3.5 w-3.5" /> Trás
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="ml-auto gap-1"
                      onClick={() => {
                        setStickers((prev) => prev.filter((s) => s.id !== selectedSticker.id));
                        setSelected(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border/50 px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !mediaUrl} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Salvar e aplicar
          </Button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

function ControlSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{format(value)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
