import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_CONFIG,
  FIELDS,
  applyFlashForge,
  setFontStackResolver,
  type FlashForgeConfig,
  type SectionId,
} from "./config";
import { getFontStack } from "@/lib/fonts";

export interface CustomFont {
  id: string;
  name: string;
  dataUrl: string;
}

export interface FlashPack {
  kind: "flashpack";
  version: 1;
  name: string;
  createdAt: string;
  advanced: boolean;
  config: FlashForgeConfig;
  customFonts: CustomFont[];
  /** wallpaper opcional (data URL ou URL pública) */
  wallpaper?: { url: string; type: "image" | "video" } | null;
}

const STORAGE_KEY = "flashforge_config_v1";
const FONTS_KEY = "flashforge_fonts_v1";
const ADV_KEY = "flashforge_advanced_v1";

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

export function registerCustomFonts(fonts: CustomFont[]) {
  fonts.forEach((f) => {
    try {
      const face = new FontFace(f.name, `url(${f.dataUrl})`);
      face.load().then((loaded) => document.fonts.add(loaded)).catch(() => {});
    } catch {}
  });
}

interface Ctx {
  config: FlashForgeConfig;
  advanced: boolean;
  customFonts: CustomFont[];
  setAdvanced: (v: boolean) => void;
  setValue: (key: string, value: string | number | boolean) => void;
  applyPartial: (partial: FlashForgeConfig) => void;
  resetSection: (section: SectionId) => void;
  resetAll: () => void;
  addCustomFont: (font: CustomFont) => void;
  removeCustomFont: (id: string) => void;
  exportPack: (name?: string) => FlashPack;
  importPack: (pack: FlashPack) => void;
}

const FlashForgeContext = createContext<Ctx | null>(null);

export function FlashForgeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<FlashForgeConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...loadJSON<FlashForgeConfig>(STORAGE_KEY, {}),
  }));
  const [customFonts, setCustomFonts] = useState<CustomFont[]>(() => loadJSON<CustomFont[]>(FONTS_KEY, []));
  const [advanced, setAdvancedState] = useState<boolean>(() => loadJSON<boolean>(ADV_KEY, false));

  // resolver de fontes (inclui fontes personalizadas)
  useEffect(() => {
    setFontStackResolver((id) => {
      const custom = customFonts.find((f) => f.id === id);
      if (custom) return `'${custom.name}', 'Cabin', sans-serif`;
      if (id === "cabin") return undefined;
      return getFontStack(id);
    });
    registerCustomFonts(customFonts);
    applyFlashForge(config);
  }, [customFonts, config]);

  const persist = useCallback((next: FlashForgeConfig) => {
    setConfig(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const setValue = useCallback(
    (key: string, value: string | number | boolean) => {
      setConfig((prev) => {
        const next = { ...prev, [key]: value };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  const applyPartial = useCallback((partial: FlashForgeConfig) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const resetSection = useCallback(
    (section: SectionId) => {
      const patch: FlashForgeConfig = {};
      FIELDS.filter((f) => f.section === section).forEach((f) => {
        patch[f.key] = DEFAULT_CONFIG[f.key];
      });
      applyPartial(patch);
    },
    [applyPartial]
  );

  const resetAll = useCallback(() => persist({ ...DEFAULT_CONFIG }), [persist]);

  const setAdvanced = useCallback((v: boolean) => {
    setAdvancedState(v);
    localStorage.setItem(ADV_KEY, JSON.stringify(v));
  }, []);

  const addCustomFont = useCallback((font: CustomFont) => {
    setCustomFonts((prev) => {
      const next = [...prev.filter((f) => f.id !== font.id), font];
      try {
        localStorage.setItem(FONTS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const removeCustomFont = useCallback((id: string) => {
    setCustomFonts((prev) => {
      const next = prev.filter((f) => f.id !== id);
      localStorage.setItem(FONTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const exportPack = useCallback(
    (name = "Meu Flash Pack"): FlashPack => ({
      kind: "flashpack",
      version: 1,
      name,
      createdAt: new Date().toISOString(),
      advanced,
      config,
      customFonts,
    }),
    [config, customFonts, advanced]
  );

  const importPack = useCallback(
    (pack: FlashPack) => {
      if (!pack || pack.kind !== "flashpack") throw new Error("Arquivo inválido");
      if (pack.customFonts?.length) {
        setCustomFonts(pack.customFonts);
        localStorage.setItem(FONTS_KEY, JSON.stringify(pack.customFonts));
        registerCustomFonts(pack.customFonts);
      }
      persist({ ...DEFAULT_CONFIG, ...pack.config });
    },
    [persist]
  );

  const value = useMemo<Ctx>(
    () => ({
      config, advanced, customFonts, setAdvanced, setValue, applyPartial,
      resetSection, resetAll, addCustomFont, removeCustomFont, exportPack, importPack,
    }),
    [config, advanced, customFonts, setAdvanced, setValue, applyPartial, resetSection, resetAll, addCustomFont, removeCustomFont, exportPack, importPack]
  );

  return <FlashForgeContext.Provider value={value}>{children}</FlashForgeContext.Provider>;
}

export function useFlashForge() {
  const ctx = useContext(FlashForgeContext);
  if (!ctx) throw new Error("useFlashForge deve ser usado dentro de FlashForgeProvider");
  return ctx;
}

// ===== utilidades de cor (hex <-> hsl string "H S% L%") =====
export function hexToHslString(hex: string): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hslStringToHex(hsl: string): string {
  const m = hsl.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  if (!m) return "#22d3ee";
  const h = +m[1], s = +m[2] / 100, l = +m[3] / 100;
  const cc = (1 - Math.abs(2 * l - 1)) * s;
  const x = cc * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - cc / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [cc, x, 0];
  else if (h < 120) [r, g, b] = [x, cc, 0];
  else if (h < 180) [r, g, b] = [0, cc, x];
  else if (h < 240) [r, g, b] = [0, x, cc];
  else if (h < 300) [r, g, b] = [x, 0, cc];
  else [r, g, b] = [cc, 0, x];
  const to = (v: number) => Math.round((v + mm) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
