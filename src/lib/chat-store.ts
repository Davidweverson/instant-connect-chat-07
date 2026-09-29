import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playMessageSound } from "@/lib/notification-sounds";
import { uploadAttachment, type AttachmentData, type PendingAttachment } from "@/lib/image-utils";
import { toast } from "@/hooks/use-toast";
import { recordMentions } from "@/lib/mentions";
import { showBrowserNotification } from "@/lib/browser-notifications";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface MessageAttachment {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  fileName: string;
  size: number;
  mimeType?: string;
  kind?: string;
}

export interface ReplyInfo {
  id: string;
  sender: string;
  text: string;
}

export interface Message {
  id: string;
  text: string;
  sender: string;
  senderId: string;
  senderAvatar: string | null;
  timestamp: Date;
  roomId: string;
  attachments: MessageAttachment[];
  replyTo: ReplyInfo | null;
  isEdited?: boolean;
  editedAt?: Date | null;
  isPinned?: boolean;
}

export interface Room {
  id: string;
  name: string;
  emoji: string;
  is_readonly: boolean;
}

// Fallback rooms used before DB loads
export const ROOMS: Room[] = [
  { id: "geral", name: "​Bate-Papo", emoji: "💬", is_readonly: false },
  { id: "jogos", name: "​Métodos/Sites", emoji: "​📁", is_readonly: true },
  { id: "musica", name: "​Sobre escola", emoji: "​🏫", is_readonly: false },
  { id: "random", name: "​Caos/Zoeira", emoji: "​🔥", is_readonly: false },
  { id: "tecnologia", name: "​Atualizações", emoji: "​📢", is_readonly: true },
];

const profileCache = new Map<string, { username: string; avatar_url: string | null }>();

async function getProfile(userId: string) {
  if (profileCache.has(userId)) return profileCache.get(userId)!;
  const { data } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", userId)
    .single();
  if (data) {
    profileCache.set(userId, data);
    return data;
  }
  return { username: "Desconhecido", avatar_url: null };
}

async function loadAttachments(messageId: string, messageType: string): Promise<MessageAttachment[]> {
  const { data } = await supabase
    .from("message_attachments")
    .select("*")
    .eq("message_id", messageId)
    .eq("message_type", messageType);
  if (!data) return [];
  return data.map((a: any) => ({
    url: a.url,
    thumbnailUrl: a.thumbnail_url || a.url,
    width: a.width || 0,
    height: a.height || 0,
    fileName: a.file_name || "",
    size: a.size || 0,
    mimeType: a.mime_type || undefined,
    kind: a.kind || undefined,
  }));
}

async function loadReplyInfo(replyToId: string | null): Promise<ReplyInfo | null> {
  if (!replyToId) return null;
  const { data } = await supabase
    .from("chat_messages")
    .select("id, sender, text")
    .eq("id", replyToId)
    .single();
  if (!data) return null;
  return { id: data.id, sender: data.sender, text: data.text };
}

