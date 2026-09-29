// Notificações do navegador para mensagens recebidas em foreground/background
// (Push real, com aba fechada, é tratado pelo service worker via send-push)

import { isDndActive } from "@/lib/dnd";

let cachedDndUntil: string | null = null;
export function setNotifDnd(iso: string | null) {
  cachedDndUntil = iso;
}

export function isBrowserNotifSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotifPermission(): NotificationPermission | "unsupported" {
  if (!isBrowserNotifSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotifPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotifSupported()) return "denied";
  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

interface ShowOpts {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  icon?: string;
}

/** Mostra notificação se a aba não está visível (ou sempre se forceVisible=true). Respeita DND. */
export function showBrowserNotification(opts: ShowOpts, forceVisible = false) {
  try {
    if (!isBrowserNotifSupported()) return;
    if (Notification.permission !== "granted") return;
    if (isDndActive(cachedDndUntil)) return;
    // Por padrão só mostra se a aba está oculta — para não duplicar com a UI
    if (!forceVisible && document.visibilityState === "visible") return;

    const n = new Notification(opts.title, {
      body: opts.body.slice(0, 200),
      tag: opts.tag,
      icon: opts.icon || "/favicon.ico",
      badge: "/favicon.ico",
    });
    n.onclick = () => {
      window.focus();
      if (opts.url) {
        try {
          window.location.assign(opts.url);
        } catch {}
      }
      n.close();
    };
  } catch (e) {
    console.warn("[browser-notif] show failed", e);
  }
}
