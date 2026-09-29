import { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Send, Settings, Phone, Video, Users, X, Hash, Plus, Menu, Archive, Trash2, Edit2, ChevronDown, ChevronRight, FolderPlus, Volume2, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGroupMessages, type GroupMessage } from "@/hooks/useGroupMessages";
import { useGroupDetails } from "@/hooks/useGroupDetails";
import { useGroupChannels, type GroupChannel } from "@/hooks/useGroupChannels";
import { GroupSettingsModal } from "./GroupSettingsModal";
import { useDMCall } from "@/hooks/useDMCall";
import { CallScreen } from "@/components/calls/CallScreen";
import { GroupCallScreen } from "@/components/calls/GroupCallScreen";
import { useGroupCall } from "@/hooks/useGroupCall";
import { MessageBubble } from "@/components/chat/MessageBubble";
import type { Message } from "@/lib/chat-store";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Props {
  groupId: string;
  userId: string;
  username: string;
  onBack: () => void;
}

function toMessage(g: GroupMessage): Message {
  return {
    id: g.id,
    text: g.text || "",
    sender: g.sender_name,
    senderId: g.user_id,
    senderAvatar: g.sender_avatar,
    timestamp: new Date(g.created_at),
    roomId: g.channel_id,
    attachments: g.image_url
      ? [{ url: g.image_url, thumbnailUrl: g.image_url, width: 0, height: 0, fileName: "", size: 0 }]
      : [],
    replyTo: g.reply_to ? { id: g.reply_to.id, sender: g.reply_to.sender, text: g.reply_to.text } : null,
    isEdited: g.is_edited,
    editedAt: g.edited_at ? new Date(g.edited_at) : null,
    isPinned: false,
  };
}

function channelIcon(c: GroupChannel) {
  if (c.type === "voice") return Volume2;
  if (c.type === "announcement") return Megaphone;
  return Hash;
}

