import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Disc3,
  Heart,
  ListMusic,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
  User,
  GripVertical,
  Pencil,
} from "lucide-react";
import { useMusic } from "@/lib/music/player-context";
import { isSupportedAudio, type TrackMeta } from "@/lib/music/db";
import { formatTime } from "@/lib/music/metadata";
import { TrackCover } from "@/components/music/TrackCover";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

type Tab = "library" | "artists" | "albums" | "playlists" | "favorites" | "recent";

const TABS: { id: Tab; label: string; icon: typeof Music2 }[] = [
  { id: "library", label: "Biblioteca", icon: Music2 },
  { id: "artists", label: "Artistas", icon: User },
  { id: "albums", label: "Álbuns", icon: Disc3 },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "favorites", label: "Favoritas", icon: Heart },
  { id: "recent", label: "Recentes", icon: Clock },
];

function TrackRow({
  track,
  onPlay,
  index,
  extra,
  dragHandle,
}: {
  track: TrackMeta;
  onPlay: () => void;
  index?: number;
  extra?: React.ReactNode;
  dragHandle?: boolean;
}) {
  const { current, isPlaying, toggle, toggleFavorite, removeTrack } = useMusic();
  const active = current?.id === track.id;

  return (
    <motion.div
      layout
      className={`group flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${active ? "bg-primary/10" : "hover:bg-muted/40"}`}
    >
      {dragHandle && <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />}
      {typeof index === "number" && !dragHandle && (
        <span className="w-5 text-xs text-muted-foreground tabular-nums text-right">{index + 1}</span>
      )}
      <button
        onClick={() => (active ? toggle() : onPlay())}
        className="relative flex-shrink-0"
        aria-label={active && isPlaying ? "Pausar" : "Reproduzir"}
      >
        <TrackCover track={track} className="w-10 h-10 rounded-lg" />
        <span className="absolute inset-0 rounded-lg bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          {active && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </span>
      </button>
      <button onClick={() => (active ? toggle() : onPlay())} className="flex-1 min-w-0 text-left">
        <p className={`text-sm truncate ${active ? "text-primary font-medium" : ""}`}>{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {track.artist} • {track.album}
        </p>
      </button>
      <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">{formatTime(track.duration)}</span>
      <button
        onClick={() => toggleFavorite(track.id)}
        className={`p-1.5 rounded-lg transition-colors ${track.favorite ? "text-destructive" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"}`}
        aria-label="Favoritar"
      >
        <Heart className={`w-4 h-4 ${track.favorite ? "fill-current" : ""}`} />
      </button>
      {extra}
      <button
        onClick={() => removeTrack(track.id)}
        className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-colors"
        aria-label="Remover da biblioteca"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default function Music() {
  const {
    tracks,
    playlists,
    loading,
    importing,
    importFiles,
    playTrack,
    createPlaylist,
    renamePlaylist,
    removePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
  } = useMusic();

  const [tab, setTab] = useState<Tab>("library");
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [openPlaylist, setOpenPlaylist] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
    );
  }, [tracks, query]);

  const groupBy = (key: "artist" | "album") => {
    const map = new Map<string, TrackMeta[]>();
    filtered.forEach((t) => {
      const k = t[key] || "Desconhecido";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list).filter(isSupportedAudio);
    if (!files.length) {
      toast({ title: "Formato não suportado", description: "Use MP3, FLAC, WAV, OGG, M4A ou AAC.", variant: "destructive" });
      return;
    }
    await importFiles(files);
    toast({ title: "Importação concluída", description: `${files.length} música(s) adicionada(s).` });
  };

  const ids = (list: TrackMeta[]) => list.map((t) => t.id);

  const renderList = (list: TrackMeta[], empty: string) =>
    list.length === 0 ? (
      <p className="text-sm text-muted-foreground px-3 py-8 text-center">{empty}</p>
    ) : (
      <div className="space-y-1">
        {list.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} onPlay={() => playTrack(t.id, ids(list))} />
        ))}
      </div>
    );

  const activePlaylist = playlists.find((p) => p.id === openPlaylist) ?? null;
  const playlistTracks = activePlaylist
    ? (activePlaylist.trackIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) as TrackMeta[])
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <header className="glass-panel border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Voltar ao chat">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-display text-lg flex items-center gap-2">
          <Music2 className="w-5 h-5 text-primary" /> Música
        </h1>
        <div className="flex-1" />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Upload className="w-4 h-4" /> Importar
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".mp3,.flac,.wav,.ogg,.oga,.m4a,.aac,audio/*"
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </header>

      <div className="px-4 py-3 space-y-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por música, artista ou álbum"
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setOpenGroup(null);
                setOpenPlaylist(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm whitespace-nowrap transition-colors ${
                tab === id ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-2 pb-28">
        {importing && (
          <p className="text-xs text-primary px-3 py-2">
            Importando {importing.done}/{importing.total}...
          </p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground px-3 py-8 text-center">Carregando biblioteca...</p>
        ) : tab === "library" ? (
          renderList(filtered, "Nenhuma música ainda. Clique em Importar para adicionar do seu dispositivo.")
        ) : tab === "favorites" ? (
          renderList(filtered.filter((t) => t.favorite), "Nenhuma favorita ainda.")
        ) : tab === "recent" ? (
          renderList(
            filtered.filter((t) => t.lastPlayedAt).sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0)).slice(0, 50),
            "Nada tocado recentemente."
          )
        ) : tab === "artists" || tab === "albums" ? (
          <div className="space-y-2">
            {groupBy(tab === "artists" ? "artist" : "album").map(([name, list]) => (
              <div key={name} className="glass-panel rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenGroup(openGroup === name ? null : name)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <TrackCover track={list[0]} className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">{list.length} música(s)</p>
                  </div>
                </button>
                {openGroup === name && <div className="px-2 pb-2">{renderList(list, "")}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2 px-1">
            {!activePlaylist ? (
              <>
                <button
                  onClick={async () => {
                    const name = window.prompt("Nome da playlist");
                    if (name?.trim()) await createPlaylist(name.trim());
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Nova playlist
                </button>
                {playlists.length === 0 && (
                  <p className="text-sm text-muted-foreground px-3 py-6 text-center">Nenhuma playlist criada.</p>
                )}
                {playlists.map((p) => (
                  <div key={p.id} className="group glass-panel rounded-2xl flex items-center gap-3 px-3 py-2.5">
                    <ListMusic className="w-5 h-5 text-primary" />
                    <button onClick={() => setOpenPlaylist(p.id)} className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.trackIds.length} música(s)</p>
                    </button>
                    <button
                      onClick={async () => {
                        const name = window.prompt("Novo nome", p.name);
                        if (name?.trim()) await renamePlaylist(p.id, name.trim());
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                      aria-label="Renomear playlist"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removePlaylist(p.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive"
                      aria-label="Excluir playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setOpenPlaylist(null)} className="p-2 rounded-lg hover:bg-muted" aria-label="Voltar">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="font-display text-base flex-1 truncate">{activePlaylist.name}</h2>
                  <select
                    value=""
                    onChange={(e) => e.target.value && addToPlaylist(activePlaylist.id, [e.target.value])}
                    className="bg-transparent border border-border rounded-lg px-2 py-1.5 text-sm max-w-[180px]"
                    aria-label="Adicionar música"
                  >
                    <option value="">+ Adicionar música</option>
                    {tracks
                      .filter((t) => !activePlaylist.trackIds.includes(t.id))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                </div>
                {playlistTracks.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3 py-8 text-center">Playlist vazia.</p>
                ) : (
                  <div className="space-y-1">
                    {playlistTracks.map((t, i) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => (dragIndex.current = i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          const from = dragIndex.current;
                          dragIndex.current = null;
                          if (from === null || from === i) return;
                          const order = [...activePlaylist.trackIds];
                          const [moved] = order.splice(from, 1);
                          order.splice(i, 0, moved);
                          void reorderPlaylist(activePlaylist.id, order);
                        }}
                      >
                        <TrackRow
                          track={t}
                          dragHandle
                          onPlay={() => playTrack(t.id, ids(playlistTracks))}
                          extra={
                            <button
                              onClick={() => removeFromPlaylist(activePlaylist.id, t.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground text-xs"
                              aria-label="Remover da playlist"
                            >
                              −
                            </button>
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
