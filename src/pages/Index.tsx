import { ChatLayout } from "@/components/chat/ChatLayout";
import { useChatStore } from "@/lib/chat-store";
import { useAuth } from "@/hooks/useAuth";
import { useFriends } from "@/hooks/useFriends";

const Index = () => {
  const { user, profile, profileMissing, isAdmin, signOut, refetchProfile } = useAuth();

  const chat = useChatStore(
    user?.id || "",
    profile?.username || ""
  );

  const {
    friends,
    pendingRequests,
    loading: friendLoading,
    addFriendByCode,
    acceptRequest,
    rejectRequest,
    removeFriend,
  } = useFriends(user?.id || "");

  if (user && !profile && profileMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md space-y-4">
          <p className="text-foreground font-medium">Não foi possível carregar seu perfil.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => refetchProfile()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Tentar de novo</button>
            <button onClick={() => signOut()} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm">Sair</button>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isMuted = profile.muted_until ? new Date(profile.muted_until) > new Date() : false;

  return (
    <ChatLayout
      username={profile.username}
      userId={user.id}
      profile={profile}
      isAdmin={isAdmin}
      currentRoom={chat.currentRoom}
      messages={chat.messages}
      typingUsers={chat.typingUsers}
      onlineUsers={chat.onlineUsers}
      onRoomChange={chat.setCurrentRoom}
      onSendMessage={chat.sendMessage}
      onSendRawMessage={chat.sendRawMessage}
      onDeleteMessage={chat.deleteMessage}
      onEditMessage={chat.editMessage}
      onTogglePin={chat.togglePin}
      onTyping={chat.sendTyping}
      onLogout={signOut}
      uploading={chat.uploading}
      uploadProgress={chat.uploadProgress}
      friends={friends}
      pendingRequests={pendingRequests}
      friendLoading={friendLoading}
      onAddFriend={addFriendByCode}
      onAcceptRequest={acceptRequest}
      onRejectRequest={rejectRequest}
      onRemoveFriend={removeFriend}
      unreadCounts={chat.unreadCounts}
      onProfileUpdated={refetchProfile}
      isMuted={isMuted}
      rooms={chat.rooms}
      currentRoomData={chat.currentRoomData}
    />
  );
};

export default Index;