export function GroupView({ groupId, userId, username, onBack }: Props) {
  const { group, members, isAdmin, updateGroup, promote, demote, removeMember, deleteGroup } = useGroupDetails(groupId, userId);
  const channelsApi = useGroupChannels(groupId, isAdmin);
  const { channels, categories, create, rename, archive, restore, remove: removeChannel, move, createCategory, renameCategory, removeCategory, moveChannelToCategory } = channelsApi;

  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const [showArchived, setShowArchived] = useState(false);

  const storageKey = `fc_last_channel_${groupId}`;
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  // Pick initial channel: saved → main → first non-archived
  useEffect(() => {
    if (!channels.length) return;
    const saved = localStorage.getItem(storageKey);
    const savedValid = saved && channels.find((c) => c.id === saved && !c.is_archived);
    if (savedValid) { setActiveChannelId(saved); return; }
    const main = channels.find((c) => c.is_main);
    const first = channels.find((c) => !c.is_archived);
    setActiveChannelId((main ?? first)?.id ?? null);
  }, [channels, storageKey]);

  useEffect(() => {
    if (activeChannelId) localStorage.setItem(storageKey, activeChannelId);
  }, [activeChannelId, storageKey]);

  const { messages, send, remove, edit } = useGroupMessages(groupId, activeChannelId, userId);
  const [text, setText] = useState("");
  const [replyTarget, setReplyTarget] = useState<GroupMessage | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dmCall = useDMCall(userId, username);
  const selfAvatar = useMemo(() => members.find((m) => m.user_id === userId)?.avatar_url || null, [members, userId]);
  const groupCall = useGroupCall(groupId, activeChannelId, userId, username, selfAvatar, isAdmin);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (replyTarget) inputRef.current?.focus();
  }, [replyTarget]);

  const mapped = useMemo(() => messages.map(toMessage), [messages]);
  const activeChannel = useMemo(() => channels.find((c) => c.id === activeChannelId) || null, [channels, activeChannelId]);

  // Group channels by category
  const grouped = useMemo(() => {
    const list = channels.filter((c) => showArchived || !c.is_archived);
    const uncategorized: GroupChannel[] = [];
    const byCat: Record<string, GroupChannel[]> = {};
    for (const c of list) {
      if (c.category_id) {
        (byCat[c.category_id] ||= []).push(c);
      } else {
        uncategorized.push(c);
      }
    }
    return { uncategorized, byCat };
  }, [channels, showArchived]);

  const handleSend = () => {
    if (!text.trim()) return;
    send(text, null, replyTarget?.id || null);
    setText("");
    setReplyTarget(null);
  };

  const handleReply = (m: Message) => {
    const orig = messages.find((x) => x.id === m.id);
    if (orig) setReplyTarget(orig);
  };

  const handleLeave = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
  };

  const startGroupCall = (kind: "voice" | "video") => {
    if (!activeChannelId) { toast.error("Selecione um canal para iniciar a chamada."); return; }
    if (groupCall.state !== "idle") { toast.info("Você já está em uma chamada."); return; }
    groupCall.join(kind);
  };

  const handleCreateChannel = async () => {
    const name = window.prompt("Nome do novo canal:", "");
    if (!name) return;
    const c = await create(name);
    if (c) setActiveChannelId(c.id);
  };

  const handleRenameChannel = async (c: GroupChannel) => {
    const name = window.prompt("Novo nome do canal:", c.name);
    if (name && name.trim()) rename(c.id, name.trim());
  };

  const handleCreateCategory = async () => {
    const name = window.prompt("Nome da categoria:", "");
    if (name && name.trim()) createCategory(name.trim());
  };

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const renderChannelRow = (c: GroupChannel) => {
    const Icon = channelIcon(c);
    const active = c.id === activeChannelId;
    return (
      <div key={c.id} className="group flex items-center gap-1">
        <button
          onClick={() => { setActiveChannelId(c.id); if (isMobile) setDrawerOpen(false); }}
          className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors min-w-0 ${
            active
              ? "bg-primary/15 text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          } ${c.is_archived ? "opacity-60 italic" : ""}`}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="truncate">{c.name}</span>
          {c.is_main && <span className="text-[10px] uppercase tracking-wide text-primary/70 ml-auto">principal</span>}
        </button>
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1 transition-opacity" aria-label={`Opções do canal ${c.name}`}>
                <Settings className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass">
              <DropdownMenuItem onClick={() => handleRenameChannel(c)}>
                <Edit2 className="w-4 h-4 mr-2" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => move(c.id, -1)}>↑ Mover para cima</DropdownMenuItem>
              <DropdownMenuItem onClick={() => move(c.id, 1)}>↓ Mover para baixo</DropdownMenuItem>
              {categories.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => moveChannelToCategory(c.id, null)}>Remover da categoria</DropdownMenuItem>
                  {categories.map((cat) => (
                    <DropdownMenuItem key={cat.id} onClick={() => moveChannelToCategory(c.id, cat.id)}>
                      Mover para {cat.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuSeparator />
              {!c.is_main && (
                <>
                  {c.is_archived ? (
                    <DropdownMenuItem onClick={() => restore(c.id)}>Restaurar</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => archive(c.id)}>
                      <Archive className="w-4 h-4 mr-2" /> Arquivar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => { if (confirm(`Excluir canal #${c.name}? Todas as mensagens serão perdidas.`)) removeChannel(c.id); }} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  const channelPanel = (
    <div className="w-56 shrink-0 flex flex-col glass border-r border-glass-border h-full">
      <div className="h-14 flex items-center justify-between px-3 border-b border-glass-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Canais</span>
        {isAdmin && (
          <div className="flex items-center gap-1">
            <button onClick={handleCreateCategory} className="text-muted-foreground hover:text-foreground p-1" title="Nova categoria">
              <FolderPlus className="w-4 h-4" />
            </button>
            <button onClick={handleCreateChannel} className="text-muted-foreground hover:text-foreground p-1" title="Novo canal">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {grouped.uncategorized.map(renderChannelRow)}
        {categories.map((cat) => {
          const list = grouped.byCat[cat.id] || [];
          const collapsed = collapsedCats[cat.id] ?? cat.collapsed_by_default;
          return (
            <div key={cat.id} className="mt-2">
              <div className="group flex items-center gap-1 px-1">
                <button
                  onClick={() => setCollapsedCats((p) => ({ ...p, [cat.id]: !collapsed }))}
                  className="flex-1 flex items-center gap-1 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span className="truncate">{cat.name}</span>
                  <span className="ml-1 text-muted-foreground/60">({list.length})</span>
                </button>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5 transition-opacity" aria-label={`Opções da categoria ${cat.name}`}>
                        <Settings className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass">
                      <DropdownMenuItem onClick={() => { const n = window.prompt("Renomear categoria:", cat.name); if (n && n.trim()) renameCategory(cat.id, n.trim()); }}>
                        <Edit2 className="w-4 h-4 mr-2" /> Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { if (confirm(`Excluir categoria "${cat.name}"? Os canais dela ficarão sem categoria.`)) removeCategory(cat.id); }} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {!collapsed && <div className="mt-0.5 space-y-0.5">{list.map(renderChannelRow)}</div>}
            </div>
          );
        })}
        {isAdmin && (
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="w-full mt-2 text-[11px] text-muted-foreground/70 hover:text-foreground text-left px-2 py-1"
          >
            {showArchived ? "Ocultar arquivados" : "Mostrar arquivados"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex min-w-0 bg-transparent">
      {/* Channel panel — hidden on mobile, drawer on demand */}
      {!isMobile && channelPanel}

      <AnimatePresence>
        {isMobile && drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed left-0 top-0 bottom-0 z-50"
            >
              {channelPanel}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center gap-3 px-4 border-b border-glass-border glass">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground p-1" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {isMobile && (
            <button onClick={() => setDrawerOpen(true)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Abrir canais">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center flex-shrink-0">
              {group.photo_url ? <img src={group.photo_url} alt="" className="w-full h-full object-cover" /> : <Users className="w-4 h-4 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-foreground text-sm truncate flex items-center gap-1.5">
                <span className="truncate">{group.name}</span>
                {activeChannel && (
                  <>
                    <span className="text-muted-foreground/50">/</span>
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate text-muted-foreground">{activeChannel.name}</span>
                  </>
                )}
              </h2>
              <p className="text-xs text-muted-foreground truncate">{activeChannel?.description || `${members.length} membros`}</p>
            </div>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => startGroupCall("voice")} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60" title="Chamada de voz">
              <Phone className="w-4 h-4" />
            </button>
            <button onClick={() => startGroupCall("video")} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60" title="Chamada de vídeo">
              <Video className="w-4 h-4" />
            </button>
            <button onClick={() => setSettingsOpen(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60" title="Configurações">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeChannelId || "empty"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-y-auto px-4 py-4"
          >
            {!activeChannelId && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Selecione um canal para começar a conversa.
              </div>
            )}
            {activeChannelId && mapped.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Este canal ainda não tem mensagens. Comece a conversa! ✨
              </div>
            )}
            {mapped.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isOwn={m.senderId === userId}
                isAdmin={isAdmin}
                currentUserId={userId}
                onDelete={remove}
                onReply={handleReply}
                onEdit={edit}
              />
            ))}
            <div ref={endRef} />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {replyTarget && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mx-3 mb-1 px-3 py-2 rounded-lg glass border-l-2 border-primary flex items-center gap-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary">Respondendo a {replyTarget.sender_name}</p>
                <p className="text-xs text-muted-foreground truncate">{replyTarget.text || "📎 Anexo"}</p>
              </div>
              <button onClick={() => setReplyTarget(null)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Cancelar resposta">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border-t border-glass-border p-3 flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              if (e.key === "Escape") setReplyTarget(null);
            }}
            placeholder={activeChannel ? `Mensagem em #${activeChannel.name}` : "Selecione um canal"}
            disabled={!activeChannelId}
            className="flex-1 px-4 py-2.5 rounded-full bg-muted/60 backdrop-blur-sm border border-glass-border text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
          />
          <button onClick={handleSend} disabled={!text.trim() || !activeChannelId} className="w-11 h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center transition-colors" aria-label="Enviar">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {settingsOpen && (
        <GroupSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          group={group}
          members={members}
          isAdmin={isAdmin}
          userId={userId}
          onUpdate={updateGroup}
          onPromote={promote}
          onDemote={demote}
          onRemove={removeMember}
          onDelete={deleteGroup}
          onLeave={handleLeave}
          onAfterDelete={onBack}
        />
      )}

      {dmCall.state !== "idle" && dmCall.active && (
        <CallScreen
          state={dmCall.state}
          call={dmCall.active}
          localStream={dmCall.localStream}
          remoteStream={dmCall.remoteStream}
          muted={dmCall.muted}
          camOff={dmCall.camOff}
          elapsed={dmCall.elapsed}
          onAccept={dmCall.acceptCall}
          onDecline={dmCall.declineCall}
          onEnd={() => dmCall.endCall()}
          onToggleMute={dmCall.toggleMute}
          onToggleCam={dmCall.toggleCam}
        />
      )}

      {groupCall.state !== "idle" && (
        <GroupCallScreen
          channelName={activeChannel?.name || "canal"}
          kind={groupCall.kind}
          connecting={groupCall.state === "joining"}
          participants={groupCall.participants}
          localStream={groupCall.localStream}
          selfName={username}
          selfAvatar={selfAvatar}
          muted={groupCall.muted}
          camOff={groupCall.camOff}
          forceMuted={groupCall.forceMuted}
          isAdmin={isAdmin}
          elapsed={groupCall.elapsed}
          onLeave={() => groupCall.leave()}
          onToggleMute={groupCall.toggleMute}
          onToggleCam={groupCall.toggleCam}
          onToggleLocalMute={groupCall.toggleLocalMute}
          onToggleForceMute={groupCall.toggleForceMute}
        />
      )}
    </div>
  );
}
