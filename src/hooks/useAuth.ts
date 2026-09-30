import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { recordLoginAndCheckNewDevice } from "@/lib/security-alerts";
import { toast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  friend_code: string | null;
  role: string;
  banned: boolean;
  muted_until: string | null;
  bio?: string | null;
  status_text?: string | null;
  status_emoji?: string | null;
  name_color?: string | null;
  name_font?: string | null;
  dnd_until?: string | null;
  accept_friend_requests?: boolean;
}


export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef<Profile | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const [profileMissing, setProfileMissing] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    let { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (!data && !error) {
      // Perfil pode estar sendo criado pelo trigger — tenta de novo uma vez
      await new Promise((r) => setTimeout(r, 1200));
      ({ data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle());
    }
    setProfileMissing(!data);
    if (error) console.error("[useAuth] erro ao carregar perfil:", error);
    if (data) {
      const d = data as any;
      setProfile({
        id: d.id,
        username: d.username,
        avatar_url: d.avatar_url,
        friend_code: d.friend_code,
        role: d.role ?? "user",
        banned: d.banned ?? false,
        muted_until: d.muted_until ?? null,
        bio: d.bio ?? null,
        status_text: d.status_text ?? null,
        status_emoji: d.status_emoji ?? null,
        name_color: d.name_color ?? null,
        name_font: d.name_font ?? null,
        dnd_until: d.dnd_until ?? null,
        accept_friend_requests: d.accept_friend_requests ?? true,
      });
    }

    return !!data;
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-security-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        async (payload) => {
          const next = payload.new as Record<string, unknown>;
          const wasMuted = Boolean(
            profileRef.current?.muted_until && new Date(profileRef.current.muted_until).getTime() > Date.now()
          );
          const mutedUntil = typeof next.muted_until === "string" ? next.muted_until : null;
          const isMutedNow = Boolean(mutedUntil && new Date(mutedUntil).getTime() > Date.now());

          if (next.banned === true) {
            await supabase.auth.signOut();
            window.location.replace("/login?reason=banned");
            return;
          }

          await fetchProfile(user.id);
          if (!wasMuted && isMutedNow) window.location.reload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchProfile]);

  const signUp = async (email: string, password: string, username: string) => {
    // Check if username is taken
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing) {
      throw new Error("Este username já está em uso");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        throw new Error("Este email já está cadastrado");
      }
      throw new Error(error.message);
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        throw new Error("Email ou senha incorretos");
      }
      throw new Error(error.message);
    }

    // Check if user is banned
    if (data.user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("banned")
        .eq("id", data.user.id)
        .single();

      if (profileData && (profileData as any).banned) {
        await supabase.auth.signOut();
        throw new Error("Sua conta foi banida");
      }
    }

    // Security: detecta novo dispositivo
    if (data.user) {
      recordLoginAndCheckNewDevice(data.user.id).then((isNew) => {
        if (isNew) {
          toast({
            title: "⚠️ Login de novo dispositivo",
            description: "Detectamos um acesso de um aparelho que nunca foi usado nessa conta. Se não foi você, troque sua senha.",
          });
        }
      });
    }

    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const isAdmin = profile?.role === "admin";

  return {
    user,
    profile,
    profileMissing,
    isAdmin,
    loading,
    signUp,
    signIn,
    signOut,
    refetchProfile: () => user && fetchProfile(user.id),
  };
}
