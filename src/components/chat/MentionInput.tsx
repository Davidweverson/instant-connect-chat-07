// Input com autocomplete de @ menções
import { useState, useRef, useCallback, useEffect, type ChangeEvent, type KeyboardEvent } from "react";
import { MentionAutocomplete } from "./MentionAutocomplete";

interface MentionInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  onTyping?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  sendWithEnter?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  onPaste?: (e: React.ClipboardEvent) => void;
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  onTyping,
  placeholder,
  className,
  disabled,
  sendWithEnter = true,
  inputRef: externalRef,
  onPaste,
}: MentionInputProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = externalRef || internalRef;
  const [mentionState, setMentionState] = useState<{ active: boolean; query: string; start: number }>({
    active: false,
    query: "",
    start: 0,
  });

  const detectMention = useCallback((text: string, caret: number) => {
    // procura último @ antes do caret sem espaço entre eles
    let i = caret - 1;
    while (i >= 0) {
      const ch = text[i];
      if (ch === "@") {
        // precisa ser começo ou char anterior whitespace/pontuação
        const prev = i === 0 ? " " : text[i - 1];
        if (/[\s>(\[{,;.!?]/.test(prev) || i === 0) {
          const query = text.slice(i + 1, caret);
          if (/^[a-zA-Z0-9_\-]{0,30}$/.test(query)) {
            return { active: true, query, start: i };
          }
        }
        return { active: false, query: "", start: 0 };
      }
      if (/\s/.test(ch)) break;
      i--;
    }
    return { active: false, query: "", start: 0 };
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    onTyping?.();
    const caret = e.target.selectionStart || v.length;
    setMentionState(detectMention(v, caret));
  };

  const handleSelect = (username: string) => {
    if (!mentionState.active) return;
    const before = value.slice(0, mentionState.start);
    const afterCaret = value.slice((ref.current?.selectionStart) || value.length);
    const next = `${before}@${username} ${afterCaret}`;
    onChange(next);
    setMentionState({ active: false, query: "", start: 0 });
    setTimeout(() => {
      const pos = before.length + username.length + 2;
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (mentionState.active) return; // autocomplete handles arrows/enter
    if (e.key === "Enter" && sendWithEnter && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    } else if (e.key === "Enter" && !sendWithEnter) {
      e.preventDefault();
    }
  };

  return (
    <div className="relative flex-1">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      <MentionAutocomplete
        visible={mentionState.active}
        query={mentionState.query}
        onSelect={handleSelect}
        onClose={() => setMentionState({ active: false, query: "", start: 0 })}
      />
    </div>
  );
}
