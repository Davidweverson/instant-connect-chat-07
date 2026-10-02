import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, LogIn, Users, ArrowLeft, Crown, MessageSquare, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { JoinByCodeModal } from "@/components/groups/JoinByCodeModal";
import { GroupView } from "@/components/groups/GroupView";
import { FlashLogo } from "@/components/FlashLogo";


function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function Groups() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { groups, loading, createGroup, joinByCode } = useGroups(user?.id);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  

  if (!user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (activeGroupId) {
    return (
      <div className="flex h-[100dvh] w-full max-w-full overflow-hidden bg-transparent">
        <GroupView groupId={activeGroupId} userId={user.id} username={profile.username} onBack={() => setActiveGroupId(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <header className="h-14 flex items-center gap-3 px-4 border-b border-border glass sticky top-0 z-20 shadow-[0_10px_30px_hsl(var(--background)/0.25)]">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <FlashLogo className="w-5 h-5 text-primary" />
        <h1 className="font-display text-lg text-foreground">Grupos</h1>
        <div className="flex-1" />
        <button onClick={() => setJoinOpen(true)} className="px-3 py-1.5 rounded-lg text-sm text-foreground bg-muted hover:bg-muted/70 flex items-center gap-1.5">
          <LogIn className="w-3.5 h-3.5" /> Código
        </button>
        <button onClick={() => setCreateOpen(true)} className="px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Criar
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {loading ? (
          <div className="mt-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="mt-20 text-center animate-fade-in">
            <div className="relative w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4 shadow-[0_0_45px_hsl(var(--primary)/0.22)]">
              <Users className="w-8 h-8 text-primary" />
              <Sparkles className="absolute -right-1 top-2 w-4 h-4 text-accent animate-pulse" />
            </div>
            <h2 className="font-display text-xl text-foreground mb-2">Você ainda não está em nenhum grupo</h2>
            <p className="text-sm text-muted-foreground mb-6">Crie um grupo ou entre em um usando um código de convite.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setCreateOpen(true)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Criar grupo
              </button>
              <button onClick={() => setJoinOpen(true)} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/70 flex items-center gap-2">
                <LogIn className="w-4 h-4" /> Entrar por código
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {groups.map((g) => (
              <motion.button
                key={g.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveGroupId(g.id)}
                className="text-left p-4 rounded-2xl glass hover:border-primary/50 transition-all shadow-[0_10px_35px_hsl(var(--background)/0.22)] hover:shadow-[0_0_35px_hsl(var(--primary)/0.14)] animate-fade-in"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {g.photo_url ? <img src={g.photo_url} alt="" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-foreground truncate">{g.name}</h3>
                      {g.role === "admin" && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    </div>
                    {g.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{g.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {g.member_count}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {timeAgo(g.last_activity_at)}</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </main>

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createGroup} userId={user.id} />
      <JoinByCodeModal open={joinOpen} onClose={() => setJoinOpen(false)} onJoin={joinByCode} />
    </div>
  );
}
