import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, X, LogOut, UserPlus, MessageSquare, Trash2, Megaphone, Settings, AtSign, Lock, UsersRound, Music2, Wand2 } from "lucide-react";
import { NotificationsBell } from "./NotificationsBell";
import { FlashLogo } from "@/components/FlashLogo";
import { getRoomIcon } from "@/lib/room-icons";

import type { Room } from "@/lib/chat-store";
import type { Profile } from "@/hooks/useAuth";
import type { Friend, FriendRequest } from "@/hooks/useFriends";
import { FriendRequests } from "./FriendRequests";
import { ProfileEditModal } from "./ProfileEditModal";
import { nameFontStyle } from "@/lib/fonts";
import { XPBadge } from "./XPBadge";
import type { UserXP } from "@/hooks/useUserXP";

interface ChatSidebarProps {
  currentRoom: string;
  onRoomChange: (id: string) => void;
  onlineUsers: string[];
  username: string;
  profile: Profile | null;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  friends: Friend[];
  pendingRequests: FriendRequest[];
  onAcceptRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onRemoveFriend: (friendshipId: string) => void;
  onOpenAddFriend: () => void;
  onOpenDM: (friend: Friend) => void;
  activeDMFriendId: string | null;
  unreadCounts: Record<string, number>;
  onProfileUpdated?: () => void;
  rooms: Room[];
  onOpenChangelog: () => void;
  hasUnreadChangelog: boolean;
  onOpenSettings: () => void;
  onOpenMentions: () => void;
  mentionsUnread: number;
  onOpenAchievements: () => void;
  userXp: UserXP | null;
  userId: string;
}

export function ChatSidebar({
  currentRoom,
  onRoomChange,
  onlineUsers,
  username,
  profile,
  open,
  onClose,
  onLogout,
  friends,
  pendingRequests,
  onAcceptRequest,
  onRejectRequest,
  onRemoveFriend,
  onOpenAddFriend,
  onOpenDM,
  activeDMFriendId,
  unreadCounts,
  onProfileUpdated,
  rooms,
  onOpenChangelog,
  hasUnreadChangelog,
  onOpenSettings,
  onOpenMentions,
  mentionsUnread,
  onOpenAchievements,
  userXp,
  userId,
}: ChatSidebarProps) {
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed md:relative z-50 md:z-auto
          top-0 left-0 h-full w-64
          glass-panel border-r border-sidebar-border/40
          flex flex-col
          transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <h2 className="font-display text-lg tracking-wide flex items-center gap-2">
            <FlashLogo className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-foreground">Flash</span><span className="text-primary">Chat BETA</span>
          </h2>
          <button onClick={onClose} className="md:hidden text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Rooms */}
          <div className="p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Salas</p>
            {rooms.map((room) => {
              const unread = unreadCounts[room.id] || 0;
              const isActive = currentRoom === room.id && !activeDMFriendId;
              const Icon = getRoomIcon(room.id);
              return (
                <motion.button
                  key={room.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onRoomChange(room.id); onClose(); }}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"}
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{room.name}</span>
                  {room.is_readonly && (
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  )}
                  {unread > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    </span>
                  )}
                </motion.button>
              );
            })}
            <Link
              to="/groups"
              onClick={onClose}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-all mt-1"
            >
              <UsersRound className="w-4 h-4 flex-shrink-0 text-primary" />
              <span className="flex-1 text-left">Grupos</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">NOVO</span>
            </Link>
            <Link
              to="/music"
              onClick={onClose}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-all"
            >
              <Music2 className="w-4 h-4 flex-shrink-0 text-primary" />
              <span className="flex-1 text-left">Música</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">NOVO</span>
            </Link>
            <Link
              to="/flashforge"
              onClick={onClose}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-all"
            >
              <Wand2 className="w-4 h-4 flex-shrink-0 text-primary" />
              <span className="flex-1 text-left">FlashForge</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">NOVO</span>
            </Link>
          </div>

          {/* Pending requests */}
          {pendingRequests.length > 0 && (
            <div className="p-3 border-t border-sidebar-border">
              <FriendRequests
                requests={pendingRequests}
                onAccept={onAcceptRequest}
                onReject={onRejectRequest}
              />
            </div>
          )}

          {/* Friends */}
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Amigos — {friends.length}
              </p>
              <button
                onClick={onOpenAddFriend}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Adicionar amigo"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>
            {friends.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-2">
                Nenhum amigo ainda. Use seu código para convidar!
              </p>
            )}
            <div className="space-y-0.5">
              {friends.map((friend) => (
                <div key={friend.id} className="group flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { onOpenDM(friend); onClose(); }}
                    className={`
                      flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${activeDMFriendId === friend.id
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"}
                    `}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-[10px] font-bold text-primary">{friend.username[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <span className="truncate">{friend.username}</span>
                  </motion.button>
                  <button
                    onClick={() => onRemoveFriend(friend.friendshipId)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Remover amigo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Online users */}
          <div className="p-3 border-t border-sidebar-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Online — {onlineUsers.length}
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {onlineUsers.map((user) => {
                const isYou = user === username;
                const initial = user[0]?.toUpperCase() || "?";
                return (
                  <Link
                    key={user}
                    to={`/u/${encodeURIComponent(user)}`}
                    onClick={onClose}
                    className="group relative flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm overflow-hidden hover:bg-sidebar-accent transition-colors"
                  >
                    {/* Watermark inicial atrás */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-3xl font-display font-black text-primary/10 select-none leading-none"
                    >
                      {initial}
                    </span>
                    <span className="relative w-2 h-2 rounded-full bg-online shadow-[0_0_8px_hsl(var(--online))]" />
                    <span className={`relative truncate ${isYou ? "font-semibold text-primary" : "text-sidebar-foreground group-hover:text-foreground"}`}>
                      {user}{isYou ? " (você)" : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          </div>


        {/* XP / Level */}
        <div className="px-3 pt-3">
          <XPBadge xp={userXp} onClick={onOpenAchievements} />
        </div>

        {/* Bottom actions */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setProfileEditOpen(true)}
              className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-primary transition-all"
              title="Editar perfil"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="text-primary font-bold text-sm">{username[0]?.toUpperCase()}</span>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate" style={nameFontStyle(profile?.name_font)}>{username}</p>
              <p className="text-xs text-muted-foreground font-mono">{profile?.friend_code || "-----"}</p>
            </div>
            <div className="flex items-center gap-0.5">
              <NotificationsBell userId={userId} onOpenChangelog={onOpenChangelog} />
              <button
                onClick={onOpenMentions}
                className="relative p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Menções"
              >
                <AtSign className="w-4 h-4" />
                {mentionsUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {mentionsUnread > 9 ? "9+" : mentionsUnread}
                  </span>
                )}
              </button>
              <button
                onClick={onOpenChangelog}
                className="relative p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Novidades"
              >
                <Megaphone className="w-4 h-4" />
                {hasUnreadChangelog && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-destructive" />
                )}
              </button>
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Profile Edit Modal */}
      {profile && (
        <ProfileEditModal
          open={profileEditOpen}
          onClose={() => setProfileEditOpen(false)}
          profile={profile}
          onSaved={() => onProfileUpdated?.()}
        />
      )}
    </>
  );
}
