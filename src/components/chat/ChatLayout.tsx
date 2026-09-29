import { useState, useEffect, useRef, useMemo } from "react";
import { Menu, Lock, Search, Pin } from "lucide-react";
import { getRoomIcon } from "@/lib/room-icons";
import { FirstVisitWarning } from "./FirstVisitWarning";

import { useNavigate } from "react-router-dom";
import { ChatSidebar } from "./ChatSidebar";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { AddFriendModal } from "./AddFriendModal";
import { DMView } from "./DMView";
import { ImageLightbox } from "./ImageLightbox";
import { ReportModal } from "./ReportModal";
import { ThemeToggle } from "./ThemeToggle";
import { ChangelogModal, LATEST_VERSION } from "./ChangelogModal";
import { MessageSearchModal } from "./MessageSearchModal";
import { OfflineBanner } from "./OfflineBanner";
import { MentionsPanel } from "./MentionsPanel";
import { AchievementsModal } from "./AchievementsModal";
import { ThreadPanel } from "./ThreadPanel";
import { useUserXP } from "@/hooks/useUserXP";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import type { Room, Message, ReplyInfo } from "@/lib/chat-store";
import type { Profile } from "@/hooks/useAuth";
import type { Friend, FriendRequest } from "@/hooks/useFriends";
import type { PendingAttachment } from "@/lib/image-utils";
import { useSettings } from "@/lib/settings-context";
import { useMessageReactions } from "@/lib/message-reactions";
import { useMentions, type MentionEntry } from "@/hooks/useMentions";
import { useGlobalDmNotifications } from "@/hooks/useGlobalDmNotifications";
import { isDndActive } from "@/lib/dnd";
import { setNotifDnd, requestNotifPermission } from "@/lib/browser-notifications";

interface ChatLayoutProps {
  username: string;
  userId: string;
  profile: Profile | null;
  isAdmin: boolean;
  currentRoom: string;
  messages: Message[];
  typingUsers: string[];
  onlineUsers: string[];
  onRoomChange: (id: string) => void;
  onSendMessage: (text: string, attachments?: PendingAttachment[], replyToId?: string) => void;
  onSendRawMessage?: (text: string, uploaded: any[], replyToId?: string) => void;
  onDeleteMessage: (id: string) => void;
  onEditMessage?: (id: string, newText: string) => void;
  onTogglePin?: (id: string, currentlyPinned: boolean) => void;
  onTyping: () => void;
  onLogout: () => void;
  uploading?: boolean;
  uploadProgress?: number | null;
  friends: Friend[];
  pendingRequests: FriendRequest[];
  friendLoading: boolean;
  onAddFriend: (code: string) => Promise<string>;
  onAcceptRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onRemoveFriend: (friendshipId: string) => void;
  unreadCounts: Record<string, number>;
  onProfileUpdated?: () => void;
  isMuted?: boolean;
  rooms: Room[];
  currentRoomData?: Room;
}

