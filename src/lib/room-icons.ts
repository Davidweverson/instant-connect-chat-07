import {
  MessageCircle,
  Folder,
  School,
  Flame,
  Megaphone,
  Hash,
  Image as ImageIcon,
  Film,
  Files,
  FileText,
  type LucideIcon,
} from "lucide-react";

/** Mapeamento de ícone Lucide para cada sala — usado na sidebar e no header. */
export function getRoomIcon(id: string): LucideIcon {
  if (id.startsWith("bate-papo") || id === "geral") return MessageCircle;
  if (id === "midia-1") return ImageIcon;
  if (id === "midia-2") return Film;
  if (id === "arquivos-1") return Files;
  if (id === "arquivos-2") return FileText;
  switch (id) {
    case "jogos":
      return Folder;
    case "musica":
      return School;
    case "random":
      return Flame;
    case "tecnologia":
      return Megaphone;
    default:
      return Hash;
  }
}
