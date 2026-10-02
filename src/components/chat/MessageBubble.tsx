import { motion } from "framer-motion";
import { Trash2, Play, Reply, Copy, Check, Flag, Pencil, Pin, PinOff, X, MessagesSquare, Ban } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Message } from "@/lib/chat-store";
import { isVideoUrl } from "@/lib/image-utils";
import { formatMessageTimestamp } from "@/lib/format-timestamp";
import { MessageReactions, ReactionPicker } from "./MessageReactions";
import { FileAttachmentCard } from "./FileAttachmentCard";
import { VoiceMessage } from "./VoiceMessage";
import { PollCard } from "./PollCard";
import { extractPollId } from "@/lib/polls";
import type { Reaction } from "@/lib/message-reactions";
import { useNameFont } from "@/lib/name-font-cache";
import { FlashPackCard, isFlashPackMessage } from "@/components/flashforge/FlashPackCard";

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

function truncateUrl(url: string, max = 40): string {
  if (url.length <= max) return url;
  return url.slice(0, max) + "...";
}

function linkifyText(text: string): ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:opacity-80 transition-opacity break-all">{truncateUrl(part)}</a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function isGiphyUrl(text: string): boolean {
  return /^https?:\/\/.*giphy\.com\/.*\.(gif|webp)/i.test(text.trim()) ||
         /^https?:\/\/media[0-9]*\.giphy\.com\//i.test(text.trim());
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onImageClick?: (url: string) => void;
  onReply?: (message: Message) => void;
  onReport?: (message: Message) => void;
  onEdit?: (id: string, newText: string) => void;
  onPin?: (id: string, currentlyPinned: boolean) => void;
  onReact?: (id: string, emoji: string) => void;
  reactions?: Reaction[];
  showAvatar?: boolean;
  showTimestamp?: boolean;
  currentUserId?: string;
  replyCount?: number;
  onOpenThread?: (parentId: string) => void;
  onBlockUser?: (userId: string, username: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  isAdmin,
  onDelete,
  onImageClick,
  onReply,
  onReport,
  onEdit,
  onPin,
  onReact,
  reactions,
  showAvatar = true,
  showTimestamp = true,
  currentUserId,
  replyCount = 0,
  onOpenThread,
  onBlockUser,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.text);
  const time = formatMessageTimestamp(message.timestamp);
  const nameFont = useNameFont(message.senderId);

  const canDelete = isOwn || isAdmin;
  const ageMin = (Date.now() - message.timestamp.getTime()) / 1000 / 60;
  const canEdit = isOwn && ageMin < 5 && !!message.text && !isGiphyUrl(message.text);

  const handleCopy = () => {
    if (!message.text) return;
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleEditSave = () => {
    const v = editValue.trim();
    if (v && v !== message.text) onEdit?.(message.id, v);
    setIsEditing(false);
  };

  const truncateReplyText = (text: string, max = 60) => {
    if (text.length <= max) return text;
    return text.slice(0, max) + "...";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      tabIndex={-1}
      className={`msg-row flex ${isOwn ? "justify-end" : "justify-start"} mb-1 group outline-none`}
      data-message-id={message.id}
    >
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 mr-2 mt-5">
          {message.senderAvatar ? (
            <img src={message.senderAvatar} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-xs font-bold text-muted-foreground">{message.sender[0]?.toUpperCase()}</span>
          )}
        </div>
      )}

      <div className={`ff-bubble-col ${isOwn ? "items-end" : "items-start"} flex flex-col min-w-0`}>
        {!isOwn && (
          <Link to={`/u/${message.sender}`} style={nameFont} className="text-xs font-medium text-primary ml-1 mb-0.5 hover:underline">{message.sender}</Link>
        )}
        {message.isPinned && (
          <span className="text-[10px] flex items-center gap-1 text-amber-500 ml-1 mb-0.5">
            <Pin className="w-3 h-3" /> Fixada
          </span>
        )}
        <div className="relative">
          <div
            className={`
              px-4 py-2.5 rounded-2xl text-sm leading-relaxed overflow-hidden
              ${isOwn ? "chat-bubble-own rounded-br-md" : "chat-bubble-other rounded-bl-md"}
              ${message.isPinned ? "ring-2 ring-amber-500/40" : ""}
            `}
          >
            {/* Reply quote */}
            {message.replyTo && (
              <div className="flex items-stretch gap-0 mb-2 rounded-lg overflow-hidden bg-black/10">
                <div className="w-1 bg-primary flex-shrink-0" />
                <div className="px-2.5 py-1.5 min-w-0 overflow-hidden">
                  <p className="text-xs font-semibold text-primary truncate">{message.replyTo.sender}</p>
                  <p className="text-xs opacity-70 truncate">{truncateReplyText(message.replyTo.text || "📎 Anexo")}</p>
                </div>
              </div>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className={`flex flex-col gap-1.5 ${message.text ? "mb-2" : ""}`}>
                {message.attachments.map((att, i) => {
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
                      <div key={i} className="relative max-w-full rounded-lg overflow-hidden cursor-pointer group" style={{ maxWidth: "min(100%, 450px)" }} onClick={() => onImageClick?.(url)}>
                        <video
                          src={att.thumbnailUrl && !isVideoUrl(att.thumbnailUrl) ? undefined : url}
                          poster={att.thumbnailUrl && !isVideoUrl(att.thumbnailUrl) ? att.thumbnailUrl : undefined}
                          className="max-w-full rounded-lg"
                          style={{ maxHeight: "350px", objectFit: "contain" }}
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                          <div className="w-12 h-12 rounded-full bg-background/80 flex items-center justify-center">
                            <Play className="w-6 h-6 text-foreground ml-0.5" />
                          </div>
                        </div>
                      </div>
                    );
                  }
                  if (isImg) {
                    return (
                      <img
                        key={i}
                        src={att.thumbnailUrl || att.url}
                        alt={att.fileName || ""}
                        className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ maxWidth: "min(100%, 450px)", maxHeight: "350px", objectFit: "contain" }}
                        onClick={() => onImageClick?.(url)}
                        loading="lazy"
                      />
                    );
                  }
                  return (
                    <FileAttachmentCard key={i} url={url} fileName={att.fileName} size={att.size} mimeType={att.mimeType} />
                  );
                })}
              </div>
            )}
            {isEditing ? (
              <div className="flex flex-col gap-1">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleEditSave();
                    } else if (e.key === "Escape") {
                      setIsEditing(false);
                      setEditValue(message.text);
                    }
                  }}
                  autoFocus
                  rows={2}
                  className="bg-background/30 border border-border rounded p-1.5 text-sm text-foreground resize-none w-full"
                />
                <div className="flex gap-1 justify-end">
                  <button onClick={() => { setIsEditing(false); setEditValue(message.text); }} className="text-xs px-2 py-0.5 rounded hover:bg-muted">
                    <X className="w-3 h-3 inline" /> Cancelar
                  </button>
                  <button onClick={handleEditSave} className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground hover:opacity-90">
                    Salvar
                  </button>
                </div>
              </div>
            ) : message.text && isGiphyUrl(message.text) ? (
              <img
                src={message.text}
                alt="GIF"
                className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxWidth: "min(100%, 350px)", maxHeight: "300px", objectFit: "contain" }}
                onClick={() => onImageClick?.(message.text)}
                loading="lazy"
              />
            ) : message.text && isFlashPackMessage(message.text) ? (
              <FlashPackCard text={message.text} />
            ) : message.text && extractPollId(message.text) ? (
              <PollCard pollId={extractPollId(message.text)!} userId={currentUserId || message.senderId} isOwn={isOwn} />
            ) : message.text ? (
              <p className="break-words whitespace-pre-wrap overflow-wrap-anywhere" style={{ overflowWrap: "anywhere", wordBreak: "break-word", fontSize: "var(--chat-font-size)" }}>{linkifyText(message.text)}</p>
            ) : null}
            {showTimestamp && !isEditing && (
              <p className={`text-[10px] mt-1 ${isOwn ? "text-chat-own-foreground/60" : "text-muted-foreground"} text-right whitespace-nowrap flex items-center justify-end gap-1`}>
                {message.isEdited && <span className="italic opacity-70">(editada)</span>}
                {time}
              </p>
            )}
          </div>

          {/* Action buttons */}
          {!isEditing && (
            <div className={`absolute -top-9 ${isOwn ? "right-0" : "left-0"} z-10 msg-actions flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all bg-popover/95 backdrop-blur border border-border rounded-lg shadow-lg px-1 py-0.5`}>
              {onReact && (
                <ReactionPicker onPick={(e) => onReact(message.id, e)} />
              )}
              {message.text && !isGiphyUrl(message.text) && (
                <button
                  onClick={handleCopy}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  title="Copiar mensagem"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
              {onReply && (
                <button
                  onClick={() => onReply(message)}
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  title="Responder"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>
              )}
              {onOpenThread && (
                <button
                  onClick={() => onOpenThread(message.id)}
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  title="Abrir thread"
                >
                  <MessagesSquare className="w-3.5 h-3.5" />
                </button>
              )}
              {canEdit && onEdit && (
                <button
                  onClick={() => { setIsEditing(true); setEditValue(message.text); }}
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  title="Editar (até 5 min)"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {isAdmin && onPin && (
                <button
                  onClick={() => onPin(message.id, !!message.isPinned)}
                  className="p-1 rounded text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                  title={message.isPinned ? "Desafixar" : "Fixar"}
                >
                  {message.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
              )}
              {!isOwn && onReport && (
                <button
                  onClick={() => onReport(message)}
                  className="p-1 rounded text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                  title="Denunciar"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              )}
              {!isOwn && onBlockUser && (
                <button
                  onClick={() => onBlockUser(message.senderId, message.sender)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  title="Bloquear usuário"
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  onClick={() => onDelete(message.id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  title="Apagar mensagem"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Thread badge */}
        {onOpenThread && replyCount > 0 && (
          <button
            onClick={() => onOpenThread(message.id)}
            className={`mt-1 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors ${isOwn ? "self-end" : "self-start"}`}
          >
            <MessagesSquare className="w-3 h-3" />
            {replyCount} {replyCount === 1 ? "resposta" : "respostas"}
          </button>
        )}

        {/* Reactions row */}
        {onReact && reactions && reactions.length > 0 && (
          <MessageReactions reactions={reactions} onToggle={(e) => onReact(message.id, e)} />
        )}
      </div>
    </motion.div>
  );
}
