import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { searchMessages, type SearchResult } from "@/lib/message-search";
import { formatMessageTimestamp } from "@/lib/format-timestamp";

interface MessageSearchModalProps {
  open: boolean;
  onClose: () => void;
  roomId?: string;
  onJump?: (messageId: string, roomId: string) => void;
}

export function MessageSearchModal({ open, onClose, roomId, onJump }: MessageSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const r = await searchMessages(query, roomId);
      setResults(r);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, open, roomId]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Buscar mensagens {roomId ? `neste canal` : `em todos os canais`}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite ao menos 2 caracteres..."
            className="w-full pl-9 pr-9 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {loading && (
            <p className="text-sm text-muted-foreground py-8 text-center">Buscando...</p>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum resultado</p>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onJump?.(r.id, r.room_id);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-primary">{r.sender}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatMessageTimestamp(new Date(r.created_at))} • #{r.room_id}
                  </span>
                </div>
                <p className="text-sm text-foreground line-clamp-2 break-words">{r.text}</p>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
