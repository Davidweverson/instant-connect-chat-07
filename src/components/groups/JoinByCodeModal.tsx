import { useState } from "react";
import { X, LogIn } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<string | null>;
}

export function JoinByCodeModal({ open, onClose, onJoin }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const submit = async () => {
    if (!code.trim()) return;
    setBusy(true);
    const gid = await onJoin(code);
    setBusy(false);
    if (gid) { setCode(""); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm glass-strong rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-lg text-foreground">Entrar por Código</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">Cole o código de convite que você recebeu.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border font-mono text-center text-lg tracking-widest text-foreground focus:outline-none focus:border-primary"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button onClick={submit} disabled={busy || !code.trim()} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" /> Entrar no grupo
          </button>
        </div>
      </div>
    </div>
  );
}
