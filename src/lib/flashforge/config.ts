// FlashForge — motor de personalização do FlashChat.
// Cada campo é declarado uma única vez aqui e o editor + o aplicador de CSS
// são gerados a partir desta especificação.

export type FieldType = "color" | "slider" | "switch" | "select" | "font";

export interface FlashForgeField {
  key: string;
  label: string;
  type: FieldType;
  section: SectionId;
  /** Variável CSS aplicada no :root */
  cssVar: string;
  /** Sufixo aplicado ao valor numérico (px, ms, deg...) */
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  /** Somente visível no Modo Avançado */
  advanced?: boolean;
  hint?: string;
}

export type SectionId =
  | "cores"
  | "wallpaper"
  | "fontes"
  | "mensagens"
  | "avatares"
  | "animacoes"
  | "emojis"
  | "player"
  | "layout"
  | "interface"
  | "lista"
  | "notificacoes";

export const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: "cores", label: "Cores", icon: "Palette" },
  { id: "wallpaper", label: "Wallpaper", icon: "Image" },
  { id: "fontes", label: "Fontes", icon: "Type" },
  { id: "mensagens", label: "Mensagens", icon: "MessageSquare" },
  { id: "avatares", label: "Avatares", icon: "UserCircle" },
  { id: "animacoes", label: "Animações", icon: "Sparkles" },
  { id: "emojis", label: "Emojis e Figurinhas", icon: "Smile" },
  { id: "player", label: "Player de Música", icon: "Music2" },
  { id: "layout", label: "Layout", icon: "LayoutGrid" },
  { id: "interface", label: "Interface", icon: "SlidersHorizontal" },
  { id: "lista", label: "Lista de Conversas", icon: "List" },
  { id: "notificacoes", label: "Notificações", icon: "Bell" },
];

const c = (
  key: string,
  label: string,
  cssVar: string,
  section: SectionId = "cores",
  advanced = false
): FlashForgeField => ({ key, label, type: "color", cssVar, section, advanced });

const s = (
  key: string,
  label: string,
  cssVar: string,
  section: SectionId,
  min: number,
  max: number,
  step: number,
  unit = "px",
  advanced = false
): FlashForgeField => ({ key, label, type: "slider", cssVar, section, min, max, step, unit, advanced });

