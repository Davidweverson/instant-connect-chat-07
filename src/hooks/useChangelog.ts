import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChangelogItem {
  type: "new" | "improvement" | "fix";
  text: string;
}

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  changes: ChangelogItem[];
  image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export function useChangelog() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("changelog_entries")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });
    setEntries(((data as any[]) || []).map((d) => ({
      ...d,
      changes: Array.isArray(d.changes) ? d.changes : [],
    })) as ChangelogEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const latestVersion = entries[0]?.version || null;

  return { entries, latestVersion, loading, reload: load };
}
