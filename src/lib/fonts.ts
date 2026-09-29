// Catálogo de fontes do FlashChat.
// As fontes são servidas via CDN (Lovable Assets) e registradas em index.css.

export interface FontOption {
  id: string;
  name: string;
  /** Valor pronto para CSS font-family */
  stack: string;
  /** Fontes legíveis podem ser usadas como fonte global da interface */
  ui: boolean;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: "cabin", name: "Cabin (padrão)", stack: "'Cabin', system-ui, sans-serif", ui: true },
  { id: "orbitron", name: "Orbitron", stack: "'Orbitron', 'Cabin', sans-serif", ui: true },
  { id: "alte-haas", name: "Alte Haas Grotesk", stack: "'Alte Haas Grotesk', 'Cabin', sans-serif", ui: true },
  { id: "lemonmilk", name: "Lemon Milk", stack: "'Lemon Milk', 'Cabin', sans-serif", ui: true },
  { id: "neutro", name: "Neutro", stack: "'Neutro', 'Cabin', sans-serif", ui: true },
  { id: "agency", name: "Agency", stack: "'Agency FC', 'Cabin', sans-serif", ui: true },
  { id: "think-smart", name: "Think Smart", stack: "'Think Smart', 'Cabin', sans-serif", ui: true },
  { id: "bignoodle", name: "Big Noodle", stack: "'Big Noodle Titling', 'Cabin', sans-serif", ui: true },
  { id: "mojang", name: "Minecraft (Mojang)", stack: "'Mojang', 'Cabin', sans-serif", ui: true },
  { id: "azonix", name: "Azonix", stack: "'Azonix', 'Cabin', sans-serif", ui: true },
  { id: "elegant-bloom", name: "Elegante (Elegant Bloom)", stack: "'Elegant Bloom', cursive", ui: false },
  { id: "bartleen-script", name: "Bartleen Script", stack: "'Bartleen Script', cursive", ui: false },
  { id: "amalfi-coast", name: "Amalfi Coast", stack: "'Amalfi Coast', cursive", ui: false },
  { id: "pricedown", name: "Pricedown", stack: "'Pricedown', 'Cabin', sans-serif", ui: false },
  { id: "rocktown", name: "Rocktown", stack: "'Rocktown', 'Cabin', sans-serif", ui: false },
  { id: "starjedi", name: "Star Jedi", stack: "'Star Jedi', 'Cabin', sans-serif", ui: false },
  { id: "storm-gust", name: "Storm Gust", stack: "'Storm Gust', 'Cabin', sans-serif", ui: false },
  { id: "doctorglitch", name: "Doctor Glitch", stack: "'Doctor Glitch', 'Cabin', sans-serif", ui: false },
];

export const UI_FONTS = FONT_OPTIONS.filter((f) => f.ui);

export function getFontStack(id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  return FONT_OPTIONS.find((f) => f.id === id)?.stack;
}

/** Estilo pronto para aplicar a um nome de usuário com fonte personalizada. */
export function nameFontStyle(id: string | null | undefined): React.CSSProperties {
  const stack = getFontStack(id);
  return stack ? { fontFamily: stack } : {};
}