export function ChatLayout({
  username,
  userId,
  profile,
  isAdmin,
  currentRoom,
  messages,
  typingUsers,
  onlineUsers,
  onRoomChange,
  onSendMessage,
  onSendRawMessage,
  onDeleteMessage,
  onEditMessage,
  onTogglePin,
  onTyping,
  onLogout,
  uploading,
  uploadProgress,
  friends,
  pendingRequests,
  friendLoading,
  onAddFriend,
  onAcceptRequest,
  onRejectRequest,
  onRemoveFriend,
  unreadCounts,
  onProfileUpdated,
  isMuted,
  rooms,
  currentRoomData,
}: ChatLayoutProps) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [activeDMFriend, setActiveDMFriend] = useState<Friend | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
  const [reportMessage, setReportMessage] = useState<Message | null>(null);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mentionsOpen, setMentionsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const { xp: userXp, achievements: userAchievements } = useUserXP(userId);
  const { isBlocked, block } = useBlockedUsers(userId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const room = currentRoomData || rooms.find((r) => r.id === currentRoom);

  const isReadonly = room?.is_readonly && !isAdmin;

  const dndActive = isDndActive(profile?.dnd_until);
  useEffect(() => {
    import("@/lib/notification-sounds").then((m) => m.setSoundDnd(profile?.dnd_until || null));
    setNotifDnd(profile?.dnd_until || null);
  }, [profile?.dnd_until]);
  useEffect(() => {
    // Pede permissão de notificação 1x ao montar (sem prompt agressivo)
    requestNotifPermission().catch(() => {});
  }, []);
  const { mentions, unreadCount: mentionsUnread, markAllRead, markOneRead } = useMentions(userId, dndActive);
  useGlobalDmNotifications(userId, activeDMFriend?.id || null);

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { reactions, toggle: toggleReaction } = useMessageReactions(messageIds, userId);

  const visibleMessages = useMemo(
    () => messages.filter((m) => !isBlocked(m.senderId)),
    [messages, isBlocked]
  );

  const replyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of messages) {
      const parentId = m.replyTo?.id;
      if (parentId) map[parentId] = (map[parentId] || 0) + 1;
    }
    return map;
  }, [messages]);

  const pinnedMessages = useMemo(() => visibleMessages.filter((m) => m.isPinned), [visibleMessages]);

  const handleJumpToMessage = (messageId: string, roomId: string) => {
    if (roomId !== currentRoom) onRoomChange(roomId);
    setTimeout(() => {
      const el = document.querySelector(`[data-message-id="${messageId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2000);
      }
    }, 300);
  };


  // Check for unread changelog
  const lastReadVersion = typeof window !== "undefined" ? localStorage.getItem("flashchat_changelog_read") : null;
  const hasUnreadChangelog = lastReadVersion !== LATEST_VERSION;

  const handleOpenChangelog = () => {
    setChangelogOpen(true);
    localStorage.setItem("flashchat_changelog_read", LATEST_VERSION);
  };

  const prevMessagesLenRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevMessagesLenRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLenRef.current = messages.length;
  }, [messages]);

  const handleOpenDM = (friend: Friend) => setActiveDMFriend(friend);
  const handleBackToRoom = () => setActiveDMFriend(null);
  const handleRoomChange = (id: string) => {
    setActiveDMFriend(null);
    setReplyingTo(null);
    onRoomChange(id);
  };

  const handleReply = (message: Message) => {
    setReplyingTo({ id: message.id, sender: message.sender, text: message.text });
  };

  const handleSendMessage = (text: string, attachments?: PendingAttachment[], replyToId?: string) => {
    onSendMessage(text, attachments, replyToId);
    setReplyingTo(null);
  };

  return (
    <div className="flex h-screen w-full bg-transparent">
      <OfflineBanner />
      <ChatSidebar
        currentRoom={currentRoom}
        onRoomChange={handleRoomChange}
        onlineUsers={onlineUsers}
        username={username}
        profile={profile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
        friends={friends}
        pendingRequests={pendingRequests}
        onAcceptRequest={onAcceptRequest}
        onRejectRequest={onRejectRequest}
        onRemoveFriend={onRemoveFriend}
        onOpenAddFriend={() => setAddFriendOpen(true)}
        onOpenDM={handleOpenDM}
        activeDMFriendId={activeDMFriend?.id || null}
        unreadCounts={unreadCounts}
        onProfileUpdated={onProfileUpdated}
        rooms={rooms}
        onOpenChangelog={handleOpenChangelog}
        hasUnreadChangelog={hasUnreadChangelog}
        onOpenSettings={() => navigate("/settings")}
        onOpenMentions={() => setMentionsOpen(true)}
        mentionsUnread={mentionsUnread}
        onOpenAchievements={() => setAchievementsOpen(true)}
        userXp={userXp}
      />

      {activeDMFriend ? (
        <DMView userId={userId} username={username} friend={activeDMFriend} onBack={handleBackToRoom} />
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 px-4 border-b border-border glass">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-muted-foreground hover:text-foreground p-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            {(() => { const RIcon = getRoomIcon(room?.id || ""); return <RIcon className="w-5 h-5 text-primary" />; })()}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-foreground text-sm">{room?.name}</h2>
                {room?.is_readonly && (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{onlineUsers.length} online</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Buscar mensagens"
              >
                <Search className="w-4 h-4" />
              </button>
              <ThemeToggle />
              {isAdmin && (
                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
                  Admin
                </span>
              )}
            </div>
          </header>

          {pinnedMessages.length > 0 && (
            <div className="px-4 py-2 border-b border-border bg-amber-500/5 flex items-center gap-2 overflow-x-auto">
              <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <div className="flex gap-2 text-xs">
                {pinnedMessages.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleJumpToMessage(m.id, currentRoom)}
                    className="px-2 py-1 rounded bg-background/50 border border-border hover:border-amber-500/40 transition-colors max-w-[200px] truncate text-foreground"
                    title={m.text}
                  >
                    <span className="font-medium text-amber-600 dark:text-amber-400">{m.sender}:</span>{" "}
                    <span className="opacity-80">{m.text || "📎 Anexo"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {visibleMessages.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Nenhuma mensagem ainda. Seja o primeiro a escrever! ✨
              </div>
            )}
            {visibleMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === userId}
                isAdmin={isAdmin}
                onDelete={onDeleteMessage}
                onImageClick={setLightboxSrc}
                onReply={isReadonly ? undefined : handleReply}
                onReport={(m) => setReportMessage(m)}
                onEdit={onEditMessage}
                onPin={isAdmin ? onTogglePin : undefined}
                onReact={isReadonly ? undefined : toggleReaction}
                reactions={reactions[msg.id]}
                showAvatar={settings.showAvatars}
                showTimestamp={settings.showTimestamp}
                currentUserId={userId}
                replyCount={replyCounts[msg.id] || 0}
                onOpenThread={(id) => setOpenThreadId(id)}
                onBlockUser={(uid) => block(uid)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {settings.showTypingIndicator && <TypingIndicator users={typingUsers} />}

          {isMuted ? (
            <div className="px-4 py-3 text-center text-sm text-muted-foreground bg-destructive/10 border-t border-border">
              🔇 Você está mutado e não pode enviar mensagens no momento.
            </div>
          ) : isReadonly ? (
            <div className="px-4 py-3 text-center text-sm text-muted-foreground bg-muted/50 border-t border-border flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              Este canal é somente leitura. Apenas administradores podem enviar mensagens.
            </div>
          ) : (
            <ChatInput
              onSend={handleSendMessage}
              onSendRaw={onSendRawMessage ? (text, uploaded, replyToId) => { onSendRawMessage(text, uploaded, replyToId); setReplyingTo(null); } : undefined}
              onTyping={onTyping}
              uploading={uploading}
              uploadProgress={uploadProgress}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              sendWithEnter={settings.sendWithEnter}
              userId={userId}
              roomId={currentRoom}
            />
          )}
        </div>
      )}

      <AddFriendModal
        open={addFriendOpen}
        onClose={() => setAddFriendOpen(false)}
        myFriendCode={profile?.friend_code || null}
        onAddFriend={onAddFriend}
        loading={friendLoading}
      />

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <ReportModal
        open={!!reportMessage}
        onClose={() => setReportMessage(null)}
        message={reportMessage}
        reporterId={userId}
      />

      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />

      <MessageSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        roomId={currentRoom}
        onJump={(messageId, roomId) => handleJumpToMessage(messageId, roomId)}
      />


      <MentionsPanel
        open={mentionsOpen}
        onClose={() => setMentionsOpen(false)}
        mentions={mentions}
        onMarkAllRead={markAllRead}
        onJump={(m: MentionEntry) => {
          markOneRead(m.id);
          setMentionsOpen(false);
          if (m.message_kind === "chat" && m.room_id) {
            handleJumpToMessage(m.message_id, m.room_id);
          } else if (m.message_kind === "dm" && m.conversation_user_id) {
            const friend = friends.find((f) => f.id === m.conversation_user_id);
            if (friend) setActiveDMFriend(friend);
          }
        }}
      />
      <AchievementsModal
        open={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
        userId={userId}
        xp={userXp}
        achievements={userAchievements}
      />
      {openThreadId && (
        <ThreadPanel parentId={openThreadId} kind="chat" onClose={() => setOpenThreadId(null)} />
      )}
      <FirstVisitWarning />
    </div>
  );
}

