// Gamification helpers — keep formulas in sync with DB trigger (apply_xp)

export const XP_PER_MESSAGE = 5;

// level = floor(sqrt(xp / 50)) + 1  →  xp needed for level L = (L-1)^2 * 50
export function xpForLevel(level: number): number {
  return Math.max(0, (level - 1) * (level - 1) * 50);
}

export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
}

export interface LevelProgress {
  level: number;
  current: number;   // xp acumulado dentro do nível
  needed: number;    // xp total para este nível
  next: number;      // xp para o próximo nível
  percent: number;   // 0-100
}

export function getLevelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const nextBase = xpForLevel(level + 1);
  const current = xp - base;
  const needed = nextBase - base;
  return {
    level,
    current,
    needed,
    next: nextBase,
    percent: needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 0,
  };
}
