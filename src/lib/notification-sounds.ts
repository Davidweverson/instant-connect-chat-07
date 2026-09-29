// Notification sounds using Web Audio API - no external files needed

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail if audio is blocked
  }
}

// Global DND gate set by app shell
let dndUntilIso: string | null = null;
export function setSoundDnd(iso: string | null) { dndUntilIso = iso; }
function dndActive() { return !!dndUntilIso && new Date(dndUntilIso) > new Date(); }

export function playMessageSound() {
  if (dndActive()) return;
  playTone(880, 0.12, "sine", 0.1);
  setTimeout(() => playTone(1100, 0.08, "sine", 0.08), 60);
}

export function playFriendRequestSound() {
  if (dndActive()) return;
  playTone(660, 0.15, "triangle", 0.12);
  setTimeout(() => playTone(880, 0.2, "triangle", 0.1), 150);
  setTimeout(() => playTone(1100, 0.25, "triangle", 0.08), 300);
}

/** Alguém entrou na chamada — dois tons ascendentes. */
export function playCallJoinSound() {
  playTone(520, 0.12, "sine", 0.16);
  setTimeout(() => playTone(780, 0.18, "sine", 0.14), 90);
}

/** Alguém saiu da chamada — dois tons descendentes. */
export function playCallLeaveSound() {
  playTone(600, 0.12, "sine", 0.14);
  setTimeout(() => playTone(380, 0.2, "sine", 0.12), 90);
}
