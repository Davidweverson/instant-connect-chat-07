// Modo "Não perturbe" — silencia notificações temporariamente
import { supabase } from "@/integrations/supabase/client";

export type DndPreset = "1h" | "8h" | "tomorrow" | "off";

export function computeDndUntil(preset: DndPreset): string | null {
  if (preset === "off") return null;
  const now = new Date();
  if (preset === "1h") {
    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }
  if (preset === "8h") {
    return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
  }
  // tomorrow morning 8am
  const t = new Date(now);
  t.setDate(t.getDate() + 1);
  t.setHours(8, 0, 0, 0);
  return t.toISOString();
}

export async function setDndUntil(userId: string, isoOrNull: string | null) {
  await supabase.from("profiles").update({ dnd_until: isoOrNull } as any).eq("id", userId);
}

export function isDndActive(profileDndUntil: string | null | undefined): boolean {
  if (!profileDndUntil) return false;
  return new Date(profileDndUntil) > new Date();
}

export function formatDndRemaining(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expirado";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const restMin = mins % 60;
  if (hours < 24) return `${hours}h${restMin > 0 ? ` ${restMin}m` : ""}`;
  return `${Math.floor(hours / 24)}d`;
}
