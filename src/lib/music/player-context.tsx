import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  deletePlaylist as dbDeletePlaylist,
  deleteTrack as dbDeleteTrack,
  getFileBlob,
  listPlaylists,
  listTracks,
  savePlaylist,
  saveTrack,
  updateTrack,
  type Playlist,
  type TrackMeta,
} from "./db";
import { parseTrackFile } from "./metadata";

export type RepeatMode = "off" | "one" | "all";

interface MusicContextValue {
  tracks: TrackMeta[];
  playlists: Playlist[];
  loading: boolean;
  importing: { done: number; total: number } | null;
  current: TrackMeta | null;
  queue: string[];
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  rate: number;
  repeat: RepeatMode;
  shuffle: boolean;
  fullPlayerOpen: boolean;
  importFiles: (files: File[]) => Promise<void>;
  playTrack: (id: string, queue?: string[]) => Promise<void>;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  setRate: (v: number) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  toggleFavorite: (id: string) => Promise<void>;
  removeTrack: (id: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  removePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (playlistId: string, trackIds: string[]) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  reorderPlaylist: (playlistId: string, trackIds: string[]) => Promise<void>;
  setFullPlayerOpen: (v: boolean) => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

const PREFS_KEY = "flashchat-music-prefs";

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const prefs = useRef(loadPrefs()).current;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [tracks, setTracks] = useState<TrackMeta[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState<number>(prefs.volume ?? 1);
  const [rate, setRateState] = useState<number>(prefs.rate ?? 1);
  const [repeat, setRepeat] = useState<RepeatMode>(prefs.repeat ?? "off");
  const [shuffle, setShuffle] = useState<boolean>(prefs.shuffle ?? false);
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);

  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
  }

