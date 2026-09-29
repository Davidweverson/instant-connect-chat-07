// Painel "menções" no sidebar — mostra menções recebidas, navega ao clicar
import { AtSign, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMessageTimestamp } from "@/lib/format-timestamp";
import type { MentionEntry } from "@/hooks/useMentions";

interface MentionsPanelProps {
  open: boolean;
  onClose: () => void;
  mentions: MentionEntry[];
  onMarkAllRead: () => void;
  onJump: (m: MentionEntry) => void;
}

export function MentionsPanel({ open, onClose, mentions, onMarkAllRead, onJump }: MentionsPanelProps) {
  const unread = mentions.filter((m) => !m.is_read);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AtSign className="w-4 h-4 text-primary" />
            Menções
            {unread.length > 0 && (
              <button
                onClick={onMarkAllRead}
                className="ml-auto text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded hover:bg-muted"
              >
                <Check className="w-3 h-3" />
                Marcar todas como lidas
              </button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-6 px-6 space-y-1">
          {mentions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhuma menção ainda. Quando alguém te marcar com @, aparece aqui!
            </p>
          )}
          <AnimatePresence initial={false}>
            {mentions.map((m) => (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => onJump(m)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  m.is_read
                    ? "border-border bg-secondary/30 hover:bg-secondary/60"
                    : "border-primary/40 bg-primary/5 hover:bg-primary/10"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-primary truncate">
                    @{m.mentioned_by_username}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatMessageTimestamp(new Date(m.created_at))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                  {m.preview || "(sem texto)"}
                </p>
                <p className="text-[10px] mt-1 text-muted-foreground/70">
                  {m.message_kind === "dm"
                    ? "Mensagem direta"
                    : `em #${m.room_id || "chat"}`}
                </p>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
