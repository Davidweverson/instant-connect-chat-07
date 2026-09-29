import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  X,
  Gauge,
} from "lucide-react";
import { useMusic } from "@/lib/music/player-context";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { formatTime } from "@/lib/music/metadata";
import { Slider } from "@/components/ui/slider";
import { TrackCover } from "./TrackCover";

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function FullPlayer() {
  const {
    current,
    isPlaying,
    position,
    duration,
    volume,
    rate,
    repeat,
    shuffle,
    fullPlayerOpen,
    setFullPlayerOpen,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    setRate,
    cycleRepeat,
    toggleShuffle,
    toggleFavorite,
  } = useMusic();

  const cover = useCoverUrl(current);
  const open = fullPlayerOpen && !!current;

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="fixed inset-0 z-[70] flex flex-col overflow-hidden"
        >
          {/* Blurred cover backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl" />
          {cover && (
            <img
              src={cover}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover opacity-30 blur-3xl scale-110"
            />
          )}

          <div className="relative flex-1 flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">
            <button
              onClick={() => setFullPlayerOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full glass-panel text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar player"
            >
              <X className="w-5 h-5" />
            </button>

            <motion.div
              layout
              animate={{ scale: isPlaying ? 1 : 0.96 }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              className="w-full max-w-[320px] aspect-square"
            >
              <TrackCover track={current} className="w-full h-full rounded-3xl shadow-2xl" iconClassName="w-20 h-20" />
            </motion.div>

            <div className="text-center max-w-md w-full">
              <h2 className="font-display text-2xl truncate">{current.title}</h2>
              <p className="text-muted-foreground truncate">{current.artist}</p>
              <p className="text-xs text-muted-foreground/80 truncate mt-1">
                {[current.album, current.genre, current.year, current.trackNo ? `Faixa ${current.trackNo}` : null]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>

            <div className="w-full max-w-md space-y-2">
              <Slider
                value={[Math.min(position, duration || 0)]}
                max={duration || current.duration || 1}
                step={0.1}
                onValueChange={([v]) => seek(v)}
                aria-label="Progresso"
              />
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration || current.duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleShuffle}
                className={`p-2.5 rounded-full transition-colors ${shuffle ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Aleatório"
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button onClick={prev} className="p-3 rounded-full hover:bg-muted transition-colors" aria-label="Anterior">
                <SkipBack className="w-6 h-6" />
              </button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={toggle}
                className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30"
                aria-label={isPlaying ? "Pausar" : "Reproduzir"}
              >
                {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
              </motion.button>
              <button onClick={next} className="p-3 rounded-full hover:bg-muted transition-colors" aria-label="Próxima">
                <SkipForward className="w-6 h-6" />
              </button>
              <button
                onClick={cycleRepeat}
                className={`p-2.5 rounded-full transition-colors ${repeat !== "off" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Repetir"
              >
                {repeat === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>

            <div className="w-full max-w-md flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2 w-40">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <Slider value={[volume]} max={1} step={0.01} onValueChange={([v]) => setVolume(v)} aria-label="Volume" />
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-muted-foreground" />
                <select
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="bg-transparent border border-border rounded-lg px-2 py-1 text-sm"
                  aria-label="Velocidade"
                >
                  {RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}x
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => toggleFavorite(current.id)}
                className={`p-2 rounded-full transition-colors ${current.favorite ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Favoritar"
              >
                <Heart className={`w-5 h-5 ${current.favorite ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
