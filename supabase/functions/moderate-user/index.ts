import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Acesso negado: apenas admins" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, target, duration_minutes } = await req.json();

    if (!target || typeof target !== "string") {
      return new Response(
        JSON.stringify({ error: "Informe o username ou email do alvo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find target user
    let targetUserId: string | null = null;
    const { data: profileByUsername } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", target.trim())
      .maybeSingle();

    if (profileByUsername) {
      targetUserId = profileByUsername.id;
    } else {
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const found = users?.find((u: any) => u.email === target.trim());
      if (found) targetUserId = found.id;
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetUserId === user.id) {
      return new Response(
        JSON.stringify({ error: "Você não pode moderar a si mesmo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updateData: Record<string, any> = {};
    let message = "";

    switch (action) {
      case "ban":
        updateData = { banned: true };
        message = "Usuário banido com sucesso";
        break;
      case "unban":
        updateData = { banned: false };
        message = "Usuário desbanido com sucesso";
        break;
      case "mute": {
        const mins = Number(duration_minutes) || 10;
        const until = new Date(Date.now() + mins * 60 * 1000).toISOString();
        updateData = { muted_until: until };
        message = `Usuário mutado por ${mins} minutos`;
        break;
      }
      case "unmute":
        updateData = { muted_until: null };
        message = "Usuário desmutado com sucesso";
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida. Use: ban, unban, mute, unmute" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update(updateData)
      .eq("id", targetUserId);

    if (updateError) {
      console.error("[moderate-user] update error", updateError);
      return new Response(
        JSON.stringify({ error: "Erro interno" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[moderate-user] error", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
