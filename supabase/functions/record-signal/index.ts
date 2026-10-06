import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hash(value: string, salt: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${value}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) return json({ error: "Token inválido" }, 401);

    const body = await req.json().catch(() => ({}));
    const deviceRaw = typeof body.device_id === "string" ? body.device_id.slice(0, 100) : "";
    const ipRaw = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "").split(",")[0].trim();
    const uaRaw = (req.headers.get("user-agent") || "").slice(0, 300);

    const salt = serviceKey;
    const device = deviceRaw ? await hash(`d:${deviceRaw}`, salt) : null;
    const ip = ipRaw ? await hash(`i:${ipRaw}`, salt) : null;
    const ua = uaRaw ? await hash(`u:${uaRaw}`, salt) : null;

    const admin = createClient(url, serviceKey);
    const { error: rpcError } = await admin.rpc("record_account_signal", {
      _uid: user.id, _device: device, _ip: ip, _ua: ua,
    });
    if (rpcError) {
      console.error("[record-signal]", rpcError);
      return json({ error: "Erro interno" }, 500);
    }
    return json({ ok: true });
  } catch (e) {
    console.error("[record-signal]", e);
    return json({ error: "Erro interno" }, 500);
  }
});
