// Cache global das fontes de nome escolhidas pelos usuários.
// Permite que qualquer superfície (chat, DM, grupos) renderize o nome
// com a fonte personalizada do perfil sem alterar todos os stores.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getFontStack } from "@/lib/fonts";

const cache = new Map<string, string | null>();
const listeners = new Set<() => void>();
let queue = new Set<string>();
let timer: number | null = null;

function notify() {
  listeners.forEach((l) => l());
}

async function flush() {
  timer = null;
  const ids = Array.from(queue);
  queue = new Set();
  if (!ids.length) return;
  const { data } = await supabase.from("profiles").select("id, name_font").in("id", ids);
  ids.forEach((id) => cache.set(id, null));
  (data || []).forEach((p: { id: string; name_font: string | null }) => cache.set(p.id, p.name_font));
  notify();
}

function request(userId: string) {
  if (cache.has(userId) || queue.has(userId)) return;
  queue.add(userId);
  if (timer === null) timer = window.setTimeout(flush, 80);
}

/** Marca uma fonte já conhecida (evita fetch extra). */
export function primeNameFont(userId: string, font: string | null) {
  cache.set(userId, font);
  notify();
}

/** Retorna o style pronto com a fonte do nome do usuário. */
export function useNameFont(userId: string | null | undefined): React.CSSProperties {
  const [, force] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    request(userId);
    return () => { listeners.delete(listener); };
  }, [userId]);

  if (!userId) return {};
  const stack = getFontStack(cache.get(userId));
  return stack ? { fontFamily: stack } : {};
}
