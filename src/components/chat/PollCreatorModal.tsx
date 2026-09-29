import { useState } from "react";
import { Plus, X, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createPoll } from "@/lib/polls";
import { toast } from "@/hooks/use-toast";

interface PollCreatorModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  roomId?: string;
  dmPair?: string;
  onCreated: (pollId: string) => void;
}

export function PollCreatorModal({ open, onClose, userId, roomId, dmPair, onCreated }: PollCreatorModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
  };

  const setOpt = (i: number, v: string) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  };

  const addOpt = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, ""]);
  };
  const removeOpt = (i: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) {
      toast({ title: "Pergunta obrigatória", variant: "destructive" });
      return;
    }
    if (cleanOpts.length < 2) {
      toast({ title: "Adicione pelo menos 2 opções", variant: "destructive" });
      return;
    }
    setBusy(true);
    const pollId = await createPoll({
      question: question.trim(),
      options: cleanOpts,
      allowMultiple,
      userId,
      roomId,
      dmPair,
    });
    setBusy(false);
    if (!pollId) {
      toast({ title: "Falha ao criar enquete", variant: "destructive" });
      return;
    }
    onCreated(pollId);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Nova enquete
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Pergunta</label>
            <input
              autoFocus
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={300}
              placeholder="Qual sua opinião?"
              className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Opções</label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={opt}
                  onChange={(e) => setOpt(i, e.target.value)}
                  maxLength={120}
                  placeholder={`Opção ${i + 1}`}
                  className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground"
                />
                {options.length > 2 && (
                  <button onClick={() => removeOpt(i)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button
                onClick={addOpt}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar opção
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="accent-primary"
            />
            Permitir múltiplas escolhas
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted">
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Criando..." : "Criar enquete"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
