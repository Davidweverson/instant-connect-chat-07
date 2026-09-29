// Página de perfil público /u/:username
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Hash, MessageSquare, UserPlus, Check, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMessageTimestamp } from "@/lib/format-timestamp";
import { nameColorStyle } from "@/lib/name-colors";
import { nameFontStyle } from "@/lib/fonts";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";


interface PublicProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  status_text: string | null;
  status_emoji: string | null;
  name_color: string | null;
  name_font: string | null;
  created_at: string;
  banned: boolean;
  accept_friend_requests: boolean;
}


interface RecentMessage {
  id: string;
  text: string;
  room_id: string;
  created_at: string;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [messages, setMessages] = useState<RecentMessage[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string; emoji: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "accepted" | "self">("none");
  const [sending, setSending] = useState(false);


  useEffect(() => {
    if (!username) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", username)
        .maybeSingle();
      if (cancel) return;
      if (!prof) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const p = prof as any;
      setProfile({
        id: p.id,
        username: p.username,
        avatar_url: p.avatar_url,
        bio: p.bio,
        status_text: p.status_text,
        status_emoji: p.status_emoji,
        name_color: p.name_color,
        name_font: p.name_font ?? null,
        created_at: p.created_at,
        banned: p.banned,
        accept_friend_requests: p.accept_friend_requests ?? true,
      });

      // Status de amizade
      if (me?.id) {
        if (me.id === p.id) {
          setFriendStatus("self");
        } else {
          const { data: f } = await supabase
            .from("friendships")
            .select("status")
            .or(`and(requester_id.eq.${me.id},addressee_id.eq.${p.id}),and(requester_id.eq.${p.id},addressee_id.eq.${me.id})`)
            .maybeSingle();
          if (f) setFriendStatus((f as any).status === "accepted" ? "accepted" : "pending");
          else setFriendStatus("none");
        }
      }


      const [{ data: msgs }, { data: rs }] = await Promise.all([
        supabase
          .from("chat_messages")
          .select("id, text, room_id, created_at")
          .eq("user_id", p.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("rooms").select("id, name, emoji"),
      ]);
      if (cancel) return;
      setMessages((msgs as RecentMessage[]) || []);
      setRooms((rs as any[]) || []);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent px-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Usuário não encontrado</h1>
        <p className="text-muted-foreground mb-4">@{username} não existe no FlashChat.</p>
        <Link to="/" className="text-primary hover:underline">Voltar ao chat</Link>
      </div>
    );
  }

  // Apenas salas onde escreveu
  const roomIds = Array.from(new Set(messages.map((m) => m.room_id)));
  const participatedRooms = rooms.filter((r) => roomIds.includes(r.id));

  const handleSendFriendRequest = async () => {
    if (!me?.id || !profile) return;
    if (!profile.accept_friend_requests) {
      toast.error("Este usuário desativou pedidos pelo perfil. Use o código de amigo.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("friendships").insert({
      requester_id: me.id,
      addressee_id: profile.id,
    });
    setSending(false);
    if (error) {
      toast.error("Não foi possível enviar o pedido.");
    } else {
      setFriendStatus("pending");
      toast.success("Pedido de amizade enviado!");
    }
  };



  return (
    <div className="min-h-screen bg-transparent">
      <header className="h-14 flex items-center gap-3 px-4 border-b border-border glass">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Perfil</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="flex items-start gap-5 mb-8">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-border">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-muted-foreground">
                {profile.username[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-2xl font-bold truncate"
              style={{ ...(profile.name_color ? nameColorStyle(profile.name_color) : { color: "hsl(var(--foreground))" }), ...nameFontStyle(profile.name_font) }}
            >
              {profile.username}
              {profile.banned && (
                <span className="ml-2 text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                  Banido
                </span>
              )}
            </h2>
            {(profile.status_emoji || profile.status_text) && (
              <p className="text-sm text-foreground/80 mt-1">
                {profile.status_emoji} {profile.status_text}
              </p>
            )}
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap break-words">
                {profile.bio}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Membro desde {new Date(profile.created_at).toLocaleDateString("pt-BR")}
            </p>

            {me && friendStatus !== "self" && (
              <div className="mt-4">
                {friendStatus === "accepted" ? (
                  <Button size="sm" variant="secondary" disabled className="gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Vocês são amigos
                  </Button>
                ) : friendStatus === "pending" ? (
                  <Button size="sm" variant="secondary" disabled className="gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Pedido enviado
                  </Button>
                ) : !profile.accept_friend_requests ? (
                  <Button size="sm" variant="outline" disabled className="gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Aceita apenas por código
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSendFriendRequest} disabled={sending} className="gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    {sending ? "Enviando..." : "Enviar pedido de amizade"}
                  </Button>
                )}
              </div>
            )}
          </div>

        </div>

        <section className="mb-8">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Hash className="w-3.5 h-3.5" />
            Salas que participa ({participatedRooms.length})
          </h3>
          {participatedRooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não enviou mensagens em nenhuma sala.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participatedRooms.map((r) => (
                <span key={r.id} className="px-3 py-1 rounded-full bg-secondary text-sm text-foreground border border-border">
                  {r.emoji} {r.name}
                </span>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Mensagens públicas recentes
          </h3>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem pública ainda.</p>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => {
                const room = rooms.find((r) => r.id === m.room_id);
                return (
                  <div key={m.id} className="p-3 rounded-lg bg-secondary/40 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {room?.emoji} {room?.name || m.room_id}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatMessageTimestamp(new Date(m.created_at))}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words whitespace-pre-wrap">{m.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
