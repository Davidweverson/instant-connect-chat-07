import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, Bell, MessageSquare, Shield, Info, Wallpaper } from "lucide-react";
import WallpaperSection from "@/components/wallpaper/WallpaperSection";
import { useSettings } from "@/lib/settings-context";
import { useChangelog } from "@/hooks/useChangelog";
import { parseUserAgent } from "@/lib/parse-user-agent";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { UI_FONTS } from "@/lib/fonts";
import { ColorWheelPicker, parseHslString, formatHslString } from "@/components/ColorWheelPicker";
import { supabase } from "@/integrations/supabase/client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  isPushSupported,
  isUserSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-notifications";
import { computeDndUntil, formatDndRemaining, isDndActive, setDndUntil, type DndPreset } from "@/lib/dnd";
import { toast } from "sonner";

const SECTIONS = [
  { id: "appearance", label: "Aparência", icon: Palette },
  { id: "wallpaper", label: "Wallpapers", icon: Wallpaper },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "privacy", label: "Privacidade", icon: Shield },
  { id: "about", label: "Sobre", icon: Info },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { user, profile, refetchProfile } = useAuth();
  const { latestVersion } = useChangelog();
  const [section, setSection] = useState<Section>("appearance");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const pushSupported = isPushSupported();

  useEffect(() => {
    isUserSubscribed().then(setPushSubscribed);
  }, []);

  const handleTogglePush = async (enable: boolean) => {
    if (!user) return;
    setPushLoading(true);
    try {
      if (enable) {
        const result = await subscribeToPush(user.id);
        if (result.ok) {
          setPushSubscribed(true);
          toast.success("Notificações push ativadas");
        } else {
          toast.error(result.reason || "Não foi possível ativar. Verifique as permissões do navegador.");
        }
      } else {
        await unsubscribeFromPush(user.id);
        setPushSubscribed(false);
        toast.success("Notificações push desativadas");
      }
    } finally {
      setPushLoading(false);
    }
  };

  const dndUntil = profile?.dnd_until || null;
  const dndOn = isDndActive(dndUntil);

  const handleDndPreset = async (preset: DndPreset) => {
    if (!user) return;
    const iso = computeDndUntil(preset);
    await setDndUntil(user.id, iso);
    refetchProfile?.();
    toast.success(preset === "off" ? "Modo Não Perturbe desligado" : `Não Perturbe ativo`);
  };

  const renderContent = () => {
    switch (section) {
      case "appearance":
        return (
          <div className="space-y-1 divide-y divide-border">
            <div className="pb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cor primária</p>
              <ColorWheelPicker
                value={parseHslString(settings.primaryColor)}
                onChange={(hsl) => updateSettings({ primaryColor: formatHslString(hsl) })}
              />
              <p className="text-xs text-muted-foreground mt-3 text-center">
                A cor escolhida será aplicada nos botões, balões de conversa e destaques de todo o site.
              </p>
            </div>

            <SettingRow label="Tamanho da fonte" description="Tamanho do texto nas mensagens">
              <select
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: e.target.value as any })}
                className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
              >
                <option value="small">Pequena</option>
                <option value="medium">Média</option>
                <option value="large">Grande</option>
              </select>
            </SettingRow>

            <div className="py-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Fonte do site</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {UI_FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => updateSettings({ appFont: f.id })}
                    className={`rounded-xl border px-3 py-3 text-left transition-all hover:border-primary/60 ${
                      settings.appFont === f.id ? "border-primary bg-primary/10" : "border-border bg-secondary/40"
                    }`}
                  >
                    <span className="block text-base leading-tight text-foreground" style={{ fontFamily: f.stack }}>
                      FlashChat
                    </span>
                    <span className="block text-[11px] text-muted-foreground mt-1">{f.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                A fonte escolhida é aplicada em todo o site apenas para você.
              </p>
            </div>

            <SettingRow label="Mostrar avatares" description="Exibir foto de perfil nas mensagens">
              <Switch checked={settings.showAvatars} onCheckedChange={(v) => updateSettings({ showAvatars: v })} />
            </SettingRow>

            <SettingRow label="Animações reduzidas" description="Desativa animações para melhor performance">
              <Switch checked={settings.reducedMotion} onCheckedChange={(v) => updateSettings({ reducedMotion: v })} />
            </SettingRow>
            <SettingRow label="Cursor personalizado" description="Escolha o estilo do mouse no site">
              <select
                value={settings.cursorTheme}
                onChange={(e) => updateSettings({ cursorTheme: e.target.value as any })}
                className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
              >
                <option value="auto">Automático (segue o tema)</option>
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
                <option value="flashmaterial">FlashMaterial (clássico)</option>
              </select>
            </SettingRow>
          </div>
        );

      case "wallpaper":
        return <WallpaperSection userId={user?.id} />;

      case "notifications":
        return (
          <div className="space-y-0 divide-y divide-border">
            <SettingRow label="Desativar notificações" description="Desliga todas as notificações">
              <Switch
                checked={settings.notificationsDisabled}
                onCheckedChange={(v) =>
                  updateSettings({
                    notificationsDisabled: v,
                    ...(v ? { messageSounds: false, browserNotifications: false, showMessagePreview: false } : {}),
                  })
                }
              />
            </SettingRow>
            <SettingRow label="Sons de mensagem">
              <Switch
                disabled={settings.notificationsDisabled}
                checked={settings.messageSounds}
                onCheckedChange={(v) => updateSettings({ messageSounds: v })}
              />
            </SettingRow>
            <SettingRow label="Notificações do navegador">
              <Switch
                disabled={settings.notificationsDisabled}
                checked={settings.browserNotifications}
                onCheckedChange={(v) => updateSettings({ browserNotifications: v })}
              />
            </SettingRow>
            <SettingRow label="Preview na notificação">
              <Switch
                disabled={settings.notificationsDisabled}
                checked={settings.showMessagePreview}
                onCheckedChange={(v) => updateSettings({ showMessagePreview: v })}
              />
            </SettingRow>
            <SettingRow
              label="Notificações push"
              description={
                pushSupported
                  ? "Receba notificações mesmo com a aba fechada"
                  : "Seu navegador não suporta notificações push"
              }
            >
              <Switch
                disabled={!pushSupported || pushLoading || settings.notificationsDisabled}
                checked={pushSubscribed}
                onCheckedChange={handleTogglePush}
              />
            </SettingRow>
            <div className="py-3">
              <p className="text-sm font-medium text-foreground mb-1">Não perturbe</p>
              <p className="text-xs text-muted-foreground mb-3">
                {dndOn ? `Ativo — termina em ${formatDndRemaining(dndUntil!)}` : "Silencia sons e notificações temporariamente"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={dndOn ? "outline" : "secondary"} onClick={() => handleDndPreset("1h")}>1 hora</Button>
                <Button size="sm" variant={dndOn ? "outline" : "secondary"} onClick={() => handleDndPreset("8h")}>8 horas</Button>
                <Button size="sm" variant={dndOn ? "outline" : "secondary"} onClick={() => handleDndPreset("tomorrow")}>Até amanhã 8h</Button>
                {dndOn && (
                  <Button size="sm" variant="destructive" onClick={() => handleDndPreset("off")}>Desligar</Button>
                )}
              </div>
            </div>
          </div>
        );

      case "chat":
        return (
          <div className="space-y-0 divide-y divide-border">
            <SettingRow label="Indicador de digitação">
              <Switch checked={settings.showTypingIndicator} onCheckedChange={(v) => updateSettings({ showTypingIndicator: v })} />
            </SettingRow>
            <SettingRow label="Enviar com Enter" description="Desligado = apenas botão de envio">
              <Switch checked={settings.sendWithEnter} onCheckedChange={(v) => updateSettings({ sendWithEnter: v })} />
            </SettingRow>
            <SettingRow label="Mostrar horário" description="Exibir timestamp em cada mensagem">
              <Switch checked={settings.showTimestamp} onCheckedChange={(v) => updateSettings({ showTimestamp: v })} />
            </SettingRow>
            <SettingRow label="Idioma">
              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value as any })}
                className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
              >
                <option value="pt">Português</option>
                <option value="en">English</option>
              </select>
            </SettingRow>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-0 divide-y divide-border">
            <SettingRow label="Mostrar status online" description="Outros usuários podem ver quando você está online">
              <Switch checked={settings.showOnlineStatus} onCheckedChange={(v) => updateSettings({ showOnlineStatus: v })} />
            </SettingRow>
            <SettingRow
              label="Pedidos de amizade via perfil"
              description="Quando desligado, ninguém pode te enviar pedido pela página do seu perfil — só pelo seu código de amigo."
            >
              <Switch
                checked={profile?.accept_friend_requests ?? true}
                onCheckedChange={async (v) => {
                  if (!user) return;
                  const { error } = await supabase
                    .from("profiles")
                    .update({ accept_friend_requests: v } as any)
                    .eq("id", user.id);
                  if (error) {
                    toast.error("Não foi possível salvar");
                  } else {
                    refetchProfile?.();
                    toast.success(v ? "Pedidos pelo perfil ativados" : "Pedidos pelo perfil desativados");
                  }
                }}
              />
            </SettingRow>

            <div className="py-4">
              <BlockedUsersSection userId={user?.id} />
            </div>
            <div className="py-4">
              <LoginActivitySection userId={user?.id} />
            </div>
            <div className="pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">Limpar histórico local</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá limpar todos os dados armazenados localmente (configurações, tema, estado de leitura). Essa ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                      }}
                    >
                      Limpar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Versão</p>
              <p className="text-foreground font-medium">{latestVersion || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Desenvolvido com</p>
              <p className="text-foreground text-sm">React, Tailwind CSS, Lovable Cloud</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              Voltar ao chat
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex">
      {/* Sidebar */}
      <div className="w-56 border-r border-border bg-sidebar flex flex-col max-md:hidden">
        <div className="p-4 border-b border-sidebar-border">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao chat
          </button>
        </div>
        <div className="p-2 space-y-0.5 flex-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  section === s.id ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden p-3 border-b border-border flex items-center gap-2">
          <button onClick={() => navigate("/")} className="p-1.5 text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground">Configurações</h1>
        </div>

        {/* Mobile section tabs */}
        <div className="md:hidden flex overflow-x-auto gap-1 p-2 border-b border-border">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  section === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className={`flex-1 p-6 ${section === "wallpaper" ? "max-w-3xl" : "max-w-xl"}`}>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {SECTIONS.find((s) => s.id === section)?.label}
          </h2>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

function BlockedUsersSection({ userId }: { userId?: string }) {
  const [blocked, setBlocked] = useState<Array<{ id: string; username: string; avatar_url: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!userId) return;
    setLoading(true);
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.from("blocked_users" as any).select("blocked_id").eq("blocker_id", userId);
    const ids = (data as any[] || []).map((r) => r.blocked_id);
    if (ids.length === 0) { setBlocked([]); setLoading(false); return; }
    const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
    setBlocked((profs as any) || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [userId]);

  const unblock = async (id: string) => {
    if (!userId) return;
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("blocked_users" as any).delete().eq("blocker_id", userId).eq("blocked_id", id);
    toast.success("Bloqueio removido");
    refresh();
  };

  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">Usuários bloqueados</p>
      {loading && <p className="text-xs text-muted-foreground">Carregando…</p>}
      {!loading && blocked.length === 0 && (
        <p className="text-xs text-muted-foreground">Você não bloqueou ninguém.</p>
      )}
      <div className="space-y-2">
        {blocked.map((u) => (
          <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs">{u.username[0]?.toUpperCase()}</span>}
              </div>
              <span className="text-sm text-foreground truncate">@{u.username}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => unblock(u.id)}>Desbloquear</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginActivitySection({ userId }: { userId?: string }) {
  const [logs, setLogs] = useState<Array<{ id: string; device_id: string; user_agent: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { fetchLoginHistory, getCurrentDeviceId } = await import("@/lib/security-alerts");
      const data = await fetchLoginHistory(userId);
      setLogs(data);
      setLoading(false);
    })();
  }, [userId]);

  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">Histórico de acesso</p>
      <p className="text-xs text-muted-foreground mb-2">Últimos logins detectados nessa conta.</p>
      {loading && <p className="text-xs text-muted-foreground">Carregando…</p>}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {logs.map((l) => (
          <div key={l.id} className="text-xs p-2 rounded bg-muted/40 flex justify-between gap-2">
            <span className="truncate text-foreground/80">{parseUserAgent(l.user_agent)}</span>
            <span className="text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
          </div>
        ))}
        {!loading && logs.length === 0 && <p className="text-xs text-muted-foreground">Nenhum registro.</p>}
      </div>
    </div>
  );
}
