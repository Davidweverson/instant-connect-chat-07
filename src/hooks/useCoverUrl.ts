import { useEffect, useState } from "react";
import { getCoverUrl } from "@/lib/music/metadata";
import type { TrackMeta } from "@/lib/music/db";

export function useCoverUrl(track: TrackMeta | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!track?.hasCover) {
      setUrl(null);
      return;
    }
    getCoverUrl(track.id, true).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [track?.id, track?.hasCover]);
  return url;
}
