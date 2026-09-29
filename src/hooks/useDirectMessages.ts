import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playMessageSound } from "@/lib/notification-sounds";
import { uploadAttachment, type AttachmentData, type PendingAttachment } from "@/lib/image-utils";
import { toast } from "@/hooks/use-toast";
import { recordMentions } from "@/lib/mentions";
import { showBrowserNotification } from "@/lib/browser-notifications";

export interface DMAttachment {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  fileName: string;
  size: number;
  mimeType?: string;
  kind?: string;
}

export interface DMReplyInfo {
  id: string;
  senderName: string;
  text: string | null;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string | null;
  imageUrl: string | null;
  timestamp: Date;
  attachments: DMAttachment[];
  replyTo: DMReplyInfo | null;
  isEdited?: boolean;
  editedAt?: Date | null;
  isPinned?: boolean;
}

async function loadAttachments(messageId: string): Promise<DMAttachment[]> {
  const { data } = await supabase
    .from("message_attachments")
    .select("*")
    .eq("message_id", messageId)
    .eq("message_type", "dm");
  if (!data) return [];
  return data.map((a: any) => ({
    url: a.url,
    thumbnailUrl: a.thumbnail_url || a.url,
    width: a.width || 0,
    height: a.height || 0,
    fileName: a.file_name || "",
    size: a.size || 0,
    mimeType: a.mime_type,
    kind: a.kind,
  }));
}

async function loadDMReplyInfo(replyToId: string | null, senderNameMap: Map<string, string>): Promise<DMReplyInfo | null> {
  if (!replyToId) return null;
  const { data } = await supabase
    .from("direct_messages")
    .select("id, sender_id, text")
    .eq("id", replyToId)
    .single();
  if (!data) return null;
  const senderName = senderNameMap.get(data.sender_id) || "...";
  return { id: data.id, senderName, text: data.text };
}

