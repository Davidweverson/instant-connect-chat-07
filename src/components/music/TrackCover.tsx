import { Music2 } from "lucide-react";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import type { TrackMeta } from "@/lib/music/db";

export function TrackCover({
  track,
  className = "",
  iconClassName = "w-5 h-5",
}: {
  track: TrackMeta | null | undefined;
  className?: string;
  iconClassName?: string;
}) {
  const url = useCoverUrl(track);
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center ${className}`}
    >
      {url ? (
        <img src={url} alt={track?.album || "Capa do álbum"} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <Music2 className={`${iconClassName} text-primary/70`} />
      )}
    </div>
  );
}