export function useChatStore(userId: string, username: string) {
  const [currentRoom, setCurrentRoom] = useState<string>("geral");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [rooms, setRooms] = useState<Room[]>(ROOMS);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentRoomRef = useRef(currentRoom);

  // Load rooms from DB
  useEffect(() => {
    supabase
      .from("rooms")
      .select("*")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRooms(
            data.map((r: any) => ({
              id: r.id,
              name: r.name,
              emoji: r.emoji,
              is_readonly: r.is_readonly,
            }))
          );
        }
      });
  }, []);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
    setUnreadCounts((prev) => {
      if (prev[currentRoom]) {
        const next = { ...prev };
        delete next[currentRoom];
        return next;
      }
      return prev;
    });
  }, [currentRoom]);

  const loadMessages = useCallback(async (roomId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      const msgs = await Promise.all(
        data.map(async (m: any) => {
          const profile = m.user_id ? await getProfile(m.user_id) : { username: m.sender, avatar_url: null };
          const attachments = await loadAttachments(m.id, "chat");
          const replyTo = await loadReplyInfo(m.reply_to_id);
          return {
            id: m.id,
            text: m.text,
            sender: profile.username || m.sender,
            senderId: m.user_id || "",
            senderAvatar: profile.avatar_url,
            timestamp: new Date(m.created_at),
            roomId: m.room_id,
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
  }, []);

  useEffect(() => {
    loadMessages(currentRoom);

    const msgChannel = supabase
      .channel(`messages-${currentRoom}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${currentRoom}` },
        async (payload) => {
          const m = payload.new as any;
          const profile = m.user_id ? await getProfile(m.user_id) : { username: m.sender, avatar_url: null };
          const isOwnMessage = m.user_id === userId;
          const attachments = await loadAttachments(m.id, "chat");
          const replyTo = await loadReplyInfo(m.reply_to_id);
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === m.id)) return prev;
            return [
              ...prev,
              {
                id: m.id,
                text: m.text,
                sender: profile.username || m.sender,
                senderId: m.user_id || "",
                senderAvatar: profile.avatar_url,
                timestamp: new Date(m.created_at),
                roomId: m.room_id,
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
            const mentionsMe = !!m.text && new RegExp(`@${username}\\b`, "i").test(m.text);
            const room = rooms.find((r) => r.id === m.room_id);
            showBrowserNotification({
              title: mentionsMe ? `${profile.username} te mencionou` : `${profile.username} em #${room?.name?.trim() || m.room_id}`,
              body: m.text || "📎 Anexo",
              tag: `chat-${m.room_id}`,
              url: "/",
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `room_id=eq.${currentRoom}` },
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
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload) => {
          const deleted = payload.old as any;
          setMessages((prev) => prev.filter((msg) => msg.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [currentRoom, loadMessages, userId, username, rooms]);

  // Global listener for unread counts on other rooms
  useEffect(() => {
    const unreadChannel = supabase
      .channel("unread-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const m = payload.new as any;
          const isOwnMessage = m.user_id === userId;
          if (isOwnMessage) return;
          if (m.room_id !== currentRoomRef.current) {
            setUnreadCounts((prev) => ({
              ...prev,
              [m.room_id]: (prev[m.room_id] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(unreadChannel);
    };
  }, [userId]);

  // Presence channel
  useEffect(() => {
    if (!username) return;

    const presenceChannel = supabase.channel("presence-chat", {
      config: { presence: { key: username } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setOnlineUsers(Object.keys(state));
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const typer = payload.payload?.username as string;
        const room = payload.payload?.room as string;
        if (typer && typer !== username && room === currentRoomRef.current) {
          setTypingUsers((prev) => (prev.includes(typer) ? prev : [...prev, typer]));
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u !== typer));
          }, 3000);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ username, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = presenceChannel;

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
      channelRef.current = null;
    };
  }, [username]);

  const sendMessage = useCallback(
    async (text: string, pendingAttachments?: PendingAttachment[], replyToId?: string) => {
      let attachmentData: AttachmentData[] = [];

      if (pendingAttachments && pendingAttachments.length > 0) {
        setUploading(true);
        setUploadProgress(0);
        try {
          const total = pendingAttachments.length;
          attachmentData = [];
          for (let i = 0; i < total; i++) {
            const att = await uploadAttachment(
              pendingAttachments[i].file,
              "chat-images",
              userId,
              (pct) => setUploadProgress(((i / total) + (pct / 100) / total) * 100)
            );
            attachmentData.push(att);
          }
        } catch (err) {
          console.error("[ChatStore] Upload failed:", err);
          setUploading(false);
          setUploadProgress(null);
          return;
        }
      }

      const { data: msgData, error: msgError } = await supabase
        .from("chat_messages")
        .insert({
          text: text || "",
          sender: username,
          room_id: currentRoom,
          user_id: userId,
          reply_to_id: replyToId || null,
        } as any)
        .select("id")
        .single();

      if (msgError) {
        console.error("[ChatStore] Failed to insert message:", msgError);
        const raw = msgError.message || "";
        let title = "Erro ao enviar";
        let description = "Não foi possível enviar sua mensagem. Tente novamente.";
        if (raw.includes("DUPLICATE_MESSAGE")) {
          title = "Mensagem duplicada";
          description = "Você acabou de enviar essa mesma mensagem. Tente algo diferente.";
        } else if (raw.includes("RATE_LIMIT")) {
          title = "Calma aí!";
          description = "Você está enviando mensagens muito rápido. Aguarde um momento.";
        } else if (raw.includes("MESSAGE_TOO_LONG")) {
          title = "Mensagem muito longa";
          description = "Sua mensagem excede o limite de 2000 caracteres.";
        }
        toast({ title, description, variant: "destructive" });
        setUploading(false);
        setUploadProgress(null);
        return;
      }

      if (msgData && attachmentData.length > 0) {
        await supabase.from("message_attachments").insert(
          attachmentData.map((a) => ({
            message_id: msgData.id,
            message_type: "chat",
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

      // Push notifications: dispara fire-and-forget para inscritos
      if (msgData) {
        const room = ROOMS.find((r) => r.id === currentRoom) || rooms.find((r) => r.id === currentRoom);
        const body = text || "📎 Anexo";
        supabase.functions
          .invoke("send-push", {
            body: {
              type: "chat",
              senderId: userId,
              senderName: username,
              body,
              url: "/",
              roomName: room?.name?.trim() || currentRoom,
            },
          })
          .catch((e) => console.warn("[push] invoke failed", e));

        // Registra menções (@username)
        if (text) {
          recordMentions({
            text,
            fromUserId: userId,
            fromUsername: username,
            messageId: msgData.id,
            messageKind: "chat",
            roomId: currentRoom,
            preview: text,
          }).catch(() => {});
        }
      }

      setUploading(false);
      setUploadProgress(null);
    },
    [username, currentRoom, userId, rooms]
  );

  const sendRawMessage = useCallback(
    async (text: string, uploaded: AttachmentData[], replyToId?: string) => {
      const { data: msgData, error: msgError } = await supabase
        .from("chat_messages")
        .insert({
          text: text || "",
          sender: username,
          room_id: currentRoom,
          user_id: userId,
          reply_to_id: replyToId || null,
        } as any)
        .select("id")
        .single();
      if (msgError) {
        console.error("[ChatStore] sendRaw failed:", msgError);
        toast({ title: "Erro ao enviar", description: msgError.message, variant: "destructive" });
        return;
      }
      if (msgData && uploaded.length > 0) {
        await supabase.from("message_attachments").insert(
          uploaded.map((a) => ({
            message_id: msgData.id,
            message_type: "chat",
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
    [username, currentRoom, userId]
  );


  const deleteMessage = useCallback(async (messageId: string) => {
    await supabase.from("chat_messages").delete().eq("id", messageId);
  }, []);

  const editMessage = useCallback(async (messageId: string, newText: string) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const { error } = await supabase
      .from("chat_messages")
      .update({ text: trimmed, is_edited: true, edited_at: new Date().toISOString() } as any)
      .eq("id", messageId);
    if (error) {
      toast({
        title: "Não foi possível editar",
        description: "Você só pode editar suas próprias mensagens nos primeiros 5 minutos.",
        variant: "destructive",
      });
    }
  }, []);

  const togglePin = useCallback(async (messageId: string, currentlyPinned: boolean) => {
    const { error } = await supabase
      .from("chat_messages")
      .update({
        is_pinned: !currentlyPinned,
        pinned_by: !currentlyPinned ? userId : null,
        pinned_at: !currentlyPinned ? new Date().toISOString() : null,
      } as any)
      .eq("id", messageId);
    if (error) {
      toast({
        title: "Não foi possível fixar",
        description: "Apenas administradores podem fixar mensagens.",
        variant: "destructive",
      });
    }
  }, [userId]);

  const sendTyping = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { username, room: currentRoomRef.current },
      });
    }
  }, [username]);

  const roomMessages = messages.filter((m) => m.roomId === currentRoom);
  const currentRoomData = rooms.find((r) => r.id === currentRoom);

  return {
    currentRoom,
    setCurrentRoom,
    messages: roomMessages,
    typingUsers,
    onlineUsers,
    sendMessage,
    sendRawMessage,
    deleteMessage,
    editMessage,
    togglePin,
    sendTyping,
    uploading,
    uploadProgress,
    unreadCounts,
    rooms,
    currentRoomData,
  };
}

