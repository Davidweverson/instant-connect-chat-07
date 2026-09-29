import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "flashchat_first_visit_warning_seen";

export function FirstVisitWarning() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // pequeno delay para não competir com loading inicial
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center mb-2">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <DialogTitle>Antes de começar — sua segurança</DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-relaxed">
            Por questões de segurança e privacidade, <strong>não recomendamos</strong> que você use:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>seu <strong>nome real</strong> como nome de usuário;</li>
              <li><strong>fotos pessoais</strong> (suas, da sua família ou da sua casa) como avatar;</li>
              <li>informações sensíveis (endereço, telefone, escola) em mensagens públicas.</li>
            </ul>
            <p className="mt-3">Use um apelido e uma foto sem identificação pessoal. Divirta-se com responsabilidade!</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={close} className="w-full sm:w-auto">Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
