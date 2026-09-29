// Popover com autocomplete de @username
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { searchUsernames, type MentionTarget } from "@/lib/mentions";

interface MentionAutocompleteProps {
  query: string;
  visible: boolean;
  onSelect: (username: string) => void;
  onClose: () => void;
}

export function MentionAutocomplete({ query, visible, onSelect, onClose }: MentionAutocompleteProps) {
  const [results, setResults] = useState<MentionTarget[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const r = await searchUsernames(query, 6);
      setResults(r);
      setActiveIdx(0);
    }, 80);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        onSelect(results[activeIdx].username);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [visible, results, activeIdx, onSelect, onClose]);

  if (!visible || results.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-full left-12 mb-2 z-30 glass rounded-xl p-1 min-w-[200px] max-w-[260px] shadow-lg border border-border"
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">Mencionar usuário</p>
      {results.map((r, i) => (
        <button
          key={r.user_id}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(r.username);
          }}
          onMouseEnter={() => setActiveIdx(i)}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
            i === activeIdx ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted"
          }`}
        >
          <span className="font-bold">@</span>
          <span className="truncate">{r.username}</span>
        </button>
      ))}
    </motion.div>
  );
}