export const FIELDS: FlashForgeField[] = [
  // ===== CORES =====
  c("primary", "Cor principal", "--primary"),
  c("secondary", "Cor secundária", "--secondary"),
  c("accent", "Cor de destaque", "--accent"),
  c("button", "Cor dos botões", "--ff-button"),
  c("chatOwn", "Mensagens enviadas", "--chat-own"),
  c("chatOther", "Mensagens recebidas", "--chat-other"),
  c("foreground", "Cor dos textos", "--foreground"),
  c("icon", "Cor dos ícones", "--ff-icon"),
  c("topbar", "Barra superior", "--ff-topbar"),
  c("bottombar", "Barra inferior", "--ff-bottombar"),

  // ===== WALLPAPER =====
  s("wpBlur", "Desfoque (blur)", "--ff-wp-blur", "wallpaper", 0, 40, 1),
  s("wpDim", "Escurecimento", "--ff-wp-dim", "wallpaper", 0, 100, 1, "%"),
  s("wpOpacity", "Transparência", "--ff-wp-opacity", "wallpaper", 10, 100, 1, "%"),
  s("wpSaturate", "Saturação", "--ff-wp-saturate", "wallpaper", 0, 200, 5, "%", true),
  s("wpBrightness", "Brilho", "--ff-wp-brightness", "wallpaper", 20, 180, 5, "%", true),
  s("wpContrast", "Contraste", "--ff-wp-contrast", "wallpaper", 20, 180, 5, "%", true),
  s("wpVignette", "Vinheta", "--ff-wp-vignette", "wallpaper", 0, 100, 1, "%", true),
  { key: "wpParallax", label: "Parallax", type: "switch", cssVar: "--ff-wp-parallax", section: "wallpaper", advanced: true },

  // ===== FONTES =====
  { key: "appFont", label: "Fonte da interface", type: "font", cssVar: "--app-font", section: "fontes" },
  s("fontSize", "Tamanho da fonte", "--chat-font-size", "fontes", 11, 22, 1),
  s("fontWeight", "Peso da fonte", "--ff-font-weight", "fontes", 300, 800, 100, ""),
  s("letterSpacing", "Espaçamento entre letras", "--ff-letter-spacing", "fontes", -1, 4, 0.1, "px", true),
  s("lineHeight", "Altura da linha", "--ff-line-height", "fontes", 1, 2.4, 0.05, "", true),
  {
    key: "textAlign", label: "Alinhamento", type: "select", cssVar: "--ff-text-align", section: "fontes", advanced: true,
    options: [{ value: "left", label: "Esquerda" }, { value: "center", label: "Centro" }, { value: "right", label: "Direita" }],
  },

  // ===== MENSAGENS =====
  s("bubbleRadius", "Arredondamento dos balões", "--ff-bubble-radius", "mensagens", 0, 40, 1),
  s("bubbleMaxWidth", "Largura máxima dos balões", "--ff-bubble-max-width", "mensagens", 40, 100, 1, "%"),
  s("bubbleMinHeight", "Altura mínima", "--ff-bubble-min-height", "mensagens", 0, 80, 1, "px", true),
  s("bubblePadding", "Espaçamento interno", "--ff-bubble-padding", "mensagens", 4, 24, 1),
  s("messageGap", "Espaçamento entre mensagens", "--ff-message-gap", "mensagens", 0, 32, 1),
  s("groupGap", "Espaçamento entre grupos", "--ff-group-gap", "mensagens", 0, 48, 1, "px", true),
  s("bubbleMargin", "Margem lateral", "--ff-bubble-margin", "mensagens", 0, 48, 1, "px", true),
  s("bubbleOpacity", "Opacidade dos balões", "--ff-bubble-opacity", "mensagens", 20, 100, 1, "%"),
  s("bubbleShadow", "Intensidade da sombra", "--ff-bubble-shadow", "mensagens", 0, 40, 1),
  c("bubbleShadowColor", "Cor da sombra", "--ff-bubble-shadow-color", "mensagens", true),

  // ===== AVATARES =====
  s("avatarSize", "Tamanho", "--ff-avatar-size", "avatares", 24, 96, 1),
  {
    key: "avatarShape", label: "Formato", type: "select", cssVar: "--ff-avatar-radius", section: "avatares",
    options: [{ value: "999px", label: "Círculo" }, { value: "0px", label: "Quadrado" }, { value: "10px", label: "Arredondado" }],
  },
  s("avatarBorder", "Espessura da borda", "--ff-avatar-border", "avatares", 0, 8, 1),
  c("avatarBorderColor", "Cor da borda", "--ff-avatar-border-color", "avatares"),
  s("avatarGlow", "Brilho", "--ff-avatar-glow", "avatares", 0, 40, 1),
  s("avatarShadow", "Sombra", "--ff-avatar-shadow", "avatares", 0, 40, 1),
  s("avatarGap", "Espaçamento das mensagens", "--ff-avatar-gap", "avatares", 0, 24, 1, "px", true),

  // ===== ANIMAÇÕES =====
  { key: "animEnabled", label: "Ativar animações", type: "switch", cssVar: "--ff-anim-enabled", section: "animacoes" },
  s("animSpeed", "Velocidade global", "--ff-anim-speed", "animacoes", 25, 200, 5, "%"),
  s("animDuration", "Duração", "--ff-anim-duration", "animacoes", 50, 800, 10, "ms"),
  {
    key: "animEasing", label: "Curva", type: "select", cssVar: "--ff-anim-easing", section: "animacoes",
    options: [
      { value: "cubic-bezier(0.2,0.7,0.2,1)", label: "Suave (padrão)" },
      { value: "linear", label: "Linear" },
      { value: "ease-in-out", label: "Ease in-out" },
      { value: "cubic-bezier(0.34,1.56,0.64,1)", label: "Bounce" },
    ],
  },
  { key: "animMessages", label: "Animar envio de mensagens", type: "switch", cssVar: "--ff-anim-messages", section: "animacoes", advanced: true },
  { key: "animButtons", label: "Animar botões", type: "switch", cssVar: "--ff-anim-buttons", section: "animacoes", advanced: true },

  // ===== EMOJIS =====
  s("emojiSize", "Tamanho dos emojis", "--ff-emoji-size", "emojis", 14, 64, 1),
  s("stickerSize", "Tamanho das figurinhas", "--ff-sticker-size", "emojis", 60, 320, 4),
  s("emojiGap", "Espaçamento", "--ff-emoji-gap", "emojis", 0, 16, 1),
  s("stickerRadius", "Cantos das figurinhas", "--ff-sticker-radius", "emojis", 0, 32, 1, "px", true),
  s("stickerShadow", "Sombra das figurinhas", "--ff-sticker-shadow", "emojis", 0, 40, 1, "px", true),

  // ===== PLAYER =====
  c("playerColor", "Cor do player", "--ff-player-color", "player"),
  s("playerOpacity", "Transparência", "--ff-player-opacity", "player", 20, 100, 1, "%"),
  s("playerBlur", "Desfoque", "--ff-player-blur", "player", 0, 40, 1, "px", true),
  s("playerRadius", "Formato dos botões", "--ff-player-radius", "player", 0, 32, 1),
  s("playerCover", "Tamanho da capa", "--ff-player-cover", "player", 120, 420, 10, "px", true),
  s("playerProgress", "Barra de progresso", "--ff-player-progress", "player", 2, 14, 1, "px", true),
  {
    key: "miniPlayerMode", label: "Mini player", type: "select", cssVar: "--ff-miniplayer", section: "player",
    options: [{ value: "compact", label: "Compacto" }, { value: "expanded", label: "Expandido" }],
  },

  // ===== LAYOUT =====
  {
    key: "density", label: "Densidade", type: "select", cssVar: "--ff-density", section: "layout",
    options: [
      { value: "compact", label: "Compacto" },
      { value: "cozy", label: "Confortável" },
      { value: "tablet", label: "Tablet" },
      { value: "desktop", label: "Desktop" },
    ],
  },
  s("uiScale", "Escala da interface", "--ff-ui-scale", "layout", 80, 130, 1, "%"),

  // ===== INTERFACE =====
  s("radius", "Raio dos botões e cartões", "--radius", "interface", 0, 32, 1),
  s("iconSize", "Tamanho dos ícones", "--ff-icon-size", "interface", 12, 32, 1),
  s("topbarHeight", "Altura da barra superior", "--ff-topbar-height", "interface", 40, 96, 1),
  s("bottombarHeight", "Altura da barra inferior", "--ff-bottombar-height", "interface", 40, 120, 1),
  s("composerHeight", "Altura da caixa de mensagem", "--ff-composer-height", "interface", 36, 96, 1),
  s("barOpacity", "Transparência das barras", "--ff-bar-opacity", "interface", 0, 100, 1, "%"),
  s("glassOpacity", "Intensidade do glass", "--glass-opacity-pct", "interface", 0, 100, 1, "%"),
  s("glassBlur", "Desfoque do glass", "--glass-blur", "interface", 0, 60, 1),

  // ===== LISTA DE CONVERSAS =====
  s("listItemHeight", "Altura de cada conversa", "--ff-list-height", "lista", 40, 96, 1, "px", true),
  s("listGap", "Espaçamento entre conversas", "--ff-list-gap", "lista", 0, 20, 1, "px", true),
  s("listAvatarSize", "Tamanho da foto", "--ff-list-avatar", "lista", 24, 72, 1, "px", true),
  s("listNameSize", "Tamanho do nome", "--ff-list-name", "lista", 11, 22, 1, "px", true),
  s("listPreviewSize", "Tamanho da última mensagem", "--ff-list-preview", "lista", 9, 18, 1, "px", true),
  { key: "listSeparators", label: "Mostrar separadores", type: "switch", cssVar: "--ff-list-separators", section: "lista" },
  { key: "listAvatars", label: "Mostrar avatares", type: "switch", cssVar: "--ff-list-avatars", section: "lista" },

  // ===== NOTIFICAÇÕES =====
  c("notifColor", "Cor", "--ff-notif-color", "notificacoes"),
  s("notifOpacity", "Transparência", "--ff-notif-opacity", "notificacoes", 30, 100, 1, "%"),
  s("notifScale", "Tamanho", "--ff-notif-scale", "notificacoes", 80, 130, 1, "%"),
  {
    key: "notifPosition", label: "Posição", type: "select", cssVar: "--ff-notif-position", section: "notificacoes",
    options: [
      { value: "top-right", label: "Superior direita" },
      { value: "top-left", label: "Superior esquerda" },
      { value: "bottom-right", label: "Inferior direita" },
      { value: "bottom-left", label: "Inferior esquerda" },
    ],
  },
];

