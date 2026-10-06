export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_signals: {
        Row: {
          created_at: string
          device_hash: string | null
          id: string
          ip_hash: string | null
          last_seen_at: string
          ua_hash: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_hash?: string | null
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          ua_hash?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_hash?: string | null
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          ua_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          kind: string
          name: string
          threshold: number
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          kind?: string
          name: string
          threshold: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          kind?: string
          name?: string
          threshold?: number
        }
        Relationships: []
      }
      ban_signals: {
        Row: {
          created_at: string
          device_hash: string | null
          id: string
          ip_hash: string | null
          source_user_id: string
        }
        Insert: {
          created_at?: string
          device_hash?: string | null
          id?: string
          ip_hash?: string | null
          source_user_id: string
        }
        Update: {
          created_at?: string
          device_hash?: string | null
          id?: string
          ip_hash?: string | null
          source_user_id?: string
        }
        Relationships: []
      }
      banned_words: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mode: string
          word: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          word: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          word?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      changelog_entries: {
        Row: {
          changes: Json
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_published: boolean
          published_at: string | null
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          changes?: Json
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
          version: string
        }
        Update: {
          changes?: Json
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          edited_at: string | null
          id: string
          is_edited: boolean
          is_pinned: boolean
          pinned_at: string | null
          pinned_by: string | null
          reply_to_id: string | null
          room_id: string
          search_vector: unknown
          sender: string
          text: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          is_pinned?: boolean
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to_id?: string | null
          room_id?: string
          search_vector?: unknown
          sender: string
          text: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          is_pinned?: boolean
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to_id?: string | null
          room_id?: string
          search_vector?: unknown
          sender?: string
          text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          created_at: string
          edited_at: string | null
          id: string
          image_url: string | null
          is_edited: boolean
          is_pinned: boolean
          pinned_at: string | null
          receiver_id: string
          reply_to_id: string | null
          search_vector: unknown
          sender_id: string
          text: string | null
        }
        Insert: {
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_edited?: boolean
          is_pinned?: boolean
          pinned_at?: string | null
          receiver_id: string
          reply_to_id?: string | null
          search_vector?: unknown
          sender_id: string
          text?: string | null
        }
        Update: {
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_edited?: boolean
          is_pinned?: boolean
          pinned_at?: string | null
          receiver_id?: string
          reply_to_id?: string | null
          search_vector?: unknown
          sender_id?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_calls: {
        Row: {
          callee_id: string
          caller_id: string
          ended_at: string | null
          id: string
          kind: string
          started_at: string
          status: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          ended_at?: string | null
          id?: string
          kind: string
          started_at?: string
          status?: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          ended_at?: string | null
          id?: string
          kind?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_calls: {
        Row: {
          ended_at: string | null
          group_id: string
          id: string
          kind: string
          participants: string[]
          started_at: string
          started_by: string
        }
        Insert: {
          ended_at?: string | null
          group_id: string
          id?: string
          kind: string
          participants?: string[]
          started_at?: string
          started_by: string
        }
        Update: {
          ended_at?: string | null
          group_id?: string
          id?: string
          kind?: string
          participants?: string[]
          started_at?: string
          started_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_calls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_channel_categories: {
        Row: {
          collapsed_by_default: boolean
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          collapsed_by_default?: boolean
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          collapsed_by_default?: boolean
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_channel_categories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_channel_permissions: {
        Row: {
          can_manage: boolean
          can_read: boolean
          can_write: boolean
          channel_id: string
          created_at: string
          id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          can_manage?: boolean
          can_read?: boolean
          can_write?: boolean
          channel_id: string
          created_at?: string
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          can_manage?: boolean
          can_read?: boolean
          can_write?: boolean
          channel_id?: string
          created_at?: string
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_channel_permissions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "group_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      group_channels: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          group_id: string
          id: string
          is_archived: boolean
          is_main: boolean
          name: string
          position: number
          read_only: boolean
          slug: string
          type: string
          updated_at: string
          visibility: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_id: string
          id?: string
          is_archived?: boolean
          is_main?: boolean
          name: string
          position?: number
          read_only?: boolean
          slug: string
          type?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_id?: string
          id?: string
          is_archived?: boolean
          is_main?: boolean
          name?: string
          position?: number
          read_only?: boolean
          slug?: string
          type?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_channels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "group_channel_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_channels_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          group_id: string
          id: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string
          group_id: string
          id?: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          group_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_member_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_member_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          channel_id: string
          created_at: string
          edited_at: string | null
          group_id: string
          id: string
          image_url: string | null
          is_edited: boolean
          reply_to_id: string | null
          text: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          edited_at?: string | null
          group_id: string
          id?: string
          image_url?: string | null
          is_edited?: boolean
          reply_to_id?: string | null
          text?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          edited_at?: string | null
          group_id?: string
          id?: string
          image_url?: string | null
          is_edited?: boolean
          reply_to_id?: string | null
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "group_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          last_activity_at: string
          name: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          last_activity_at?: string
          name: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          last_activity_at?: string
          name?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      login_activity: {
        Row: {
          created_at: string
          device_id: string
          id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mentions: {
        Row: {
          conversation_user_id: string | null
          created_at: string
          id: string
          is_read: boolean
          mentioned_by_user_id: string
          mentioned_user_id: string
          message_id: string
          message_kind: string
          preview: string | null
          room_id: string | null
        }
        Insert: {
          conversation_user_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_by_user_id: string
          mentioned_user_id: string
          message_id: string
          message_kind: string
          preview?: string | null
          room_id?: string | null
        }
        Update: {
          conversation_user_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_by_user_id?: string
          mentioned_user_id?: string
          message_id?: string
          message_kind?: string
          preview?: string | null
          room_id?: string | null
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string | null
          height: number | null
          id: string
          kind: string
          message_id: string
          message_type: string
          mime_type: string | null
          size: number | null
          thumbnail_url: string | null
          url: string
          width: number | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          height?: number | null
          id?: string
          kind?: string
          message_id: string
          message_type: string
          mime_type?: string | null
          size?: number | null
          thumbnail_url?: string | null
          url: string
          width?: number | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          height?: number | null
          id?: string
          kind?: string
          message_id?: string
          message_type?: string
          mime_type?: string | null
          size?: number | null
          thumbnail_url?: string | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_important: boolean
          is_published: boolean
          published_at: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_important?: boolean
          is_published?: boolean
          published_at?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_important?: boolean
          is_published?: boolean
          published_at?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          position: number
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          position?: number
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          position?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple: boolean
          closes_at: string | null
          created_at: string
          created_by: string
          dm_pair: string | null
          id: string
          question: string
          room_id: string | null
        }
        Insert: {
          allow_multiple?: boolean
          closes_at?: string | null
          created_at?: string
          created_by: string
          dm_pair?: string | null
          id?: string
          question: string
          room_id?: string | null
        }
        Update: {
          allow_multiple?: boolean
          closes_at?: string | null
          created_at?: string
          created_by?: string
          dm_pair?: string | null
          id?: string
          question?: string
          room_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accept_friend_requests: boolean
          avatar_url: string | null
          banned: boolean
          bio: string | null
          created_at: string
          dnd_until: string | null
          friend_code: string | null
          id: string
          muted_until: string | null
          name_color: string | null
          name_font: string | null
          role: string
          status_emoji: string | null
          status_text: string | null
          username: string
        }
        Insert: {
          accept_friend_requests?: boolean
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          created_at?: string
          dnd_until?: string | null
          friend_code?: string | null
          id: string
          muted_until?: string | null
          name_color?: string | null
          name_font?: string | null
          role?: string
          status_emoji?: string | null
          status_text?: string | null
          username: string
        }
        Update: {
          accept_friend_requests?: boolean
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          created_at?: string
          dnd_until?: string | null
          friend_code?: string | null
          id?: string
          muted_until?: string | null
          name_color?: string | null
          name_font?: string | null
          role?: string
          status_emoji?: string | null
          status_text?: string | null
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string | null
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint?: string | null
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string | null
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message_id: string | null
          message_text: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          message_text?: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          message_text?: string | null
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          allowed_roles: string[]
          created_at: string
          emoji: string
          id: string
          is_readonly: boolean
          name: string
        }
        Insert: {
          allowed_roles?: string[]
          created_at?: string
          emoji?: string
          id: string
          is_readonly?: boolean
          name: string
        }
        Update: {
          allowed_roles?: string[]
          created_at?: string
          emoji?: string
          id?: string
          is_readonly?: boolean
          name?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_risk: {
        Row: {
          linked_banned_user_ids: string[]
          reasons: string[]
          restricted_until: string | null
          reviewed: boolean
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          linked_banned_user_ids?: string[]
          reasons?: string[]
          restricted_until?: string | null
          reviewed?: boolean
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          linked_banned_user_ids?: string[]
          reasons?: string[]
          restricted_until?: string | null
          reviewed?: boolean
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallpapers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          name: string
          stickers: Json
          thumbnail_url: string | null
          transform: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          media_type?: string
          media_url: string
          name?: string
          stickers?: Json
          thumbnail_url?: string | null
          transform?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          name?: string
          stickers?: Json
          thumbnail_url?: string | null
          transform?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          current_streak: number
          last_active_date: string | null
          level: number
          longest_streak: number
          total_messages: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          current_streak?: number
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          total_messages?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          current_streak?: number
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          total_messages?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_risk_overview: {
        Args: never
        Returns: {
          banned: boolean
          created_at: string
          linked_banned: string[]
          reasons: string[]
          restricted_until: string
          reviewed: boolean
          score: number
          shared_device_accounts: string[]
          updated_at: string
          user_id: string
          username: string
        }[]
      }
      admin_set_risk_restriction: {
        Args: { _hours: number; _uid: string }
        Returns: undefined
      }
      apply_word_filter: { Args: { input_text: string }; Returns: string }
      apply_xp: { Args: { _user_id: string }; Returns: undefined }
      are_friends: {
        Args: { _user1: string; _user2: string }
        Returns: boolean
      }
      can_access_channel: {
        Args: { _channel_id: string; _uid: string }
        Returns: boolean
      }
      create_group_invite: {
        Args: { _group_id: string }
        Returns: {
          code: string
          expires_at: string
          id: string
        }[]
      }
      evaluate_account_risk: { Args: { _uid: string }; Returns: undefined }
      generate_friend_code: { Args: never; Returns: string }
      generate_invite_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_admin: { Args: { _gid: string; _uid: string }; Returns: boolean }
      is_group_member: {
        Args: { _gid: string; _uid: string }
        Returns: boolean
      }
      record_account_signal: {
        Args: { _device: string; _ip: string; _ua: string; _uid: string }
        Returns: undefined
      }
      redeem_group_invite: { Args: { _code: string }; Returns: string }
      reorder_group_channel_categories: {
        Args: { _group_id: string; _ids: string[] }
        Returns: undefined
      }
      reorder_group_channels: {
        Args: { _group_id: string; _ids: string[] }
        Returns: undefined
      }
      revoke_group_invites: { Args: { _group_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      friendship_status: "pending" | "accepted" | "rejected"
      group_member_role: "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      friendship_status: ["pending", "accepted", "rejected"],
      group_member_role: ["admin", "member"],
    },
  },
} as const
