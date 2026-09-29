import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "@tsparticles/engine";
import { useEffect, useState, type ReactNode } from "react";

const init = async (engine: Engine) => {
  await loadSlim(engine);
};

const options = {
  fullScreen: { enable: false },
  background: { color: { value: "transparent" } },
  fpsLimit: 60,
  detectRetina: true,
  interactivity: {
    events: {
      onHover: { enable: true, mode: "grab" as const },
      resize: { enable: true },
    },
    modes: {
      grab: { distance: 160, links: { opacity: 0.6 } },
    },
  },
  particles: {
    color: { value: "hsl(190, 80%, 55%)" },
    links: {
      color: "hsl(190, 80%, 55%)",
      distance: 140,
      enable: true,
      opacity: 0.25,
      width: 1,
    },
    move: {
      enable: true,
      speed: 0.6,
      direction: "none" as const,
      outModes: { default: "bounce" as const },
      random: true,
    },
    number: { value: 60, density: { enable: true, width: 1200, height: 800 } },
    opacity: { value: 0.45 },
    shape: { type: "circle" },
    size: { value: { min: 1, max: 2.5 } },
  },
};

export function ParticlesBackground() {
  const [reduce, setReduce] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduce(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  if (reduce) return null;
  return (
    <Particles
      id="tsparticles-bg"
      className="fixed inset-0 z-0 pointer-events-none"
      options={options}
    />
  );
}

export function ParticlesRoot({ children }: { children: ReactNode }) {
  return (
    <ParticlesProvider init={init}>
      <ParticlesBackground />
      <div className="relative z-10 min-h-screen">{children}</div>
    </ParticlesProvider>
  );
}
