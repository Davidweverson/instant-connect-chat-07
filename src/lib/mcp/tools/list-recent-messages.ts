import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_recent_messages",
  title: "List recent messages",
  description: "List the most recent messages in a FlashChat room (default 50, max 100).",
  inputSchema: {
    room_id: z.string().min(1).describe("Room id (e.g. 'general')."),
    limit: z.number().int().min(1).max(100).optional().describe("Max messages to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ room_id, limit }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, sender, text, created_at, user_id")
      .eq("room_id", room_id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const ordered = (data ?? []).slice().reverse();
    return {
      content: [{ type: "text", text: JSON.stringify(ordered) }],
      structuredContent: { messages: ordered },
    };
  },
});
