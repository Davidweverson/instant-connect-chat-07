import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "send_message",
  title: "Send message to room",
  description: "Send a text message to a FlashChat room as the signed-in user.",
  inputSchema: {
    room_id: z.string().min(1).describe("Room id to post to (e.g. 'general')."),
    text: z.string().trim().min(1).max(2000).describe("Message text."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ room_id, text }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = ctx.getUserId();
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();
    if (pErr) return { content: [{ type: "text", text: pErr.message }], isError: true };

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ room_id, text, user_id: userId, sender: (profile as any).username })
      .select("id, room_id, text, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Sent message ${data!.id}` }],
      structuredContent: { message: data },
    };
  },
});
