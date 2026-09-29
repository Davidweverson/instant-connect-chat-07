import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowLeft, Ban, CheckCircle, VolumeX, Volume2, UserCheck, Flag, MessageSquare, Clock, Search, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminBannedWords } from "@/components/chat/AdminBannedWords";

type Tab = "moderation" | "reports" | "logs" | "words";

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  message_id: string | null;
  message_text: string | null;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reporter_username?: string;
  reported_username?: string;
}

interface LogEntry {
  id: string;
  text: string;
  sender: string;
  room_id: string;
  created_at: string;
  user_id: string | null;
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>("moderation");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Header */}
      <header className="h-14 flex items-center gap-3 px-4 border-b border-border glass">
        <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <Shield className="w-5 h-5 text-accent" />
        <h1 className="text-lg font-bold text-foreground">Painel Admin</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border px-4">
        {([
          { id: "moderation" as Tab, label: "Moderação", icon: Ban },
          { id: "reports" as Tab, label: "Denúncias", icon: Flag },
          { id: "words" as Tab, label: "Palavras", icon: ShieldAlert },
          { id: "logs" as Tab, label: "Histórico", icon: MessageSquare },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        {tab === "moderation" && <ModerationTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "words" && <AdminBannedWords />}
        {tab === "logs" && <LogsTab />}
      </div>
    </div>
  );
}

function ModerationTab() {
  const [target, setTarget] = useState("");
  const [action, setAction] = useState<"ban" | "unban" | "mute" | "unmute">("ban");
  const [muteDuration, setMuteDuration] = useState("10");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!target.trim()) { setError("Informe o username ou email"); return; }

    setLoading(true);
    try {
      const body: any = { action, target: target.trim() };
      if (action === "mute") body.duration_minutes = Number(muteDuration) || 10;

      const { data, error: fnError } = await supabase.functions.invoke("moderate-user", { body });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setSuccess(`${data?.message || "Ação executada com sucesso"}. A sessão do usuário será atualizada imediatamente.`);
      setTarget("");
    } catch (err: any) {
      setError(err.message || "Erro ao executar ação");
    } finally {
      setLoading(false);
    }
  };

  const actions = [
    { value: "ban" as const, label: "Banir", icon: Ban, color: "text-destructive" },
    { value: "unban" as const, label: "Desbanir", icon: UserCheck, color: "text-primary" },
    { value: "mute" as const, label: "Mutar", icon: VolumeX, color: "text-orange-500" },
    { value: "unmute" as const, label: "Desmutar", icon: Volume2, color: "text-primary" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Moderação de Usuários</h2>

      <div className="flex gap-2 flex-wrap">
        {actions.map((a) => (
          <button
            key={a.value}
            onClick={() => setAction(a.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              action === a.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            <a.icon className={`w-4 h-4 ${action === a.value ? "text-primary" : a.color}`} />
            {a.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Username ou email do usuário"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        />

        {action === "mute" && (
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <select
              value={muteDuration}
              onChange={(e) => setMuteDuration(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="5">5 minutos</option>
              <option value="10">10 minutos</option>
              <option value="30">30 minutos</option>
              <option value="60">1 hora</option>
              <option value="360">6 horas</option>
              <option value="1440">24 horas</option>
              <option value="10080">7 dias</option>
            </select>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm bg-destructive/10 py-2 px-3 rounded-lg">
              {error}
            </motion.p>
          )}
          {success && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary text-sm bg-primary/10 py-2 px-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
            action === "ban" || action === "mute"
              ? "bg-destructive text-destructive-foreground hover:brightness-110"
              : "bg-primary text-primary-foreground hover:brightness-110"
          }`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            actions.find((a) => a.value === action)?.label
          )}
        </button>
      </form>
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      // Load usernames
      const userIds = new Set<string>();
      data.forEach((r: any) => { userIds.add(r.reporter_id); userIds.add(r.reported_user_id); });
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", Array.from(userIds));
      const nameMap = new Map(profiles?.map((p: any) => [p.id, p.username]) || []);

      setReports(data.map((r: any) => ({
        ...r,
        reporter_username: nameMap.get(r.reporter_id) || "Desconhecido",
        reported_username: nameMap.get(r.reported_user_id) || "Desconhecido",
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("reports").update({ status, reviewed_at: new Date().toISOString() } as any).eq("id", id);
    loadReports();
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Flag className="w-5 h-5 text-orange-500" />
        Denúncias ({reports.length})
      </h2>

      {reports.length === 0 && (
        <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma denúncia recebida.</p>
      )}

      {reports.map((r) => (
        <div key={r.id} className="p-4 rounded-xl bg-secondary border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                r.status === "pending" ? "bg-orange-500/20 text-orange-500" :
                r.status === "reviewed" ? "bg-primary/20 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {r.status === "pending" ? "Pendente" : r.status === "reviewed" ? "Revisado" : "Descartado"}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">Denunciante:</span> <strong>{r.reporter_username}</strong>
            {" → "}
            <span className="text-muted-foreground">Denunciado:</span> <strong className="text-destructive">{r.reported_username}</strong>
          </p>
          <p className="text-sm"><span className="text-muted-foreground">Motivo:</span> {r.reason}</p>
          {r.message_text && (
            <div className="p-2 rounded-lg bg-background text-xs text-muted-foreground border border-border">
              <p className="font-medium text-foreground mb-0.5">Mensagem denunciada:</p>
              <p className="break-words">{r.message_text}</p>
            </div>
          )}
          {r.status === "pending" && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => updateStatus(r.id, "reviewed")}
                className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                ✓ Marcar Revisado
              </button>
              <button
                onClick={() => updateStatus(r.id, "dismissed")}
                className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
              >
                ✕ Descartar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("all");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("chat_messages")
      .select("id, text, sender, room_id, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(200);

    if (roomFilter !== "all") {
      query = query.eq("room_id", roomFilter);
    }

    const { data } = await query;
    setLogs((data as LogEntry[]) || []);
    setLoading(false);
  }, [roomFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = search
    ? logs.filter((l) => l.text.toLowerCase().includes(search.toLowerCase()) || l.sender.toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        Histórico de Mensagens
      </h2>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar mensagens ou usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">Todas as salas</option>
          <option value="geral">Bate-Papo</option>
          <option value="jogos">Métodos/Sites</option>
          <option value="musica">Sobre escola</option>
          <option value="random">Caos/Zoeira</option>
          <option value="tecnologia">Atualizações</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Nenhuma mensagem encontrada.</p>}
          {filtered.map((log) => (
            <div key={log.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-sm">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded whitespace-nowrap">{log.room_id}</span>
              <span className="font-medium text-primary whitespace-nowrap">{log.sender}</span>
              <span className="text-foreground break-words min-w-0 flex-1">{log.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
