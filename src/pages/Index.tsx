import { ChatLayout } from "@/components/chat/ChatLayout";
import { useChatStore } from "@/lib/chat-store";
import { useAuth } from "@/hooks/useAuth";
import { useFriends } from "@/hooks/useFriends";

const Index = () => {
  const { user, profile, isAdmin, signOut, refetchProfile } = useAuth();

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
