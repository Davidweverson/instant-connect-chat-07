// Listener global para DMs recebidas — dispara som + notificação mesmo
// quando a conversa específica não está aberta.
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playMessageSound } from "@/lib/notification-sounds";
import { showBrowserNotification } from "@/lib/browser-notifications";

export function useGlobalDmNotifications(userId: string, activeFriendId: string | null) {
  const [unreadByFriend, setUnreadByFriend] = useState<Record<string, number>>({});
  const activeRef = useRef<string | null>(activeFriendId);
  useEffect(() => {
    activeRef.current = activeFriendId;
    if (activeFriendId) {
      setUnreadByFriend((prev) => {
        if (!prev[activeFriendId]) return prev;
        const n = { ...prev };
        delete n[activeFriendId];
        return n;
      });
    }
  }, [activeFriendId]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`dm-global-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `receiver_id=eq.${userId}` },
        async (payload) => {
          const m = payload.new as any;
          if (m.sender_id === userId) return;
          // se a conversa está aberta, deixa o useDirectMessages cuidar
          if (activeRef.current === m.sender_id) return;
          setUnreadByFriend((prev) => ({ ...prev, [m.sender_id]: (prev[m.sender_id] || 0) + 1 }));
          playMessageSound();
          // resolve nome do remetente
          const { data: prof } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", m.sender_id)
            .maybeSingle();
          showBrowserNotification({
            title: `Mensagem de ${prof?.username || "alguém"}`,
            body: m.text || "📎 Anexo",
            tag: `dm-${m.sender_id}`,
            url: "/",
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  return { unreadByFriend };
}