export type FlashForgeConfig = Record<string, string | number | boolean>;

export const DEFAULT_CONFIG: FlashForgeConfig = {
  // cores vazias = herdam do tema atual
  primary: "", secondary: "", accent: "", button: "", chatOwn: "", chatOther: "",
  foreground: "", icon: "", topbar: "", bottombar: "", bubbleShadowColor: "",
  avatarBorderColor: "", playerColor: "", notifColor: "",

  wpBlur: 0, wpDim: 0, wpOpacity: 100, wpSaturate: 100, wpBrightness: 100,
  wpContrast: 100, wpVignette: 0, wpParallax: false,

  appFont: "cabin", fontSize: 14, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left",

  bubbleRadius: 18, bubbleMaxWidth: 75, bubbleMinHeight: 0, bubblePadding: 10,
  messageGap: 8, groupGap: 16, bubbleMargin: 0, bubbleOpacity: 100,
  bubbleShadow: 8,

  avatarSize: 36, avatarShape: "999px", avatarBorder: 0, avatarGlow: 0, avatarShadow: 0, avatarGap: 8,

  animEnabled: true, animSpeed: 100, animDuration: 250,
  animEasing: "cubic-bezier(0.2,0.7,0.2,1)", animMessages: true, animButtons: true,

  emojiSize: 20, stickerSize: 160, emojiGap: 4, stickerRadius: 12, stickerShadow: 0,

  playerOpacity: 100, playerBlur: 22, playerRadius: 999, playerCover: 260,
  playerProgress: 4, miniPlayerMode: "compact",

  density: "cozy", uiScale: 100,

  radius: 18, iconSize: 16, topbarHeight: 56, bottombarHeight: 64,
  composerHeight: 44, barOpacity: 100, glassOpacity: 34, glassBlur: 22,

  listItemHeight: 56, listGap: 4, listAvatarSize: 36, listNameSize: 14,
  listPreviewSize: 12, listSeparators: true, listAvatars: true,

  notifOpacity: 100, notifScale: 100, notifPosition: "top-right",
};

