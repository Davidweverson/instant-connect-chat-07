import { MessageCircle } from "lucide-react";

interface FlashLogoProps {
  className?: string;
  size?: number;
}

/**
 * Logo oficial do FlashChat — ícone de balão de conversa que herda
 * a cor primária do tema selecionado (currentColor / text-primary).
 */
export function FlashLogo({ className = "w-5 h-5 text-primary", size }: FlashLogoProps) {
  return <MessageCircle className={className} size={size} strokeWidth={2.4} />;
}
