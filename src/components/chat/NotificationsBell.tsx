import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, Megaphone } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationsBellProps {
  userId: string;
  onOpenChangelog: () => void;
}

const typeLabels: Record<string, string> = {
  atualizacao: "Atualização",
  manutencao: "Manutenção",
  evento: "Evento",
  informacao: "Informação",
};

const typeStyles: Record<string, string> = {
  atualizacao: "bg-primary/20 text-primary",
  manutencao: "bg-orange-500/20 text-orange-400",
  evento: "bg-green-500/20 text-green-400",
  informacao: "bg-blue-500/20 text-blue-400",
};

export function NotificationsBell({ userId, onOpenChangelog }: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, readIds, unreadCount, markRead, markAllRead } = useNotifications(userId);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Notificações"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-11 left-0 w-80 max-w-[85vw] glass-panel border border-glass-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Notificações</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma notificação por aqui.</p>
            )}
            {notifications.map((n) => {
              const isRead = readIds.has(n.id);
              return (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/50 last:border-0 transition-colors hover:bg-muted/50 ${!isRead ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${typeStyles[n.type] || typeStyles.informacao}`}>
                      {typeLabels[n.type] || "Informação"}
                    </span>
                    {n.is_important && <span className="text-[10px] text-destructive font-semibold">Importante</span>}
                    {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-auto flex-shrink-0" />}
                  </div>
                  <p className={`text-sm ${isRead ? "text-muted-foreground" : "text-foreground font-medium"}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.content}</p>
                  {n.published_at && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {new Date(n.published_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => { setOpen(false); onOpenChangelog(); }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors border-t border-border"
          >
            <Megaphone className="w-3.5 h-3.5" />
            Ver novidades (changelog)
          </button>
        </div>
      )}
    </div>
  );
}
