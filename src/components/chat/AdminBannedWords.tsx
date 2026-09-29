// UI de gerenciamento de palavras proibidas
import { useState, useEffect, useCallback } from "react";
import { Trash2, Plus, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BannedWord {
  id: string;
  word: string;
  mode: "censor" | "block";
  created_at: string;
}

export function AdminBannedWords() {
  const [words, setWords] = useState<BannedWord[]>([]);
  const [newWord, setNewWord] = useState("");
  const [mode, setMode] = useState<"censor" | "block">("censor");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("banned_words" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setWords((data as any) || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = newWord.trim().toLowerCase();
    if (!w) return;
    setLoading(true);
    const { error } = await supabase.from("banned_words" as any).insert({ word: w, mode } as any);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setNewWord("");
      toast.success("Palavra adicionada");
      load();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("banned_words" as any).delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-orange-500" />
        Filtro de Palavras
      </h2>

      <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
        <input
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="palavra"
          className="flex-1 min-w-[180px] px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground"
        >
          <option value="censor">Censurar (***)</option>
          <option value="block">Bloquear envio</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </form>

      <div className="space-y-1">
        {words.length === 0 && (
          <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma palavra cadastrada.</p>
        )}
        {words.map((w) => (
          <div key={w.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-foreground">{w.word}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  w.mode === "block"
                    ? "bg-destructive/20 text-destructive"
                    : "bg-orange-500/20 text-orange-500"
                }`}
              >
                {w.mode === "block" ? "Bloqueia" : "Censura"}
              </span>
            </div>
            <button
              onClick={() => handleDelete(w.id)}
              className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
