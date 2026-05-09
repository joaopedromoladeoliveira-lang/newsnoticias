import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/comments")({
  component: AdminComments,
});

type Status = "pending" | "approved" | "rejected";

interface Row {
  id: string;
  content: string;
  status: Status;
  flag_reason: string | null;
  created_at: string;
  user_id: string;
  article_id: string;
  profile?: { display_name: string | null; username: string | null } | null;
}

function AdminComments() {
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("article_comments")
      .select("id, content, status, flag_reason, created_at, user_id, article_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    const ids = [...new Set((data ?? []).map((c) => c.user_id))];
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("user_id, display_name, username").in("user_id", ids)
      : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p) => [p.user_id, p]));
    setRows(((data ?? []) as Row[]).map((r) => ({ ...r, profile: map.get(r.user_id) ?? null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const moderate = async (id: string, newStatus: Status) => {
    const { error } = await supabase
      .from("article_comments")
      .update({ status: newStatus, flag_reason: newStatus === "approved" ? null : "Moderado manualmente" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    setRows((r) => r.filter((x) => x.id !== id || filter === "all"));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("article_comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 h-9 rounded-full text-sm font-medium transition-colors ${
              filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-40 grid place-items-center"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Nenhum comentário {filter !== "all" ? `(${filter})` : ""}.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id} className="rounded-xl border border-border bg-gradient-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span className="font-semibold text-foreground">
                  {c.profile?.display_name || c.profile?.username || "Usuário"}
                </span>
                <span>·</span>
                <span>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                <span className={`ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  c.status === "approved" ? "bg-green-500/15 text-green-400" :
                  c.status === "rejected" ? "bg-destructive/15 text-destructive" :
                  "bg-yellow-500/15 text-yellow-500"
                }`}>{c.status}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.content}</p>
              {c.flag_reason && <p className="mt-2 text-xs text-muted-foreground">⚠ {c.flag_reason}</p>}
              <div className="mt-3 flex gap-2">
                {c.status !== "approved" && (
                  <button onClick={() => moderate(c.id, "approved")} className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-green-500/15 text-green-400 text-xs font-semibold hover:bg-green-500/25">
                    <Check className="h-3 w-3" /> Aprovar
                  </button>
                )}
                {c.status !== "rejected" && (
                  <button onClick={() => moderate(c.id, "rejected")} className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-destructive/15 text-destructive text-xs font-semibold hover:bg-destructive/25">
                    <X className="h-3 w-3" /> Rejeitar
                  </button>
                )}
                <button onClick={() => remove(c.id)} className="ml-auto inline-flex items-center gap-1 h-8 px-3 rounded-full text-muted-foreground hover:text-destructive text-xs">
                  <Trash2 className="h-3 w-3" /> Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
