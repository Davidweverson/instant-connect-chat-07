import { useMemo } from "react";
import { Package, Check } from "lucide-react";
import { useFlashForge, type FlashPack } from "@/lib/flashforge/context";
import { toast } from "sonner";

export const FLASHPACK_PREFIX = "flashpack::";

export function isFlashPackMessage(text: string): boolean {
  return typeof text === "string" && text.trim().startsWith(FLASHPACK_PREFIX);
}

export function encodeFlashPack(pack: FlashPack): string {
  return FLASHPACK_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(pack))));
}

export function decodeFlashPack(text: string): FlashPack | null {
  try {
    const raw = text.trim().slice(FLASHPACK_PREFIX.length);
    return JSON.parse(decodeURIComponent(escape(atob(raw)))) as FlashPack;
  } catch {
    return null;
  }
}

export function FlashPackCard({ text }: { text: string }) {
  const pack = useMemo(() => decodeFlashPack(text), [text]);
  const { importPack } = useFlashForge();

  if (!pack) return <p className="text-xs text-muted-foreground italic">Flash Pack inválido</p>;

  const colors = ["primary", "accent", "secondary", "chatOwn"]
    .map((k) => String(pack.config?.[k] || ""))
    .filter(Boolean);

  return (
    <div className="glass-panel rounded-2xl p-3 min-w-[220px] max-w-[280px]">
      <div className="flex items-center gap-2 mb-2">
        <Package className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold truncate">{pack.name || "Flash Pack"}</span>
      </div>
      <div className="flex gap-1 mb-3">
        {(colors.length ? colors : ["190 80% 50%"]).map((hsl, i) => (
          <span key={i} className="w-6 h-6 rounded-md border border-border" style={{ background: `hsl(${hsl})` }} />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">
        {Object.keys(pack.config || {}).length} ajustes · {pack.customFonts?.length || 0} fontes
      </p>
      <button
        onClick={() => {
          try {
            importPack(pack);
            toast.success("Flash Pack aplicado!");
          } catch {
            toast.error("Não foi possível aplicar este Flash Pack");
          }
        }}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        <Check className="w-3.5 h-3.5" /> Aplicar
      </button>
    </div>
  );
}
