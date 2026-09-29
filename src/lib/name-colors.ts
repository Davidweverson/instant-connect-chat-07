// Paleta de cores do nome do usuário (HSL)
export interface NameColorOption {
  id: string;
  name: string;
  hsl: string; // "190 80% 50%"
}

export const NAME_COLOR_PALETTE: NameColorOption[] = [
  { id: "default", name: "Padrão", hsl: "" }, // usa primary
  { id: "cyan", name: "Ciano", hsl: "190 90% 55%" },
  { id: "blue", name: "Azul", hsl: "220 90% 65%" },
  { id: "violet", name: "Violeta", hsl: "265 80% 65%" },
  { id: "pink", name: "Rosa", hsl: "330 85% 65%" },
  { id: "red", name: "Vermelho", hsl: "0 80% 60%" },
  { id: "orange", name: "Laranja", hsl: "25 90% 55%" },
  { id: "amber", name: "Âmbar", hsl: "42 95% 55%" },
  { id: "lime", name: "Lima", hsl: "85 75% 50%" },
  { id: "green", name: "Verde", hsl: "145 70% 50%" },
  { id: "teal", name: "Petróleo", hsl: "175 70% 45%" },
  { id: "rose", name: "Coral", hsl: "350 90% 70%" },
];

export function nameColorStyle(hsl: string | null | undefined): React.CSSProperties {
  if (!hsl) return {};
  return { color: `hsl(${hsl})` };
}
