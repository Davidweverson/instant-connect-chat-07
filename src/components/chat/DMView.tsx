import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { MoreHorizontal, ArrowLeft, Send, Smile, Plus, Image as ImageIcon, Trash2, Reply, X, Copy, Check, Pencil, Pin, PinOff, Search, BarChart3, Phone, Video } from "lucide-react";
import { useCall } from "@/lib/call-context";

import { useDirectMessages, type DirectMessage } from "@/hooks/useDirectMessages";
import { AttachmentTray } from "./AttachmentTray";
import { ImageLightbox } from "./ImageLightbox";
import { GifPicker } from "./GifPicker";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { MessageReactions, ReactionPicker } from "./MessageReactions";
import { FileAttachmentCard } from "./FileAttachmentCard";
import { VoiceMessage } from "./VoiceMessage";
import { VoiceRecorderButton } from "./VoiceRecorder";
import { PollCard } from "./PollCard";
import { PollCreatorModal } from "./PollCreatorModal";
import { extractPollId, POLL_MARKER } from "@/lib/polls";
import { useMessageReactions } from "@/lib/message-reactions";
import { createPendingAttachment, revokePendingAttachments, ACCEPTED_ANY_TYPES, isAcceptedFile, isVideoUrl, type PendingAttachment, type AttachmentData } from "@/lib/image-utils";
import type { Friend } from "@/hooks/useFriends";

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

function linkifyText(text: string): ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:opacity-80 transition-opacity break-all">{part.length > 50 ? part.slice(0, 50) + "..." : part}</a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

const QUICK_EMOJIS = ["😂", "🔥", "❤️", "👍", "😎", "🎉", "💯", "😭", "🤔", "👀", "✨", "🙌"];

interface DMViewProps {
  userId: string;
  username?: string;
  friend: Friend;
  onBack: () => void;
}

function isGiphyUrl(text: string): boolean {
  return /^https?:\/\/.*giphy\.com\/.*\.(gif|webp)/i.test(text.trim()) ||
         /^https?:\/\/media[0-9]*\.giphy\.com\//i.test(text.trim());
}