export function useDirectMessages(userId: string, friendId: string | null, friendUsername?: string, currentUsername?: string) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const friendIdRef = useRef(friendId);

  useEffect(() => {
    friendIdRef.current = friendId;
  }, [friendId]);

  const buildNameMap = useCallback((): Map<string, string> => {
    const map = new Map<string, string>();
    map.set(userId, "Você");
    if (friendId && friendUsername) map.set(friendId, friendUsername);
    return map;
  }, [userId, friendId, friendUsername]);

  const loadMessages = useCallback(async () => {
    if (!userId || !friendId) {
      setMessages([]);
      return;
    }

    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      const nameMap = buildNameMap();
      const msgs = await Promise.all(
        data.map(async (m: any) => {
          const attachments = await loadAttachments(m.id);
          const replyTo = await loadDMReplyInfo(m.reply_to_id, nameMap);
          return {
            id: m.id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            text: m.text,
            imageUrl: m.image_url,
            timestamp: new Date(m.created_at),
            attachments,
            replyTo,
            isEdited: !!m.is_edited,
            editedAt: m.edited_at ? new Date(m.edited_at) : null,
            isPinned: !!m.is_pinned,
          };
        })
      );
      setMessages(msgs.reverse());
    }
  }, [userId, friendId, buildNameMap]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!userId || !friendId) return;

    const channel = supabase
      .channel(`dm-${[userId, friendId].sort().join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        async (payload) => {
          const m = payload.new as any;
          const currentFriend = friendIdRef.current;
          if (
            (m.sender_id === userId && m.receiver_id === currentFriend) ||
            (m.sender_id === currentFriend && m.receiver_id === userId)
          ) {
            const isOwnMessage = m.sender_id === userId;
            const attachments = await loadAttachments(m.id);
            const nameMap = buildNameMap();
            const replyTo = await loadDMReplyInfo(m.reply_to_id, nameMap);
            setMessages((prev) => {
              if (prev.some((msg) => msg.id === m.id)) return prev;
              return [
                ...prev,
                {
                  id: m.id,
                  senderId: m.sender_id,
                  receiverId: m.receiver_id,
                  text: m.text,
                  imageUrl: m.image_url,
                  timestamp: new Date(m.created_at),
                  attachments,
                  replyTo,
                  isEdited: !!m.is_edited,
                  editedAt: m.edited_at ? new Date(m.edited_at) : null,
                  isPinned: !!m.is_pinned,
                },
              ];
            });
            if (!isOwnMessage) {
              playMessageSound();
              showBrowserNotification({
                title: `Mensagem de ${friendUsername || "alguém"}`,
                body: m.text || "📎 Anexo",
                tag: `dm-${m.sender_id}`,
                url: "/",
              });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as any;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === m.id
                ? {
                    ...msg,
                    text: m.text,
                    isEdited: !!m.is_edited,
                    editedAt: m.edited_at ? new Date(m.edited_at) : null,
                    isPinned: !!m.is_pinned,
                  }
                : msg
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "direct_messages" },
        (payload) => {
          const deleted = payload.old as any;
          setMessages((prev) => prev.filter((msg) => msg.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, friendId, buildNameMap]);

  const sendMessage = useCallback(
    async (text?: string, pendingAttachments?: PendingAttachment[], replyToId?: string) => {
      if (!friendId) return;

      let attachmentData: AttachmentData[] = [];
      let imageUrl: string | null = null;

      if (pendingAttachments && pendingAttachments.length > 0) {
        setUploading(true);
        setUploadProgress(0);
        try {
          const total = pendingAttachments.length;
          for (let i = 0; i < total; i++) {
            const att = await uploadAttachment(
              pendingAttachments[i].file,
              "dm-images",
              userId,
              (pct) => setUploadProgress(((i / total) + (pct / 100) / total) * 100)
            );
            attachmentData.push(att);
          }
        } catch (err: any) {
          console.error("Upload failed:", err);
          toast({ title: "Falha no upload", description: err?.message || "Tente novamente.", variant: "destructive" });
          setUploading(false);
          setUploadProgress(null);
          return;
        }
      }

      const { data: msgData, error: msgErr } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: userId,
          receiver_id: friendId,
          text: text || null,
          image_url: imageUrl,
          reply_to_id: replyToId || null,
        } as any)
        .select("id")
        .single();

      if (msgErr) {
        const raw = msgErr.message || "";
        let title = "Erro ao enviar";
        let description = "Tente novamente.";
        if (raw.includes("BANNED_WORD")) { title = "Palavra proibida"; description = "Sua mensagem contém uma palavra não permitida."; }
        toast({ title, description, variant: "destructive" });
        setUploading(false);
        setUploadProgress(null);
        return;
      }

      if (msgData && attachmentData.length > 0) {
        await supabase.from("message_attachments").insert(
          attachmentData.map((a) => ({
            message_id: msgData.id,
            message_type: "dm",
            url: a.url,
            thumbnail_url: a.thumbnailUrl,
            width: a.width,
            height: a.height,
            file_name: a.fileName,
            size: a.size,
            mime_type: a.mimeType,
            kind: a.kind || "image",
          }))
        );
      }

      // Push para o destinatário
      if (msgData) {
        const body = text || "📎 Anexo";
        supabase.functions
          .invoke("send-push", {
            body: {
              type: "dm",
              recipientUserIds: [friendId],
              senderId: userId,
              senderName: currentUsername || "Alguém",
              body,
              url: "/",
            },
          })
          .catch((e) => console.warn("[push] dm invoke failed", e));

        // Menções (caso o usuário se mencione no DM, geralmente não)
        if (text && currentUsername) {
          recordMentions({
            text,
            fromUserId: userId,
            fromUsername: currentUsername,
            messageId: msgData.id,
            messageKind: "dm",
            conversationUserId: friendId,
            preview: text,
          }).catch(() => {});
        }
      }

      setUploading(false);
      setUploadProgress(null);
    },
    [userId, friendId, currentUsername]
  );

  const deleteMessage = useCallback(async (messageId: string) => {
    await supabase.from("direct_messages").delete().eq("id", messageId);
  }, []);

  const editMessage = useCallback(async (messageId: string, newText: string) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const { error } = await supabase
      .from("direct_messages")
      .update({ text: trimmed, is_edited: true, edited_at: new Date().toISOString() } as any)
      .eq("id", messageId);
    if (error) {
      toast({
        title: "Não foi possível editar",
        description: "Você só pode editar nos primeiros 5 minutos.",
        variant: "destructive",
      });
    }
  }, []);

  const togglePin = useCallback(async (messageId: string, currentlyPinned: boolean) => {
    const { error } = await supabase
      .from("direct_messages")
      .update({
        is_pinned: !currentlyPinned,
        pinned_at: !currentlyPinned ? new Date().toISOString() : null,
      } as any)
      .eq("id", messageId);
    if (error) {
      toast({ title: "Não foi possível fixar", variant: "destructive" });
    }
  }, []);

  const sendRawMessage = useCallback(
    async (text: string, uploaded: AttachmentData[], replyToId?: string) => {
      if (!friendId) return;
      const { data: msgData, error } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: userId,
          receiver_id: friendId,
          text: text || null,
          reply_to_id: replyToId || null,
        } as any)
        .select("id")
        .single();
      if (error) {
        toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
        return;
      }
      if (msgData && uploaded.length > 0) {
        await supabase.from("message_attachments").insert(
          uploaded.map((a) => ({
            message_id: msgData.id,
            message_type: "dm",
            url: a.url,
            thumbnail_url: a.thumbnailUrl,
            width: a.width,
            height: a.height,
            file_name: a.fileName,
            size: a.size,
            mime_type: a.mimeType,
            kind: a.kind || "file",
          }))
        );
      }
    },
    [userId, friendId]
  );

  return { messages, sendMessage, sendRawMessage, deleteMessage, editMessage, togglePin, uploading, uploadProgress };
}
