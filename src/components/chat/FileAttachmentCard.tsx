// Card visual para anexo do tipo "arquivo genérico" (PDF, zip, etc)
import { Download, ExternalLink } from "lucide-react";
import { getFileIcon, formatFileSize } from "@/lib/file-icons";

interface FileAttachmentCardProps {
  url: string;
  fileName: string;
  size: number;
  mimeType?: string;
  compact?: boolean;
}

export function FileAttachmentCard({ url, fileName, size, mimeType, compact }: FileAttachmentCardProps) {
  const info = getFileIcon(fileName, mimeType);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={fileName}
      className={`flex items-center gap-3 p-2.5 rounded-lg bg-background/30 border border-border hover:border-primary/50 hover:bg-background/50 transition-all group ${
        compact ? "max-w-[280px]" : "max-w-[360px]"
      }`}
      title={`Abrir ${fileName}`}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-2xl ${info.color}`}>
        {info.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
        <p className="text-xs text-muted-foreground">{info.label}{size ? ` • ${formatFileSize(size)}` : ""}</p>
      </div>
      <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
    </a>
  );
}
