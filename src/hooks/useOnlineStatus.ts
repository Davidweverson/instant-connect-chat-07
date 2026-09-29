// Detecta status de conexão (navigator + Supabase realtime)
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
  const [realtimeConnected, setRealtimeConnected] = useState(true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("__connection_probe__")
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeConnected(true);
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtimeConnected(false);
        }
      });
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return { online, realtimeConnected, fullyOnline: online && realtimeConnected };
}
