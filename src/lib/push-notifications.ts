// Push notification subscription manager
import { supabase } from "@/integrations/supabase/client";

// Public VAPID key (safe to expose)
export const VAPID_PUBLIC_KEY =
  "BFizf8Udh-44JrfVGyn0XsLipn94z3Gd-Br5aR12oPS68kUJJpqkoXaE5f8IkONhRKEcsJFJmlfvtLgcVdyw8hg";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !isInIframe() // SW não funciona no preview iframe
  );
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.error("[push] SW register failed", e);
    return null;
  }
}

export async function subscribeToPush(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (isInIframe()) return { ok: false, reason: "Push só funciona no app publicado, não no preview." };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "Seu navegador não suporta push." };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "Permissão negada." };

  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, reason: "Falha ao registrar service worker." };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    } catch (e: any) {
      console.error("[push] subscribe failed", e);
      return { ok: false, reason: e?.message || "Falha ao se inscrever." };
    }
  }

  const subJson = sub.toJSON();
  const { error } = await supabase
    .from("push_subscriptions" as any)
    .upsert(
      { user_id: userId, subscription: subJson as any, endpoint: sub.endpoint } as any,
      { onConflict: "user_id,endpoint" }
    );
  if (error) {
    console.error("[push] save subscription error", error);
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return true;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return true;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await supabase
      .from("push_subscriptions" as any)
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);
  }
  return true;
}

export async function isUserSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || isInIframe()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}
