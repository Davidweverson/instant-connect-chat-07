import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/hooks/useAuth";
import { NAME_COLOR_PALETTE } from "@/lib/name-colors";
import { FONT_OPTIONS } from "@/lib/fonts";

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onSaved: () => void;
}

const STATUS_EMOJIS = ["💭", "🎮", "💼", "📚", "☕", "🏃", "😴", "🎵", "🍕", "🔥", "✨", "🧠"];

export function ProfileEditModal({ open, onClose, profile, onSaved }: ProfileEditModalProps) {
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || "");
  const [statusText, setStatusText] = useState(profile.status_text || "");
  const [statusEmoji, setStatusEmoji] = useState(profile.status_emoji || "");
  const [nameColor, setNameColor] = useState(profile.name_color || "");
  const [nameFont, setNameFont] = useState(profile.name_font || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande (máx. 5MB)");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSave = async () => {
    setError("");
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 20) {
      setError("Username deve ter entre 3 e 20 caracteres");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError("Username deve conter apenas letras, números e _");
      return;
    }
    if (bio.length > 200) {
      setError("Bio muito longa (máx. 200)");
      return;
    }
    if (statusText.length > 60) {
      setError("Status muito longo (máx. 60)");
      return;
    }

    setLoading(true);
    try {
      if (trimmed !== profile.username) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", trimmed)
          .neq("id", profile.id)
          .maybeSingle();
        if (existing) {
          setError("Este username já está em uso");
          setLoading(false);
          return;
        }
      }

      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
        const path = `${profile.id}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData.publicUrl + "?t=" + Date.now();
      }

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          username: trimmed,
          avatar_url: avatarUrl,
          bio: bio.trim() || null,
          status_text: statusText.trim() || null,
          status_emoji: statusEmoji || null,
          name_color: nameColor || null,
          name_font: nameFont || null,
        } as any)
        .eq("id", profile.id);

      if (updateErr) throw updateErr;

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar perfil");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
          <div className="fixed inset-0 bg-background/55 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground">Editar Perfil</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-center mb-6">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden group border-2 border-border hover:border-primary transition-colors"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">{profile.username[0]?.toUpperCase()}</span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-1 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              maxLength={20}
            />
          </div>

          <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1 block">Bio ({bio.length}/200)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
                maxLength={200}
              placeholder="Fala um pouco sobre você..."
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-1 block">Status personalizado</label>
            <div className="flex gap-2">
              <select
                value={statusEmoji}
                onChange={(e) => setStatusEmoji(e.target.value)}
                className="px-2 py-2.5 rounded-xl bg-background border border-border text-foreground text-base"
              >
                <option value="">—</option>
                {STATUS_EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <input
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="O que você está fazendo?"
                maxLength={60}
                className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs text-muted-foreground mb-2 block">Cor do nome</label>
            <div className="flex flex-wrap gap-2">
              {NAME_COLOR_PALETTE.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNameColor(c.hsl)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                    nameColor === c.hsl ? "border-foreground scale-105" : "border-border hover:border-foreground/40"
                  }`}
                  style={c.hsl ? { color: `hsl(${c.hsl})` } : undefined}
                >
                  {c.id === "default" ? "Aa" : "Aa"}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs text-muted-foreground mb-2 block">Fonte do nome</label>
            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setNameFont("")}
                className={`rounded-xl border px-3 py-2 text-left transition-all ${
                  !nameFont ? "border-primary bg-primary/10" : "border-border hover:border-foreground/40"
                }`}
              >
                <span className="block text-sm text-foreground">{username || "Padrão"}</span>
                <span className="block text-[10px] text-muted-foreground">Padrão</span>
              </button>
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setNameFont(f.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition-all ${
                    nameFont === f.id ? "border-primary bg-primary/10" : "border-border hover:border-foreground/40"
                  }`}
                >
                  <span
                    className="block text-sm text-foreground truncate"
                    style={{ fontFamily: f.stack, ...(nameColor ? { color: `hsl(${nameColor})` } : {}) }}
                  >
                    {username || "FlashChat"}
                  </span>
                  <span className="block text-[10px] text-muted-foreground truncate">{f.name}</span>
                </button>
              ))}
            </div>
          </div>


          {error && (
            <p className="text-destructive text-sm bg-destructive/10 py-2 px-3 rounded-lg mb-4">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar
              </>
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
