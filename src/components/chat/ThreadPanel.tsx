import { useEffect, useState } from "react";
import { X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatMessageTimestamp } from "@/lib/format-timestamp";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface ThreadMsg {
  id: string;
  sender: string;
  sender_id?: string;
  receiver_id?: string;
  room_id?: string;
  text: string | null;
  created_at: string;
}

interface Props {
  parentId: string;
  kind: "chat" | "dm";
  onClose: () => void;
}

/** Mostra todas as respostas (reply_to_id = parentId) e permite responder dentro da thread */
export function ThreadPanel({ parentId, kind, onClose }: Props) {
  const { user, profile } = useAuth();
  const [parent, setParent] = useState<ThreadMsg | null>(null);
  const [replies, setReplies] = useState<ThreadMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    const table = kind === "chat" ? "chat_messages" : "direct_messages";
    // Cada tabela tem colunas diferentes — selecionamos só o que existe em cada uma
    const parentSelect = kind === "chat"
      ? "id, text, created_at, sender, user_id, room_id"
      : "id, text, created_at, sender_id, receiver_id";
    const replySelect = parentSelect;

    (async () => {
      setLoading(true);
      const { data: p, error: pErr } = await supabase.from(table as any).select(parentSelect).eq("id", parentId).maybeSingle();
      if (pErr) console.error("thread parent fetch", pErr);
      const { data: r, error: rErr } = await supabase
        .from(table as any)
        .select(replySelect)
        .eq("reply_to_id", parentId)
        .order("created_at", { ascending: true });
      if (rErr) console.error("thread replies fetch", rErr);
      if (!alive) return;

      const norm = async (m: any): Promise<ThreadMsg> => {
        let senderName = m.sender || "usuário";
        const senderId = m.sender_id || m.user_id;
        if (!m.sender && senderId) {
          const { data: prof } = await supabase.from("profiles").select("username").eq("id", senderId).maybeSingle();
          if (prof?.username) senderName = prof.username;
        }
        return {
          id: m.id,
          sender: senderName,
          sender_id: senderId,
          receiver_id: m.receiver_id,
          room_id: m.room_id,
          text: m.text,
          created_at: m.created_at,
        };
      };

      const parentNorm = p ? await norm(p) : null;
      const repliesNorm = await Promise.all(((r as any[]) || []).map(norm));
      if (!alive) return;
      setParent(parentNorm);
      setReplies(repliesNorm);
      setLoading(false);
    })();

    const ch = supabase
      .channel(`thread-${parentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `reply_to_id=eq.${parentId}` },
        async (payload) => {
          const m = payload.new as any;
          let senderName = m.sender || "usuário";
          const senderId = m.sender_id || m.user_id;
          if (!m.sender && senderId) {
            const { data: prof } = await supabase.from("profiles").select("username").eq("id", senderId).maybeSingle();
            if (prof?.username) senderName = prof.username;
          }
          setReplies((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, {
            id: m.id, sender: senderName, sender_id: senderId, receiver_id: m.receiver_id, room_id: m.room_id, text: m.text, created_at: m.created_at,
          }]);
        }
      )
      .subscribe();

    return () => { alive = false; supabase.removeChannel(ch); };
  }, [parentId, kind]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !user || sending) return;
    setSending(true);
    try {
      if (kind === "chat") {
        const roomId = parent?.room_id;
        if (!roomId) throw new Error("Sala não encontrada");
        const { error } = await supabase.from("chat_messages").insert({
          room_id: roomId,
          user_id: user.id,
          sender: profile?.username || "usuário",
          text,
          reply_to_id: parentId,
        } as any);
        if (error) throw error;
      } else {
        const partnerId = parent?.sender_id === user.id ? parent?.receiver_id : parent?.sender_id;
        if (!partnerId) throw new Error("Conversa inválida");
        const { error } = await supabase.from("direct_messages").insert({
          sender_id: user.id,
          receiver_id: partnerId,
          text,
          reply_to_id: parentId,
        } as any);
        if (error) throw error;
      }
      setDraft("");
    } catch (e: any) {
      toast({ title: "Erro ao responder", description: e?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-background/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-card border-l border-border flex flex-col shadow-2xl animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground font-display">Thread</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full"><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {parent && (
            <div className="p-3 rounded-2xl bg-muted/50 border border-border">
              <p className="text-xs font-medium text-primary">{parent.sender}</p>
              <p className="text-sm text-foreground break-words whitespace-pre-wrap">{parent.text}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatMessageTimestamp(new Date(parent.created_at))}</p>
            </div>
          )}
          <div className="text-xs text-muted-foreground pl-2">{replies.length} {replies.length === 1 ? "resposta" : "respostas"}</div>
          {replies.map((r) => (
            <div key={r.id} className="p-3 rounded-2xl bg-background border border-border ml-4 animate-fade-in">
              <p className="text-xs font-medium text-foreground/80">{r.sender}</p>
              <p className="text-sm text-foreground break-words whitespace-pre-wrap">{r.text}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatMessageTimestamp(new Date(r.created_at))}</p>
            </div>
          ))}
          {!loading && replies.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Seja o primeiro a responder nesta thread.</p>
          )}
        </div>
        <div className="p-3 border-t border-border flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Responder na thread…"
            className="flex-1 px-4 py-2 rounded-full bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            disabled={sending || !user}
          />
          <Button onClick={handleSend} disabled={sending || !draft.trim() || !user} size="icon" className="rounded-full">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
