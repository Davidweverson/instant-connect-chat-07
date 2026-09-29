import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

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

    // Verify the caller's identity
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

    // Check caller's role server-side
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Acesso negado: apenas admins podem banir usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    const { target } = await req.json();
    if (!target || typeof target !== "string" || target.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Informe o username ou email do usuário alvo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedTarget = target.trim();

    // Find target user by username or email
    let targetUserId: string | null = null;

    // Try by username first
    const { data: profileByUsername } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", trimmedTarget)
      .maybeSingle();

    if (profileByUsername) {
      targetUserId = profileByUsername.id;
    } else {
      // Try by email via auth admin API
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const foundUser = users?.find((u: any) => u.email === trimmedTarget);
      if (foundUser) {
        targetUserId = foundUser.id;
      }
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Don't allow banning yourself
    if (targetUserId === user.id) {
      return new Response(
        JSON.stringify({ error: "Você não pode banir a si mesmo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ban the user
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ banned: true })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("[ban-user] update error", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao banir usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Usuário banido com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ban-user] error", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
