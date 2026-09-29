import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, SkipForward } from "lucide-react";
import { useMusic } from "@/lib/music/player-context";
import { TrackCover } from "./TrackCover";

export function MiniPlayer() {
  const { current, isPlaying, position, duration, toggle, next, setFullPlayerOpen, fullPlayerOpen } = useMusic();
  const total = duration || current?.duration || 0;
  const pct = total ? Math.min(100, (position / total) * 100) : 0;

  return (
    <AnimatePresence>
      {current && !fullPlayerOpen && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] w-[min(560px,calc(100%-1.5rem))]"
        >
          <div className="glass-panel rounded-2xl shadow-xl overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setFullPlayerOpen(true)}
              onKeyDown={(e) => e.key === "Enter" && setFullPlayerOpen(true)}
              className="flex items-center gap-3 p-2 pr-3 cursor-pointer"
            >
              <TrackCover track={current} className="w-11 h-11 rounded-xl flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{current.title}</p>
                <p className="text-xs text-muted-foreground truncate">{current.artist}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                }}
                className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0"
                aria-label={isPlaying ? "Pausar" : "Reproduzir"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Próxima"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
            <div className="h-1 bg-muted/40">
              <motion.div className="h-full bg-primary" animate={{ width: `${pct}%` }} transition={{ ease: "linear", duration: 0.25 }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