// ===== TEMAS PRONTOS =====
export interface ThemePreset {
  id: string;
  name: string;
  swatch: string[];
  config: FlashForgeConfig;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "flash-dark", name: "Flash Dark", swatch: ["#0e1116", "#22d3ee", "#8b5cf6"], config: { primary: "190 80% 50%", secondary: "220 16% 14%", accent: "260 60% 60%", foreground: "210 20% 92%", glassOpacity: 34 } },
  { id: "amoled", name: "AMOLED", swatch: ["#000000", "#22d3ee", "#111111"], config: { primary: "190 90% 55%", secondary: "0 0% 8%", accent: "190 90% 45%", foreground: "0 0% 96%", glassOpacity: 70, glassBlur: 10 } },
  { id: "light", name: "Light", swatch: ["#f8fafc", "#0ea5e9", "#7c3aed"], config: { primary: "199 89% 48%", secondary: "220 14% 92%", accent: "265 80% 58%", foreground: "220 20% 12%", glassOpacity: 48 } },
  { id: "ocean", name: "Ocean", swatch: ["#0b2540", "#2dd4bf", "#38bdf8"], config: { primary: "174 72% 50%", secondary: "205 50% 18%", accent: "199 89% 60%", foreground: "195 30% 92%" } },
  { id: "purple", name: "Purple", swatch: ["#1b1030", "#a855f7", "#e879f9"], config: { primary: "271 81% 60%", secondary: "270 30% 18%", accent: "292 84% 70%", foreground: "280 25% 94%" } },
  { id: "green", name: "Green", swatch: ["#0c1f16", "#22c55e", "#a3e635"], config: { primary: "142 71% 45%", secondary: "150 25% 16%", accent: "84 81% 55%", foreground: "140 20% 93%" } },
  { id: "midnight", name: "Midnight", swatch: ["#0a0f1f", "#6366f1", "#334155"], config: { primary: "239 84% 67%", secondary: "222 30% 16%", accent: "217 33% 35%", foreground: "215 25% 92%" } },
  { id: "cyber", name: "Cyber", swatch: ["#12021a", "#f0abfc", "#22d3ee"], config: { primary: "292 91% 73%", secondary: "290 40% 14%", accent: "187 92% 60%", foreground: "300 20% 95%", bubbleRadius: 6 } },
  { id: "neon", name: "Neon", swatch: ["#050505", "#39ff14", "#ff00e5"], config: { primary: "105 100% 54%", secondary: "0 0% 10%", accent: "312 100% 50%", foreground: "0 0% 98%", avatarGlow: 18, bubbleShadow: 24 } },
];

