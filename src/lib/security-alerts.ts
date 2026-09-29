import { supabase } from "@/integrations/supabase/client";

const DEVICE_KEY = "fc_device_id";

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/**
 * Verifica se este dispositivo é novo para o usuário e registra o login.
 * Retorna true se for um novo dispositivo (para mostrar alerta).
 */
export async function recordLoginAndCheckNewDevice(userId: string): Promise<boolean> {
  try {
    const deviceId = getOrCreateDeviceId();
    const { data: existing } = await supabase
      .from("login_activity" as any)
      .select("id")
      .eq("user_id", userId)
      .eq("device_id", deviceId)
      .limit(1);
    const isNew = !existing || existing.length === 0;
    await supabase.from("login_activity" as any).insert({
      user_id: userId,
      device_id: deviceId,
      user_agent: navigator.userAgent.slice(0, 200),
    } as any);
    return isNew;
  } catch (e) {
    console.warn("[security] login check failed", e);
    return false;
  }
}

export interface LoginRecord {
  id: string;
  device_id: string;
  user_agent: string | null;
  created_at: string;
}

export async function fetchLoginHistory(userId: string): Promise<LoginRecord[]> {
  const { data } = await supabase
    .from("login_activity" as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data as any) || [];
}

export function getCurrentDeviceId(): string {
  return getOrCreateDeviceId();
}
