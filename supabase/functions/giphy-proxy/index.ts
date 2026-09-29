// Giphy proxy - keeps API key server-side
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GIPHY_API_KEY = Deno.env.get("GIPHY_API_KEY")!;
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").slice(0, 100);
    const offsetRaw = parseInt(url.searchParams.get("offset") || "0", 10);
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.min(offsetRaw, 500)) : 0;

    const endpoint = q.trim()
      ? `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=20&offset=${offset}&rating=pg-13&lang=pt`
      : `${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=20&offset=${offset}&rating=pg-13`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      return new Response(JSON.stringify({ data: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const json = await res.json();
    const data = (json.data || []).map((g: any) => ({
      id: g.id,
      title: g.title || "",
      preview: g.images?.fixed_width_small?.url || g.images?.fixed_width?.url || "",
      original: g.images?.original?.url || "",
      width: parseInt(g.images?.original?.width || "0", 10),
      height: parseInt(g.images?.original?.height || "0", 10),
    }));
    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[giphy-proxy]", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
