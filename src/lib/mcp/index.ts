import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listRooms from "./tools/list-rooms";
import listRecentMessages from "./tools/list-recent-messages";
import sendMessage from "./tools/send-message";
import getMyProfile from "./tools/get-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "flashchat-mcp",
  title: "FlashChat MCP",
  version: "0.1.0",
  instructions:
    "Tools for FlashChat. Use `list_rooms` to discover chat rooms, `list_recent_messages` to read a room, `send_message` to post as the signed-in user, and `get_my_profile` for account info.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listRooms, listRecentMessages, sendMessage, getMyProfile],
});
