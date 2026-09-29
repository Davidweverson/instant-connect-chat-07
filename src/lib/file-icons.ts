// Mapear extensão para emoji/cor
export interface FileIconInfo {
  emoji: string;
  label: string;
  color: string;
}

export function getFileIcon(fileName: string, mime?: string): FileIconInfo {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  const m = (mime || "").toLowerCase();
  if (m.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "flac"].includes(ext))
    return { emoji: "🎵", label: "Áudio", color: "text-violet-500" };
  if (["pdf"].includes(ext)) return { emoji: "📄", label: "PDF", color: "text-red-500" };
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
    return { emoji: "🗜️", label: "Arquivo compactado", color: "text-amber-500" };
  if (["doc", "docx"].includes(ext))
    return { emoji: "📝", label: "Documento", color: "text-blue-500" };
  if (["xls", "xlsx", "csv"].includes(ext))
    return { emoji: "📊", label: "Planilha", color: "text-green-500" };
  if (["ppt", "pptx"].includes(ext))
    return { emoji: "📈", label: "Apresentação", color: "text-orange-500" };
  if (["txt", "md", "log"].includes(ext))
    return { emoji: "📃", label: "Texto", color: "text-muted-foreground" };
  if (["json", "js", "ts", "tsx", "jsx", "html", "css", "py", "java", "cpp", "c", "go", "rs"].includes(ext))
    return { emoji: "💻", label: "Código", color: "text-cyan-500" };
  return { emoji: "📎", label: "Arquivo", color: "text-muted-foreground" };
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const TEXT_EXTS = new Set(["pdf", "zip", "rar", "7z", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "txt", "md", "log", "json", "js", "ts", "tsx", "jsx", "html", "css", "py", "java", "cpp", "c", "go", "rs", "mp3", "wav", "ogg", "m4a"]);

export function isGenericFile(file: File): boolean {
  if (file.type.startsWith("image/") || file.type.startsWith("video/")) return false;
  return true;
}

export function inferAttachmentKind(file: File | { type?: string; name?: string }): "image" | "video" | "audio" | "file" {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "file";
}

export const ANY_FILE_ACCEPT = "*/*";
