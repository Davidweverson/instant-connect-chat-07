import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, ShieldAlert } from "lucide-react";

interface RiskRow {
  user_id: string;
  username: string;
  created_at: string;
  banned: boolean;
  score: number;
  reasons: string[];
  restricted_until: string | null;
  reviewed: boolean;
  linked_banned: string[];
  shared_device_accounts: string[];
}

export function AdminEvasion() {
  const [rows, setRows] = useState<RiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_risk_overview" as any);
    if (error) setError(error.message);
    else { setError(null); setRows((data as any) || []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setRestriction = async (uid: string, hours: number) => {
    const { error } = await supabase.rpc("admin_set_risk_restriction" as any, { _uid: uid, _hours: hours });
    if (error) setError(error.message);
    load();
  };

  const isRestricted = (r: RiskRow) => r.restricted_until && new Date(r.restricted_until) > new Date();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Possíveis evasões de ban</h2>
          <p className="text-xs text-muted-foreground">Contas ligadas a contas banidas ou com comportamento suspeito. Nenhum ban é automático.</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-secondary"><RefreshCw className="w-4 h-4 text-muted-foreground" /></button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? <p className="text-sm text-muted-foreground text-center py-4">Carregando…</p> :
        rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conta suspeita no momento.</p> :
        rows.map((r) => (
          <div key={r.user_id} className="p-3 rounded-xl bg-secondary border border-border space-y-1.5 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-foreground">{r.username}</strong>
              <span className={`text-xs px-2 py-0.5 rounded-full ${r.score >= 60 ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>risco {r.score}</span>
              {r.banned && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">banido</span>}
              {isRestricted(r) && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">limitado até {new Date(r.restricted_until!).toLocaleString("pt-BR")}</span>}
              <span className="text-xs text-muted-foreground ml-auto">conta criada {new Date(r.created_at).toLocaleString("pt-BR")}</span>
            </div>
            {r.reasons?.length > 0 && <p className="text-xs text-muted-foreground">Motivos: {r.reasons.join(" · ")}</p>}
            {r.linked_banned?.length > 0 && <p className="text-xs"><span className="text-muted-foreground">Ligada a banidos:</span> <span className="text-destructive">{r.linked_banned.join(", ")}</span></p>}
            {r.shared_device_accounts?.length > 0 && <p className="text-xs"><span className="text-muted-foreground">Mesmo dispositivo:</span> {r.shared_device_accounts.join(", ")}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setRestriction(r.user_id, 72)} className="px-3 py-1.5 rounded-lg bg-muted text-xs hover:bg-muted/80">Limitar 72h</button>
              <button onClick={() => setRestriction(r.user_id, 0)} className="px-3 py-1.5 rounded-lg bg-muted text-xs hover:bg-muted/80">Liberar / marcar revisado</button>
            </div>
          </div>
        ))}
    </div>
  );
}
