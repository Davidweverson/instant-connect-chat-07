import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Thin typed wrapper — supabase.auth.oauth is beta and may not be in types yet.
const oauth = (supabase.auth as any).oauth as {
  getAuthorizationDetails: (
    id: string
  ) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (
    id: string
  ) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (
    id: string
  ) => Promise<{ data: any; error: { message: string } | null }>;
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      if (!oauth) {
        setError("OAuth server not available on this client.");
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent relative overflow-hidden px-4">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 w-full max-w-md relative z-10"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 glow-primary">
          <Shield className="w-7 h-7 text-primary" />
        </div>

        {error && (
          <div className="text-destructive text-sm text-center bg-destructive/10 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!details && !error && (
          <p className="text-center text-muted-foreground text-sm">Carregando…</p>
        )}

        {details && (
          <>
            <h1 className="text-xl font-bold text-center text-foreground mb-2">
              Conectar {details.client?.name ?? details.client?.client_name ?? "aplicativo"} à sua conta
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Isso permite que este aplicativo use o FlashChat como você — ler
              seus canais, mensagens recentes e enviar mensagens no seu nome.
            </p>

            <div className="flex flex-col gap-2">
              <button
                disabled={busy}
                onClick={() => decide(true)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-primary transition-all hover:brightness-110 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Aprovar
              </button>
              <button
                disabled={busy}
                onClick={() => decide(false)}
                className="w-full py-3 rounded-xl bg-secondary text-foreground font-semibold flex items-center justify-center gap-2 border border-border transition-all hover:bg-muted disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Negar
              </button>
            </div>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="hover:underline">Voltar ao FlashChat</Link>
        </p>
      </motion.div>
    </div>
  );
}
