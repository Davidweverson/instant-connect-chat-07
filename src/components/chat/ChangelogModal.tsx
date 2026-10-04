import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useChangelog } from "@/hooks/useChangelog";

const badgeStyles = {
  new: "bg-green-500/20 text-green-400 border-green-500/30",
  improvement: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  fix: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const badgeLabels = {
  new: "Novo",
  improvement: "Melhoria",
  fix: "Correção",
};

interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangelogModal({ open, onClose }: ChangelogModalProps) {
  const { entries, loading } = useChangelog();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">📋 Novidades do FlashChat</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma novidade publicada ainda.</p>
        ) : (
          <div className="space-y-6 mt-2">
            {entries.map((entry) => (
              <div key={entry.id}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-bold text-primary text-sm">{entry.version}</span>
                  {entry.title && <span className="text-sm font-medium text-foreground">— {entry.title}</span>}
                  {entry.published_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.published_at).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
                {entry.image_url && (
                  <img src={entry.image_url} alt="" className="rounded-lg max-h-40 object-cover w-full mb-2" loading="lazy" />
                )}
                {entry.description && (
                  <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">{entry.description}</p>
                )}
                <ul className="space-y-1.5">
                  {entry.changes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex-shrink-0 mt-0.5 ${badgeStyles[item.type] || badgeStyles.new}`}>
                        {badgeLabels[item.type] || "Novo"}
                      </Badge>
                      <span className="text-foreground/90">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
