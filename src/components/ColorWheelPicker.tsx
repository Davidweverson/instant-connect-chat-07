import { useRef } from "react";

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

interface Props {
  value: HSL;
  onChange: (next: HSL) => void;
}

/**
 * Color picker estilo "círculo cromático" (inspirado no Ibis Paint):
 * — Anel de matiz (hue) onde o usuário clica/arrasta para escolher a cor.
 * — Sliders de saturação e luminosidade, com limites para impedir branco/preto puros.
 */
export function ColorWheelPicker({ value, onChange }: Props) {
  const ringRef = useRef<HTMLDivElement>(null);
  const { h, s, l } = value;

  const pickHue = (e: React.PointerEvent) => {
    const el = ringRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    onChange({ h: Math.round(deg), s, l });
  };

  const angleRad = ((h - 90) * Math.PI) / 180;
  const radius = 72;
  const dotX = 88 + radius * Math.cos(angleRad);
  const dotY = 88 + radius * Math.sin(angleRad);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={ringRef}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          pickHue(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) pickHue(e);
        }}
        className="relative select-none touch-none"
        style={{
          width: 176,
          height: 176,
          cursor: "crosshair",
          background:
            "conic-gradient(from 0deg, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))",
          WebkitMask:
            "radial-gradient(circle, transparent 56%, #000 58%, #000 99%, transparent 100%)",
          mask: "radial-gradient(circle, transparent 56%, #000 58%, #000 99%, transparent 100%)",
          borderRadius: "50%",
        }}
      >
        {/* swatch de preview no centro */}
        <div
          className="absolute rounded-full border-2 border-border shadow-lg pointer-events-none"
          style={{
            width: 84,
            height: 84,
            left: 46,
            top: 46,
            background: `hsl(${h} ${s}% ${l}%)`,
          }}
        />
        {/* handle do hue */}
        <div
          className="absolute w-5 h-5 rounded-full border-[3px] border-white shadow-md pointer-events-none"
          style={{
            left: dotX - 10,
            top: dotY - 10,
            background: `hsl(${h}, 100%, 50%)`,
          }}
        />
      </div>

      <div className="w-full max-w-xs space-y-3">
        <label className="block">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Saturação</span>
            <span>{s}%</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            value={s}
            onChange={(e) => onChange({ h, s: +e.target.value, l })}
            className="w-full accent-primary"
          />
        </label>
        <label className="block">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Luminosidade</span>
            <span>{l}%</span>
          </div>
          <input
            type="range"
            min={25}
            max={70}
            value={l}
            onChange={(e) => onChange({ h, s, l: +e.target.value })}
            className="w-full accent-primary"
          />
        </label>
      </div>
    </div>
  );
}

export function parseHslString(str: string): HSL {
  // "190 80% 50%"
  const m = str.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  if (!m) return { h: 190, s: 80, l: 50 };
  return { h: Math.round(+m[1]), s: Math.round(+m[2]), l: Math.round(+m[3]) };
}

export function formatHslString({ h, s, l }: HSL): string {
  return `${h} ${s}% ${l}%`;
}
