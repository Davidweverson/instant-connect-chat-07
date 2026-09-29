import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Palette, Image as ImageIcon, Type, MessageSquare, UserCircle, Sparkles,
  Smile, Music2, LayoutGrid, SlidersHorizontal, List, Bell, Paintbrush, Package,
  RotateCcw, Download, Upload, Send, Wand2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  SECTIONS, THEME_PRESETS, ADVANCED_PRESETS, DEFAULT_CONFIG, fieldsBySection,
  type FlashForgeField, type SectionId,
} from "@/lib/flashforge/config";
import { useFlashForge, hexToHslString, hslStringToHex } from "@/lib/flashforge/context";
import { UI_FONTS } from "@/lib/fonts";
import { encodeFlashPack } from "@/components/flashforge/FlashPackCard";

const ICONS: Record<string, React.ElementType> = {
  Palette, Image: ImageIcon, Type, MessageSquare, UserCircle, Sparkles, Smile,
  Music2, LayoutGrid, SlidersHorizontal, List, Bell,
};

type NavId = SectionId | "temas" | "packs";

function ColorField({ field }: { field: FlashForgeField }) {
  const { config, setValue } = useFlashForge();
  const raw = String(config[field.key] || "");
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-foreground">{field.label}</span>
      <div className="flex items-center gap-2">
        {raw && (
          <button onClick={() => setValue(field.key, "")} className="text-[10px] text-muted-foreground hover:text-foreground underline">
            tema
          </button>
        )}
        <input
          type="color"
          aria-label={field.label}
          value={raw ? hslStringToHex(raw) : "#22d3ee"}
          onChange={(e) => setValue(field.key, hexToHslString(e.target.value))}
          className="w-10 h-8 rounded-lg bg-transparent border border-border cursor-pointer"
        />
      </div>
    </div>
  );
}

function SliderField({ field }: { field: FlashForgeField }) {
  const { config, setValue } = useFlashForge();
  const value = Number(config[field.key] ?? 0);
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-foreground">{field.label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{value}{field.unit}</span>
      </div>
      <Slider
        value={[value]}
        min={field.min}
        max={field.max}
        step={field.step}
        onValueChange={([v]) => setValue(field.key, v)}
      />
    </div>
  );
}

function SwitchField({ field }: { field: FlashForgeField }) {
  const { config, setValue } = useFlashForge();
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-foreground">{field.label}</span>
      <Switch checked={Boolean(config[field.key])} onCheckedChange={(v) => setValue(field.key, v)} />
    </div>
  );
}

