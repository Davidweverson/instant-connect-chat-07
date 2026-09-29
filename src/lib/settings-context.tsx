import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  type FlashChatSettings,
  type ThemeMode,
  loadSettings,
  saveSettings,
  applySettings,
  loadTheme,
  saveTheme,
  applyTheme,
} from "./settings-store";

interface SettingsContextType {
  settings: FlashChatSettings;
  updateSettings: (partial: Partial<FlashChatSettings>) => void;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<FlashChatSettings>(loadSettings);
  const [theme, setThemeState] = useState<ThemeMode>(loadTheme);

  // Apply whenever settings or theme change so visual controls update immediately.
  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const updateSettings = useCallback((partial: Partial<FlashChatSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    saveTheme(mode);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, theme, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