  useEffect(() => {
    (async () => {
      const [t, p] = await Promise.all([listTracks(), listPlaylists()]);
      setTracks(t);
      setPlaylists(p);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ volume, rate, repeat, shuffle }));
  }, [volume, rate, repeat, shuffle]);

  const current = useMemo(() => tracks.find((t) => t.id === currentId) ?? null, [tracks, currentId]);

  // refs for handlers
  const stateRef = useRef({ queue, currentId, repeat, shuffle });
  stateRef.current = { queue, currentId, repeat, shuffle };

  const loadAndPlay = useCallback(async (id: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    const blob = await getFileBlob(id);
    if (!blob) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    audio.src = url;
    audio.playbackRate = rate;
    audio.volume = volume;
    setCurrentId(id);
    try {
      await audio.play();
    } catch {
      /* autoplay blocked */
    }
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, lastPlayedAt: Date.now(), playCount: t.playCount + 1 };
        void updateTrack(updated);
        return updated;
      })
    );
  }, [rate, volume]);

  const pickNext = useCallback((dir: 1 | -1) => {
    const { queue: q, currentId: cid, shuffle: sh, repeat: rp } = stateRef.current;
    if (!q.length) return null;
    if (sh && dir === 1) {
      if (q.length === 1) return q[0];
      let candidate = cid;
      while (candidate === cid) candidate = q[Math.floor(Math.random() * q.length)];
      return candidate;
    }
    const idx = cid ? q.indexOf(cid) : -1;
    let nextIdx = idx + dir;
    if (nextIdx >= q.length) {
      if (rp === "all") nextIdx = 0;
      else return null;
    }
    if (nextIdx < 0) nextIdx = rp === "all" ? q.length - 1 : 0;
    return q[nextIdx] ?? null;
  }, []);

  const next = useCallback(() => {
    const id = pickNext(1);
    if (id) void loadAndPlay(id);
    else {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [pickNext, loadAndPlay]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const id = pickNext(-1);
    if (id) void loadAndPlay(id);
  }, [pickNext, loadAndPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setPosition(audio.currentTime);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      if (stateRef.current.repeat === "one") {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
      next();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [next]);

  const importFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setImporting({ done: 0, total: files.length });
    const added: TrackMeta[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const { meta, cover } = await parseTrackFile(file);
        const id = crypto.randomUUID();
        const full: TrackMeta = {
          ...meta,
          id,
          favorite: false,
          addedAt: Date.now(),
          lastPlayedAt: null,
          playCount: 0,
        };
        await saveTrack(full, file, cover);
        added.push(full);
      } catch {
        /* skip broken file */
      }
      setImporting({ done: i + 1, total: files.length });
    }
    setTracks((prev) => [...prev, ...added]);
    setImporting(null);
  }, []);

  const playTrack = useCallback(
    async (id: string, q?: string[]) => {
      if (q) setQueue(q);
      stateRef.current.queue = q ?? stateRef.current.queue;
      if (id === stateRef.current.currentId && audioRef.current?.src) {
        void audioRef.current.play();
        return;
      }
      await loadAndPlay(id);
    },
    [loadAndPlay]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.src) {
      const first = stateRef.current.queue[0] ?? tracks[0]?.id;
      if (first) void loadAndPlay(first);
      return;
    }
    if (audio.paused) void audio.play();
    else audio.pause();
  }, [loadAndPlay, tracks]);

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = t;
    setPosition(t);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const setRate = useCallback((v: number) => {
    setRateState(v);
    if (audioRef.current) audioRef.current.playbackRate = v;
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);

  const toggleFavorite = useCallback(async (id: string) => {
    let updated: TrackMeta | null = null;
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        updated = { ...t, favorite: !t.favorite };
        return updated;
      })
    );
    if (updated) await updateTrack(updated);
  }, []);

  const removeTrack = useCallback(async (id: string) => {
    await dbDeleteTrack(id);
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setPlaylists(await listPlaylists());
    setQueue((q) => q.filter((t) => t !== id));
    if (stateRef.current.currentId === id) {
      audioRef.current?.pause();
      setCurrentId(null);
    }
  }, []);

  const createPlaylist = useCallback(async (name: string) => {
    const p: Playlist = { id: crypto.randomUUID(), name, trackIds: [], createdAt: Date.now(), updatedAt: Date.now() };
    await savePlaylist(p);
    setPlaylists((prev) => [...prev, p]);
    return p;
  }, []);

  const mutatePlaylist = useCallback(async (id: string, fn: (p: Playlist) => Playlist) => {
    let updated: Playlist | null = null;
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        updated = { ...fn(p), updatedAt: Date.now() };
        return updated;
      })
    );
    if (updated) await savePlaylist(updated);
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => mutatePlaylist(id, (p) => ({ ...p, name })), [mutatePlaylist]);

  const removePlaylist = useCallback(async (id: string) => {
    await dbDeletePlaylist(id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addToPlaylist = useCallback(
    (playlistId: string, trackIds: string[]) =>
      mutatePlaylist(playlistId, (p) => ({
        ...p,
        trackIds: [...p.trackIds, ...trackIds.filter((t) => !p.trackIds.includes(t))],
      })),
    [mutatePlaylist]
  );

  const removeFromPlaylist = useCallback(
    (playlistId: string, trackId: string) =>
      mutatePlaylist(playlistId, (p) => ({ ...p, trackIds: p.trackIds.filter((t) => t !== trackId) })),
    [mutatePlaylist]
  );

  const reorderPlaylist = useCallback(
    (playlistId: string, trackIds: string[]) => mutatePlaylist(playlistId, (p) => ({ ...p, trackIds })),
    [mutatePlaylist]
  );

  const value: MusicContextValue = {
    tracks,
    playlists,
    loading,
    importing,
    current,
    queue,
    isPlaying,
    position,
    duration: duration || current?.duration || 0,
    volume,
    rate,
    repeat,
    shuffle,
    fullPlayerOpen,
    importFiles,
    playTrack,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    setRate,
    cycleRepeat,
    toggleShuffle,
    toggleFavorite,
    removeTrack,
    createPlaylist,
    renamePlaylist,
    removePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
    setFullPlayerOpen,
  };

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}
