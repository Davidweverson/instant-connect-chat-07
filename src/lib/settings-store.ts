// Global settings store persisted in localStorage
import { getFontStack } from "./fonts";


export interface FlashChatSettings {
  // Appearance
  primaryColor: string; // HSL string like "190 80% 50%"
  fontSize: "small" | "medium" | "large";
  appFont: string; // id do catálogo em src/lib/fonts.ts

  showAvatars: boolean;
  reducedMotion: boolean;

  // Notifications
  notificationsDisabled: boolean;
  messageSounds: boolean;
  browserNotifications: boolean;
  showMessagePreview: boolean;

  // Chat
  showTypingIndicator: boolean;
  sendWithEnter: boolean;
  showTimestamp: boolean;
  language: "pt" | "en";

  // Privacy
  showOnlineStatus: boolean;

  // Cursor
  cursorTheme: "auto" | "dark" | "light" | "flashmaterial";
}

export const DEFAULT_SETTINGS: FlashChatSettings = {
  primaryColor: "190 80% 50%",
  fontSize: "medium",
  appFont: "cabin",

  showAvatars: true,
  reducedMotion: false,
  notificationsDisabled: false,
  messageSounds: true,
  browserNotifications: false,
  showMessagePreview: true,
  showTypingIndicator: true,
  sendWithEnter: true,
  showTimestamp: true,
  language: "pt",
  showOnlineStatus: true,
  cursorTheme: "auto",
};

const STORAGE_KEY = "flashchat_settings";

export function loadSettings(): FlashChatSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: FlashChatSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  applySettings(settings);
}

export function applySettings(settings: FlashChatSettings) {
  const root = document.documentElement;

  // Let the design-system stylesheet remain authoritative until the user
  // explicitly chooses a custom color.
  const primaryTokens = ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring", "--glow-primary"];
  if (settings.primaryColor === DEFAULT_SETTINGS.primaryColor) {
    primaryTokens.forEach((token) => root.style.removeProperty(token));
  } else {
    primaryTokens.forEach((token) => root.style.setProperty(token, settings.primaryColor));
  }

  // Derivar cores do chat a partir da primária, respeitando o tema atual.
  const m = settings.primaryColor.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  if (m) {
    const h = Math.round(+m[1]);
    const s = Math.round(+m[2]);
    const isLight = root.classList.contains("light");
    if (isLight) {
      root.style.setProperty("--chat-own", `${h} ${Math.min(70, s)}% 85%`);
      root.style.setProperty("--chat-own-foreground", `${h} 40% 18%`);
    } else {
      root.style.setProperty("--chat-own", `${h} ${Math.min(70, s)}% 28%`);
      root.style.setProperty("--chat-own-foreground", `${h} 25% 95%`);
    }
  }

  // Font size
  const sizes = { small: "13px", medium: "14px", large: "16px" };
  root.style.setProperty("--chat-font-size", sizes[settings.fontSize]);

  // Fonte global da interface
  const stack = getFontStack(settings.appFont);
  if (stack && settings.appFont !== "cabin") {
    root.style.setProperty("--app-font", stack);
  } else {
    root.style.removeProperty("--app-font");
  }


  // Reduced motion
  if (settings.reducedMotion) {
    root.classList.add("reduce-motion");
  } else {
    root.classList.remove("reduce-motion");
  }

  // Cursor theme
  root.classList.remove("cursor-dark", "cursor-light", "cursor-flashmaterial");
  let resolved: "dark" | "light" | "flashmaterial";
  if (settings.cursorTheme === "auto") {
    resolved = root.classList.contains("light") ? "light" : "dark";
  } else {
    resolved = settings.cursorTheme;
  }
  root.classList.add(`cursor-${resolved}`);
}


// Theme management
export type ThemeMode = "system" | "light" | "dark";

const THEME_KEY = "flashchat_theme";

export function loadTheme(): ThemeMode {
  return (localStorage.getItem(THEME_KEY) as ThemeMode) || "system";
}

export function saveTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  let dark: boolean;

  if (mode === "system") {
    dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  } else {
    dark = mode === "dark";
  }

  if (dark) {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }

  // Re-apply settings completos para que cor primária, chat bubbles e cursor
  // sejam recalculados conforme o tema atual.
  try {
    applySettings(loadSettings());
  } catch {}
}


// Color presets
export const COLOR_PRESETS = [
  { name: "Ciano", value: "190 80% 50%" },
  { name: "Azul", value: "220 80% 55%" },
  { name: "Verde", value: "145 70% 45%" },
  { name: "Laranja", value: "25 90% 55%" },
  { name: "Rosa", value: "330 80% 55%" },
  { name: "Vermelho", value: "0 80% 55%" },
];
