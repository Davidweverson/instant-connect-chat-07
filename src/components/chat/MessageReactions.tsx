import { useState } from "react";
import { Smile } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { QUICK_REACTIONS, type Reaction } from "@/lib/message-reactions";

interface MessageReactionsProps {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
}

export function MessageReactions({ reactions, onToggle }: MessageReactionsProps) {
  if (reactions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onToggle(r.emoji)}
          className={`text-xs px-1.5 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
            r.reactedByMe
              ? "bg-primary/20 border-primary/40 text-primary"
              : "bg-muted/50 border-border hover:bg-muted text-foreground"
          }`}
          title={`${r.count} reação${r.count > 1 ? "ões" : ""}`}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}
    </div>
  );
}

interface ReactionPickerProps {
  onPick: (emoji: string) => void;
}

export function ReactionPicker({ onPick }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
          title="Reagir"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1.5" side="top">
        <div className="flex gap-1">
          {QUICK_REACTIONS.map((e) => (
            <button
              key={e}
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              className="text-lg p-1.5 rounded hover:bg-muted transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