// ===== PRESETS AVANÇADOS =====
export const ADVANCED_PRESETS: ThemePreset[] = [
  { id: "minimalista", name: "Minimalista", swatch: ["#ffffff", "#111111"], config: { bubbleRadius: 8, bubbleShadow: 0, glassOpacity: 10, avatarBorder: 0, messageGap: 6, radius: 8 } },
  { id: "discord", name: "Discord Style", swatch: ["#313338", "#5865f2"], config: { primary: "235 86% 65%", secondary: "223 7% 20%", bubbleRadius: 6, bubbleMaxWidth: 100, messageGap: 4, avatarShape: "999px", glassOpacity: 85, glassBlur: 0 } },
  { id: "material", name: "Material Design", swatch: ["#6750a4", "#eaddff"], config: { primary: "258 37% 48%", bubbleRadius: 24, radius: 24, bubbleShadow: 12, glassOpacity: 60 } },
  { id: "neon-pro", name: "Neon", swatch: ["#0a0a0a", "#39ff14"], config: { primary: "105 100% 54%", avatarGlow: 24, bubbleShadow: 30, bubbleRadius: 4, glassOpacity: 25 } },
  { id: "cyberpunk", name: "Cyberpunk", swatch: ["#1a0b2e", "#fcee0a"], config: { primary: "56 97% 51%", accent: "312 100% 50%", bubbleRadius: 2, letterSpacing: 1, glassOpacity: 30 } },
  { id: "glass", name: "Glass", swatch: ["#93c5fd", "#ffffff"], config: { glassOpacity: 18, glassBlur: 40, bubbleOpacity: 65, bubbleRadius: 22, bubbleShadow: 16 } },
  { id: "amoled-pro", name: "AMOLED", swatch: ["#000000", "#ffffff"], config: { secondary: "0 0% 6%", glassOpacity: 95, glassBlur: 0, bubbleShadow: 0 } },
  { id: "retro", name: "Retro", swatch: ["#f4e4c1", "#b45309"], config: { primary: "32 95% 44%", bubbleRadius: 2, appFont: "mojang", letterSpacing: 0.5, glassOpacity: 70 } },
];

const FIELD_MAP = new Map(FIELDS.map((f) => [f.key, f]));

/** Aplica a configuração no :root criando/removendo apenas o necessário. */
export function applyFlashForge(config: FlashForgeConfig) {
  const root = document.documentElement;
  const merged = { ...DEFAULT_CONFIG, ...config };

  for (const [key, value] of Object.entries(merged)) {
    const field = FIELD_MAP.get(key);
    if (!field) continue;
    const isDefault = DEFAULT_CONFIG[key] === value;

    if (field.type === "color") {
      if (!value) root.style.removeProperty(field.cssVar);
      else root.style.setProperty(field.cssVar, String(value));
      continue;
    }
    if (field.type === "switch") {
      root.style.setProperty(field.cssVar, value ? "1" : "0");
      continue;
    }
    if (field.type === "font") {
      const stack = FONT_STACK_RESOLVER?.(String(value));
      if (stack) root.style.setProperty(field.cssVar, stack);
      else root.style.removeProperty(field.cssVar);
      continue;
    }
    if (field.type === "select") {
      root.style.setProperty(field.cssVar, String(value));
      continue;
    }
    // slider
    if (isDefault && (field.cssVar === "--radius" || field.cssVar === "--glass-blur")) {
      root.style.removeProperty(field.cssVar);
      continue;
    }
    root.style.setProperty(field.cssVar, `${value}${field.unit ?? ""}`);
  }

  // Derivados
  root.style.setProperty("--glass-opacity", String(Number(merged.glassOpacity) / 100));
  root.style.setProperty("--ff-anim-scale", String(100 / Math.max(1, Number(merged.animSpeed))));
  root.classList.toggle("ff-no-anim", merged.animEnabled === false);
  root.classList.toggle("ff-hide-list-separators", merged.listSeparators === false);
  root.classList.toggle("ff-hide-list-avatars", merged.listAvatars === false);
  root.setAttribute("data-ff-density", String(merged.density));
  root.setAttribute("data-ff-notif", String(merged.notifPosition));
}

/** Injetado por flashforge/context para evitar import circular com fonts.ts */
let FONT_STACK_RESOLVER: ((id: string) => string | undefined) | null = null;
export function setFontStackResolver(fn: (id: string) => string | undefined) {
  FONT_STACK_RESOLVER = fn;
}

export function fieldsBySection(section: SectionId, advanced: boolean) {
  return FIELDS.filter((f) => f.section === section && (advanced || !f.advanced));
}
