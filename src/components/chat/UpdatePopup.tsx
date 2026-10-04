import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Megaphone } from "lucide-react";
import type { AppNotification } from "@/hooks/useNotifications";

interface UpdatePopupProps {
  notification: AppNotification | null;
  onDismiss: () => void;
  onOpenChangelog: () => void;
}

export function UpdatePopup({ notification, onDismiss, onOpenChangelog }: UpdatePopupProps) {
  if (!notification) return null;

  return (
    <Dialog open={!!notification} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">{notification.title}</h2>
          {notification.image_url && (
            <img src={notification.image_url} alt="" className="rounded-lg max-h-48 object-cover w-full" loading="lazy" />
          )}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notification.content}</p>
          <div className="flex gap-2 w-full mt-2">
            <button
              onClick={onDismiss}
              className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={() => { onDismiss(); onOpenChangelog(); }}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all"
            >
              Ver novidades
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