function SelectField({ field }: { field: FlashForgeField }) {
  const { config, setValue } = useFlashForge();
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-foreground">{field.label}</span>
      <Select value={String(config[field.key])} onValueChange={(v) => setValue(field.key, v)}>
        <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
        <SelectContent className="glass-panel z-50">
          {field.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function FontField({ field }: { field: FlashForgeField }) {
  const { config, setValue, customFonts, addCustomFont, removeCustomFont } = useFlashForge();
  const inputRef = useRef<HTMLInputElement>(null);

  const onUpload = (file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      toast.error("A fonte deve ter menos de 3 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const id = `custom-${Date.now()}`;
      const name = file.name.replace(/\.[^.]+$/, "");
      addCustomFont({ id, name, dataUrl: String(reader.result) });
      setValue(field.key, id);
      toast.success(`Fonte "${name}" importada`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="py-2 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">{field.label}</span>
        <Select value={String(config[field.key])} onValueChange={(v) => setValue(field.key, v)}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent className="glass-panel z-50 max-h-72">
            {UI_FONTS.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            {customFonts.map((f) => <SelectItem key={f.id} value={f.id}>{f.name} (personalizada)</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => inputRef.current?.click()}>
          <Upload className="w-3.5 h-3.5 mr-1" /> Importar fonte
        </Button>
        {customFonts.map((f) => (
          <button key={f.id} onClick={() => removeCustomFont(f.id)} className="text-[11px] px-2 py-1 rounded-lg glass-panel hover:text-destructive">
            {f.name} ✕
          </button>
        ))}
        <input
          ref={inputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
        />
      </div>
    </div>
  );
}

function Field({ field }: { field: FlashForgeField }) {
  switch (field.type) {
    case "color": return <ColorField field={field} />;
    case "slider": return <SliderField field={field} />;
    case "switch": return <SwitchField field={field} />;
    case "select": return <SelectField field={field} />;
    case "font": return <FontField field={field} />;
  }
}

function LivePreview() {
  return (
    <div className="glass-strong p-4 space-y-3 sticky top-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pré-visualização</p>
      <div className="rounded-2xl overflow-hidden border border-border/50">
        <div className="ff-topbar-preview flex items-center gap-2 px-3" style={{ height: "var(--ff-topbar-height,56px)", background: "hsl(var(--ff-topbar, var(--card)))" }}>
          <span className="ff-avatar rounded-full bg-primary/30" style={{ width: "var(--ff-avatar-size,36px)", height: "var(--ff-avatar-size,36px)" }} />
          <span className="text-sm font-semibold">Sala Geral</span>
        </div>
        <div className="p-3 flex flex-col bg-background/30" style={{ gap: "var(--ff-message-gap,8px)" }}>
          <div className="flex justify-start">
            <div className="ff-bubble chat-bubble-other px-3 py-2 text-sm">Oi! Curti seu tema 👀</div>
          </div>
          <div className="flex justify-end">
            <div className="ff-bubble chat-bubble-own px-3 py-2 text-sm">Feito no FlashForge ⚡</div>
          </div>
          <div className="flex justify-start">
            <div className="ff-bubble chat-bubble-other px-3 py-2" style={{ fontSize: "var(--ff-emoji-size,20px)" }}>🔥🎨✨</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: "hsl(var(--ff-bottombar, var(--card)))" }}>
          <div className="flex-1 rounded-xl bg-muted/50" style={{ height: "var(--ff-composer-height,44px)" }} />
          <div className="rounded-xl bg-primary" style={{ width: "var(--ff-composer-height,44px)", height: "var(--ff-composer-height,44px)" }} />
        </div>
      </div>
    </div>
  );
}

export default function FlashForge() {
  const {
    advanced, setAdvanced, applyPartial, resetSection, resetAll, exportPack, importPack, config,
  } = useFlashForge();
  const [nav, setNav] = useState<NavId>("cores");
  const fileRef = useRef<HTMLInputElement>(null);

  const fields = useMemo(
    () => (nav === "temas" || nav === "packs" ? [] : fieldsBySection(nav as SectionId, advanced)),
    [nav, advanced]
  );

  const navItems: { id: NavId; label: string; icon: React.ElementType }[] = [
    ...SECTIONS.map((s) => ({ id: s.id as NavId, label: s.label, icon: ICONS[s.icon] || Palette })),
    { id: "temas", label: "Temas", icon: Paintbrush },
    { id: "packs", label: "Flash Packs", icon: Package },
  ];

  const doExport = () => {
    const pack = exportPack();
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "flashpack.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Flash Pack exportado");
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importPack(JSON.parse(String(reader.result)));
        toast.success("Flash Pack importado!");
      } catch {
        toast.error("Arquivo inválido");
      }
    };
    reader.readAsText(file);
  };

  const copyShareCode = async () => {
    await navigator.clipboard.writeText(encodeFlashPack(exportPack()));
    toast.success("Código copiado! Cole em uma conversa para enviar a um amigo.");
  };

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="glass-strong px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <Link to="/" className="p-2 rounded-xl hover:bg-muted transition-colors" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-[180px]">
            <h1 className="text-xl font-display flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" /> FlashForge
            </h1>
            <p className="text-xs text-muted-foreground">Deixe o FlashChat com a sua cara — tudo em tempo real.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Modo Avançado</span>
            <Switch checked={advanced} onCheckedChange={(v) => {
              setAdvanced(v);
              if (v) toast.info("Modo Avançado ativado — opções para usuários experientes. Você pode restaurar tudo quando quiser.");
            }} />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_320px] gap-4">
          {/* Nav */}
          <nav className="glass-panel rounded-2xl p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:h-fit lg:sticky lg:top-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = nav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setNav(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${
                    active ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {item.label}
                </button>
              );
            })}
          </nav>

          {/* Painel */}
          <section className="glass-strong p-4 min-h-[420px]">
            {nav === "temas" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-semibold mb-3">Temas prontos</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {THEME_PRESETS.map((t) => (
                      <button key={t.id} onClick={() => { applyPartial(t.config); toast.success(`Tema ${t.name} aplicado`); }}
                        className="glass-panel rounded-2xl p-3 text-left hover:scale-[1.02] transition-transform">
                        <div className="flex gap-1 mb-2">
                          {t.swatch.map((c, i) => <span key={i} className="w-6 h-6 rounded-md" style={{ background: c }} />)}
                        </div>
                        <span className="text-sm font-medium">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {advanced && (
                  <div>
                    <h2 className="font-semibold mb-3">Presets avançados</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {ADVANCED_PRESETS.map((t) => (
                        <button key={t.id} onClick={() => { applyPartial(t.config); toast.success(`Preset ${t.name} aplicado`); }}
                          className="glass-panel rounded-2xl p-3 text-left hover:scale-[1.02] transition-transform">
                          <div className="flex gap-1 mb-2">
                            {t.swatch.map((c, i) => <span key={i} className="w-6 h-6 rounded-md" style={{ background: c }} />)}
                          </div>
                          <span className="text-sm font-medium">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {nav === "packs" && (
              <div className="space-y-4">
                <h2 className="font-semibold">Flash Packs</h2>
                <p className="text-sm text-muted-foreground">
                  Um Flash Pack guarda cores, fontes (inclusive importadas), layout, animações, player e todos os ajustes avançados.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={doExport}><Download className="w-4 h-4 mr-1" /> Exportar</Button>
                  <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-1" /> Importar</Button>
                  <Button variant="secondary" onClick={copyShareCode}><Send className="w-4 h-4 mr-1" /> Enviar para um amigo</Button>
                  <input ref={fileRef} type="file" accept="application/json" className="hidden"
                    onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
                </div>
                <div className="glass-panel rounded-2xl p-3 text-xs text-muted-foreground">
                  Ao clicar em <b>Enviar para um amigo</b>, um código é copiado. Cole esse código em qualquer conversa do FlashChat:
                  quem receber verá uma prévia do pacote com o botão <b>Aplicar</b>.
                </div>
                <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => { resetAll(); toast.success("Configurações restauradas"); }}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Restaurar todas as configurações
                  </Button>
                </div>
              </div>
            )}

            {nav !== "temas" && nav !== "packs" && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">{SECTIONS.find((s) => s.id === nav)?.label}</h2>
                  <Button variant="ghost" size="sm" className="text-xs"
                    onClick={() => { resetSection(nav as SectionId); toast.success("Categoria restaurada"); }}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restaurar categoria
                  </Button>
                </div>
                <div className="divide-y divide-border/40">
                  {fields.map((f) => <Field key={f.key} field={f} />)}
                </div>
                {!advanced && fieldsBySection(nav as SectionId, true).length > fields.length && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Ative o <b>Modo Avançado</b> para mais {fieldsBySection(nav as SectionId, true).length - fields.length} opções nesta categoria.
                  </p>
                )}
                {nav === "wallpaper" && (
                  <Link to="/settings" className="inline-block mt-4 text-xs text-primary underline">
                    Gerenciar meus wallpapers (upload, GIFs e vídeos)
                  </Link>
                )}
              </>
            )}
          </section>

          {/* Preview */}
          <aside className="hidden lg:block">
            <LivePreview />
          </aside>
        </div>
      </div>
    </div>
  );
}
