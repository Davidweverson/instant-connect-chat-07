import { createContext, useContext, type ReactNode } from "react";
import { useDMCall } from "@/hooks/useDMCall";
import { useAuth } from "@/hooks/useAuth";
import { CallScreen } from "@/components/calls/CallScreen";

type CallCtx = ReturnType<typeof useDMCall>;

const CallContext = createContext<CallCtx | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const dmCall = useDMCall(user?.id, profile?.username || "");
  return (
    <CallContext.Provider value={dmCall}>
      {children}
      {dmCall.state !== "idle" && dmCall.active && (
        <CallScreen
          state={dmCall.state}
          call={dmCall.active}
          localStream={dmCall.localStream}
          remoteStream={dmCall.remoteStream}
          muted={dmCall.muted}
          camOff={dmCall.camOff}
          elapsed={dmCall.elapsed}
          onAccept={dmCall.acceptCall}
          onDecline={dmCall.declineCall}
          onEnd={() => dmCall.endCall()}
          onToggleMute={dmCall.toggleMute}
          onToggleCam={dmCall.toggleCam}
        />
      )}
    </CallContext.Provider>
  );
}

export function useCall(): CallCtx {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside <CallProvider>");
  return ctx;
}