function DMBubble({ msg, isOwn, viewerId, onImageClick, onDelete, onReply, onEdit, onTogglePin, onReact, reactions }: {
  msg: DirectMessage;
  isOwn: boolean;
  viewerId: string;
  onImageClick: (url: string) => void;
  onDelete?: (id: string) => void;
  onReply?: (msg: DirectMessage) => void;
  onEdit?: (id: string, newText: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  onReact?: (id: string, emoji: string) => void;
  reactions?: ReturnType<typeof useMessageReactions>["reactions"][string];
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.text || "");
  const time = msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const hasAttachments = msg.attachments && msg.attachments.length > 0;
  const hasLegacyImage = msg.imageUrl && !hasAttachments;
  const ageMin = (Date.now() - msg.timestamp.getTime()) / 60000;
  const canEdit = isOwn && ageMin < 5 && !!msg.text && !isGiphyUrl(msg.text || "");

  const handleCopy = () => {
    if (!msg.text) return;
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const saveEdit = () => {
    const v = editValue.trim();
    if (v && v !== msg.text) onEdit?.(msg.id, v);
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      tabIndex={-1}
      className={`msg-row flex ${isOwn ? "justify-end" : "justify-start"} mb-1 group outline-none`}
      data-message-id={msg.id}
    >
      <div className={`ff-bubble-col flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {msg.isPinned && (
          <span className="text-[10px] flex items-center gap-1 text-amber-500 mb-0.5"><Pin className="w-3 h-3" /> Fixada</span>
        )}
        <div className="relative">
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isOwn ? "chat-bubble-own rounded-br-md" : "chat-bubble-other rounded-bl-md"} ${msg.isPinned ? "ring-2 ring-amber-500/40" : ""}`}
          >
            {msg.replyTo && (
              <div className="flex items-stretch gap-0 mb-2 rounded-lg overflow-hidden bg-black/10">
                <div className="w-1 bg-primary flex-shrink-0" />
                <div className="px-2.5 py-1.5 min-w-0">
                  <p className="text-xs font-semibold text-primary truncate">{msg.replyTo.senderName}</p>
                  <p className="text-xs opacity-70 truncate">{msg.replyTo.text || "📎 Anexo"}</p>
                </div>
              </div>
            )}

            {hasAttachments && (
              <div className={`flex flex-col gap-1.5 ${msg.text ? "mb-2" : ""}`}>
                {msg.attachments.map((att, i) => {
                  const url = att.url;
                  const kind = att.kind;
                  const mime = att.mimeType || "";
                  const isAudio = kind === "audio" || mime.startsWith("audio/");
                  const isImg = !isAudio && (kind === "image" || mime.startsWith("image/") || (!kind && !mime && /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(url)));
                  const isVid = !isAudio && (kind === "video" || mime.startsWith("video/") || isVideoUrl(url));
                  if (isAudio) {
                    return <VoiceMessage key={i} url={url} fileName={att.fileName} isOwn={isOwn} />;
                  }
                  if (isVid) {
                    return (
                      <div key={i} className="relative max-w-full rounded-lg overflow-hidden cursor-pointer group" style={{ maxWidth: "min(100%, 450px)" }} onClick={() => onImageClick(url)}>
                        <video src={url} className="max-w-full rounded-lg" style={{ maxHeight: "350px", objectFit: "contain" }} muted preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                          <div className="w-12 h-12 rounded-full bg-background/80 flex items-center justify-center"><span className="text-foreground ml-0.5">▶</span></div>
                        </div>
                      </div>
                    );
                  }
                  if (isImg) {
                    return (
                      <img key={i} src={att.thumbnailUrl || att.url} alt={att.fileName || ""} className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" style={{ maxWidth: "min(100%, 450px)", maxHeight: "350px", objectFit: "contain" }} onClick={() => onImageClick(att.url)} loading="lazy" />
                    );
                  }
                  return (
                    <FileAttachmentCard key={i} url={url} fileName={att.fileName} size={att.size} mimeType={att.mimeType} />
                  );
                })}
              </div>
            )}
            {hasLegacyImage && (
              <img src={msg.imageUrl!} alt="" className="max-w-full rounded-lg mb-1.5 cursor-pointer hover:opacity-90 transition-opacity" style={{ maxWidth: "min(100%, 450px)", maxHeight: "350px", objectFit: "contain" }} onClick={() => onImageClick(msg.imageUrl!)} loading="lazy" />
            )}
            {editing ? (
              <div className="flex flex-col gap-1">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                    else if (e.key === "Escape") { setEditing(false); setEditValue(msg.text || ""); }
                  }}
                  autoFocus rows={2}
                  className="bg-background/30 border border-border rounded p-1.5 text-sm text-foreground resize-none w-full"
                />
                <div className="flex gap-1 justify-end">
                  <button onClick={() => { setEditing(false); setEditValue(msg.text || ""); }} className="text-xs px-2 py-0.5 rounded hover:bg-muted"><X className="w-3 h-3 inline" /> Cancelar</button>
                  <button onClick={saveEdit} className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground hover:opacity-90">Salvar</button>
                </div>
              </div>
            ) : msg.text && isGiphyUrl(msg.text) ? (
              <img src={msg.text} alt="GIF" className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" style={{ maxWidth: "min(100%, 350px)", maxHeight: "300px", objectFit: "contain" }} onClick={() => onImageClick(msg.text!)} loading="lazy" />
            ) : msg.text && extractPollId(msg.text) ? (
              <PollCard pollId={extractPollId(msg.text)!} userId={viewerId} isOwn={isOwn} />
            ) : msg.text ? (
              <p className="break-words" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{linkifyText(msg.text)}</p>
            ) : null}
            {!editing && (
              <p className={`text-[10px] mt-1 ${isOwn ? "text-chat-own-foreground/60" : "text-muted-foreground"} text-right flex items-center justify-end gap-1`}>
                {msg.isEdited && <span className="italic opacity-70">(editada)</span>}
                {time}
              </p>
            )}
          </div>

          {!editing && (
            <div className={`absolute msg-actions z-10 ${isOwn ? "-left-44 max-sm:left-auto max-sm:right-0" : "-right-44 max-sm:right-auto max-sm:left-0"} top-1/2 -translate-y-1/2 max-sm:-top-9 max-sm:translate-y-0 max-sm:bg-popover max-sm:border max-sm:border-border max-sm:rounded-lg max-sm:px-1 max-sm:py-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all`}>
              {onReact && <ReactionPicker onPick={(e) => onReact(msg.id, e)} />}
              {msg.text && !isGiphyUrl(msg.text) && (
                <button onClick={handleCopy} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all" title="Copiar">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
              {onReply && (
                <button onClick={() => onReply(msg)} className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title="Responder">
                  <Reply className="w-3.5 h-3.5" />
                </button>
              )}
              {canEdit && onEdit && (
                <button onClick={() => { setEditing(true); setEditValue(msg.text || ""); }} className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title="Editar (até 5 min)">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {onTogglePin && (
                <button onClick={() => onTogglePin(msg.id, !!msg.isPinned)} className="p-1 rounded text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-all" title={msg.isPinned ? "Desafixar" : "Fixar"}>
                  {msg.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
              )}
              {isOwn && onDelete && (
                <button onClick={() => onDelete(msg.id)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" title="Apagar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {onReact && reactions && reactions.length > 0 && (
          <MessageReactions reactions={reactions} onToggle={(e) => onReact(msg.id, e)} />
        )}
      </div>
    </motion.div>
  );
}

export function DMView({ userId, username, friend, onBack }: DMViewProps) {
  const { messages, sendMessage, sendRawMessage, deleteMessage, editMessage, togglePin, uploading, uploadProgress } = useDirectMessages(userId, friend.id, friend.username, username);
  const dmCall = useCall();
  const dmPair = useMemo(() => [userId, friend.id].sort().join(":"), [userId, friend.id]);
  const [pollOpen, setPollOpen] = useState(false);
  const [text, setText] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; text: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [mentionState, setMentionState] = useState<{ active: boolean; query: string; start: number }>({ active: false, query: "", start: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { reactions, toggle: toggleReaction } = useMessageReactions(messageIds, userId);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => m.text?.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const pinnedMessages = useMemo(() => messages.filter((m) => m.isPinned), [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => () => revokePendingAttachments(attachments), []);
  useEffect(() => { if (replyingTo) inputRef.current?.focus(); }, [replyingTo]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const accepted = Array.from(files).filter(isAcceptedFile);
    if (accepted.length === 0) return;
    setAttachments((prev) => [...prev, ...accepted.map(createPendingAttachment)]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att) URL.revokeObjectURL(att.preview);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (!text.trim() && attachments.length === 0) return;
    await sendMessage(text.trim() || undefined, attachments.length > 0 ? attachments : undefined, replyingTo?.id);
    setText("");
    setShowEmojis(false);
    setShowGifs(false);
    setAttachments([]);
    setReplyingTo(null);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setText(v);
    const caret = e.target.selectionStart || v.length;
    let i = caret - 1;
    while (i >= 0) {
      const ch = v[i];
      if (ch === "@") {
        const prev = i === 0 ? " " : v[i - 1];
        if (/[\s>(\[{,;.!?]/.test(prev) || i === 0) {
          const q = v.slice(i + 1, caret);
          if (/^[a-zA-Z0-9_\-]{0,30}$/.test(q)) {
            setMentionState({ active: true, query: q, start: i });
            return;
          }
        }
        break;
      }
      if (/\s/.test(ch)) break;
      i--;
    }
    setMentionState({ active: false, query: "", start: 0 });
  };

  const handleMentionSelect = (uname: string) => {
    if (!mentionState.active) return;
    const caret = inputRef.current?.selectionStart || text.length;
    const before = text.slice(0, mentionState.start);
    const after = text.slice(caret);
    const next = `${before}@${uname} ${after}`;
    setText(next);
    setMentionState({ active: false, query: "", start: 0 });
    setTimeout(() => {
      const pos = before.length + uname.length + 2;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files: File[] = [];
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) addFiles(files);
  };

  const handleGifSelect = (gifUrl: string) => {
    sendMessage(gifUrl, undefined, replyingTo?.id);
    setShowGifs(false);
    setReplyingTo(null);
  };

  const handleReply = (msg: DirectMessage) => {
    setReplyingTo({ id: msg.id, senderName: msg.senderId === userId ? "Você" : friend.username, text: msg.text });
  };

  const jumpTo = (id: string) => {
    const el = document.querySelector(`[data-message-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2000);
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 h-full ${dragOver ? "ring-2 ring-primary ring-inset" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
      onDrop={handleDrop}
    >
      <header className="h-14 flex items-center gap-2 sm:gap-3 px-2 sm:px-4 border-b border-border glass">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {friend.avatar_url ? (
            <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-primary">{friend.username[0]?.toUpperCase()}</span>
          )}
        </div>
        <h2 className="font-semibold text-foreground text-sm flex-1 min-w-0 truncate">{friend.username}</h2>
        <button
          onClick={() => dmCall.startCall(friend.id, friend.username, friend.avatar_url || null, "voice")}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Chamada de voz"
        >
          <Phone className="w-4 h-4" />
        </button>
        <button
          onClick={() => dmCall.startCall(friend.id, friend.username, friend.avatar_url || null, "video")}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Chamada de vídeo"
        >
          <Video className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowSearch((s) => !s)}
          className={`p-1.5 rounded-lg transition-colors ${showSearch ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          title="Buscar mensagens"
        >
          <Search className="w-4 h-4" />
        </button>
      </header>

      {showSearch && (
        <div className="px-4 py-2 border-b border-border bg-background">
          <input
            type="text"
            placeholder="Buscar nesta conversa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
        </div>
      )}

      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-amber-500/5 flex items-center gap-2 overflow-x-auto">
          <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <div className="flex gap-2 text-xs">
            {pinnedMessages.map((m) => (
              <button
                key={m.id}
                onClick={() => jumpTo(m.id)}
                className="px-2 py-1 rounded bg-background/50 border border-border hover:border-amber-500/40 transition-colors max-w-[200px] truncate text-foreground"
                title={m.text || ""}
              >
                <span className="opacity-80">{m.text || "📎 Anexo"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {filteredMessages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {searchQuery ? "Nenhum resultado." : `Envie a primeira mensagem para ${friend.username}! 💬`}
          </div>
        )}
        {filteredMessages.map((msg) => (
          <DMBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.senderId === userId}
            viewerId={userId}
            onImageClick={setLightboxSrc}
            onDelete={deleteMessage}
            onReply={handleReply}
            onEdit={editMessage}
            onTogglePin={togglePin}
            onReact={toggleReaction}
            reactions={reactions[msg.id]}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative">
        {showEmojis && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full left-0 right-0 mb-2 mx-2 z-20">
            <div className="glass rounded-xl p-3 flex flex-wrap gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button key={emoji} onClick={() => { setText((p) => p + emoji); inputRef.current?.focus(); }} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted text-lg transition-colors">{emoji}</button>
              ))}
            </div>
          </motion.div>
        )}

        <GifPicker open={showGifs} onClose={() => setShowGifs(false)} onSelect={handleGifSelect} />
        <AttachmentTray attachments={attachments} onRemove={removeAttachment} uploadProgress={uploadProgress ?? null} />

        {replyingTo && (
          <div className="px-3 pt-2 pb-0">
            <div className="flex items-center gap-2 bg-secondary/80 rounded-lg px-3 py-2 text-xs">
              <div className="w-1 h-8 bg-primary rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary truncate">{replyingTo.senderName}</p>
                <p className="text-muted-foreground truncate">{replyingTo.text || "📎 Anexo"}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="p-2 sm:p-3 border-t border-border relative pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <MentionAutocomplete
            visible={mentionState.active}
            query={mentionState.query}
            onSelect={handleMentionSelect}
            onClose={() => setMentionState({ active: false, query: "", start: 0 })}
          />
          <div className="flex items-center gap-1 sm:gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Plus className="w-5 h-5" />
            </button>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_ANY_TYPES} multiple className="hidden" onChange={handleFileChange} />
<button
            type="button"
            onClick={() => setShowTools((v) => !v)}
            className={`sm:hidden p-2.5 rounded-xl transition-colors ${showTools ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            aria-label="Mais opções"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <div className={`${showTools ? "flex" : "hidden"} sm:contents max-sm:absolute max-sm:bottom-full max-sm:left-2 max-sm:mb-2 max-sm:z-20 max-sm:gap-1 max-sm:p-1 max-sm:rounded-xl max-sm:bg-popover max-sm:border max-sm:border-border max-sm:shadow-lg items-center`}>
            <button type="button" onClick={() => { setShowGifs(!showGifs); setShowEmojis(false); }} className={`p-2.5 rounded-xl transition-colors ${showGifs ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} title="GIFs">
              <ImageIcon className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => { setShowEmojis(!showEmojis); setShowGifs(false); }} className={`p-2.5 rounded-xl transition-colors ${showEmojis ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <Smile className="w-5 h-5" />
            </button>
            <VoiceRecorderButton
              userId={userId}
              disabled={uploading}
              onSend={(att) => sendRawMessage("", [att as AttachmentData], replyingTo?.id).then(() => setReplyingTo(null))}
            />
            <button
              type="button"
              onClick={() => setPollOpen(true)}
              className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Criar enquete"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          </div>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={handleTextChange}
              onPaste={handlePaste}
              placeholder="Digite sua mensagem..."
              className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base sm:text-sm transition-all"
              enterKeyHint="send"
            />
            <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={(!text.trim() && attachments.length === 0) || uploading} className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:brightness-110">
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
        </form>
      </div>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <PollCreatorModal
        open={pollOpen}
        onClose={() => setPollOpen(false)}
        userId={userId}
        dmPair={dmPair}
        onCreated={(pollId) => sendRawMessage(`${POLL_MARKER}${pollId}`, [], replyingTo?.id).then(() => setReplyingTo(null))}
      />
    </div>
  );
}
