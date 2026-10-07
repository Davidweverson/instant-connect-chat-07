// Edge function para enviar push notifications
// Chamado quando uma nova mensagem é criada
import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@flashchat.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

interface PushPayload {
  type: "chat" | "dm" | "friend_request";
  recipientUserIds?: string[]; // se omitido (chat), envia pra todos exceto sender
  senderId?: string;
  senderName: string;
  body: string;
  url?: string;
  roomName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    // Server-side JWT validation (checks signature + revocation)
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authUser = userData.user;

    const payload: PushPayload = await req.json();
    if (!payload.body) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-verified sender identity — never trust client payload
    const verifiedSenderId = authUser.id;
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", verifiedSenderId)
      .maybeSingle();
    const verifiedSenderName = senderProfile?.username || "Alguém";

    // Buscar inscrições
    let allowedRecipients: string[] | null = null;
    if (payload.recipientUserIds && payload.recipientUserIds.length > 0) {
      const requested = [...new Set(payload.recipientUserIds)].filter(
        (id) => typeof id === "string" && id !== verifiedSenderId
      );
      if (requested.length === 0 || requested.length > 100) {
        return new Response(JSON.stringify({ error: "Invalid recipients" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only allow recipients that share a real relationship with the sender:
      // accepted friendship, existing DM, or shared group membership.
      const [friends, dms, myGroups] = await Promise.all([
        supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${verifiedSenderId},addressee_id.eq.${verifiedSenderId}`),
        supabase
          .from("direct_messages")
          .select("sender_id, receiver_id")
          .or(`sender_id.eq.${verifiedSenderId},receiver_id.eq.${verifiedSenderId}`)
          .limit(1000),
        supabase.from("group_members").select("group_id").eq("user_id", verifiedSenderId),
      ]);

      const related = new Set<string>();
      for (const f of friends.data || []) {
        related.add(f.requester_id === verifiedSenderId ? f.addressee_id : f.requester_id);
      }
      for (const d of dms.data || []) {
        related.add(d.sender_id === verifiedSenderId ? d.receiver_id : d.sender_id);
      }
      const groupIds = (myGroups.data || []).map((g: any) => g.group_id);
      if (groupIds.length > 0) {
        const { data: peers } = await supabase
          .from("group_members")
          .select("user_id")
          .in("group_id", groupIds);
        for (const p of peers || []) related.add(p.user_id);
      }
      related.delete(verifiedSenderId);

      allowedRecipients = requested.filter((id) => related.has(id));
      if (allowedRecipients.length === 0) {
        return new Response(JSON.stringify({ sent: 0, total: 0 }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Broadcast (no recipients): only allowed for public chat, and the content is
    // taken from the sender's own message just saved in the database — never from the request.
    let broadcastBody: string | null = null;
    let broadcastRoom: string | null = null;
    if (!allowedRecipients) {
      if (payload.type !== "chat") {
        return new Response(JSON.stringify({ error: "Invalid recipients" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: prof } = await supabase
        .from("profiles").select("banned, muted_until").eq("id", verifiedSenderId).maybeSingle();
      if (!prof || prof.banned || (prof.muted_until && new Date(prof.muted_until) > new Date())) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const since = new Date(Date.now() - 60_000).toISOString();
      const { data: lastMsg } = await supabase
        .from("chat_messages")
        .select("text, room_id")
        .eq("user_id", verifiedSenderId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!lastMsg) {
        return new Response(JSON.stringify({ sent: 0, total: 0 }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: room } = await supabase
        .from("rooms").select("name").eq("id", lastMsg.room_id).maybeSingle();
      broadcastBody = lastMsg.text || "📎 Anexo";
      broadcastRoom = room?.name?.trim() || lastMsg.room_id;
    }

    let query = supabase.from("push_subscriptions").select("user_id, subscription, endpoint");
    if (allowedRecipients) {
      query = query.in("user_id", allowedRecipients);
    } else {
      query = query.neq("user_id", verifiedSenderId);
    }
    const { data: subs, error } = await query;
    if (error) throw error;

    const roomName = broadcastRoom ?? String(payload.roomName || "chat").slice(0, 60);
    const title =
      payload.type === "chat"
        ? `${verifiedSenderName} em #${roomName}`
        : payload.type === "dm"
        ? `Mensagem de ${verifiedSenderName}`
        : `${verifiedSenderName} adicionou você`;

    const url = typeof payload.url === "string" && payload.url.startsWith("/") && !payload.url.startsWith("//")
      ? payload.url.slice(0, 200)
      : "/";
    const notif = JSON.stringify({
      title,
      body: (broadcastBody ?? String(payload.body)).slice(0, 120),
      url,
      tag: payload.type + verifiedSenderId,
    });

    const results = await Promise.allSettled(
      (subs || []).map(async (s: any) => {
        try {
          await webpush.sendNotification(s.subscription, notif);
        } catch (err: any) {
          // Inscrição expirada/inválida -> apaga
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", s.endpoint);
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sent, total: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("[send-push] error", e);
    return new Response(JSON.stringify({ error: e.message || "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
