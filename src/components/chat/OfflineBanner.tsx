// Banner global quando offline ou realtime caiu
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Loader2 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const { online, realtimeConnected } = useOnlineStatus();
  const visible = !online || !realtimeConnected;
  const isReconnecting = online && !realtimeConnected;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -32, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium ${
            isReconnecting ? "bg-amber-500 text-amber-50" : "bg-destructive text-destructive-foreground"
          }`}
        >
          {isReconnecting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Reconectando ao servidor...
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              Você está offline. Algumas funções estão indisponíveis.
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
