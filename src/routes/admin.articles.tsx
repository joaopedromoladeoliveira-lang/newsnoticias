import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Eye, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/articles")({
  component: AdminArticles,
});

interface Row {
  id: string;
  title: string;
  category: string;
  status: string;
  views_count: number;
  likes_count: number;
  created_at: string;
}

const CATEGORIES = ["all", "ia", "tecnologia", "games", "futebol", "negocios", "cripto", "viral"] as const;
const STATUSES = ["all", "draft", "published", "archived"] as const;

function AdminArticles() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("articles")
      .select("id, title, category, status, views_count, likes_count, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (cat !== "all") q = q.eq("category", cat as any);
    if (status !== "all") q = q.eq("status", status as any);
    const { data } = await q;
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [cat, status]);

  const remove = async (id: string) => {
    if (!confirm("Remover este artigo?")) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Artigo removido"); setRows((r) => r.filter((x) => x.id !== id)); }
  };

  const setArticleStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("articles").update({ status: newStatus as any }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizado"); setRows((r) => r.map((x) => (x.id === id ? { ...x, status: newStatus } : x))); }
  };

  const saveViews = async (row: Row, newViews: number) => {
    if (!Number.isFinite(newViews) || newViews < 0) { toast.error("Valor inválido"); return; }
    const delta = Math.floor(newViews) - row.views_count;
    const { error } = await supabase.from("articles").update({ views_count: Math.floor(newViews) }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    if (delta > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const amount = delta * 2;
        const { error: wErr } = await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          type: "credit_views",
          status: "confirmed",
          amount_brl: amount,
          description: `+${delta} views manuais • artigo ${row.id}`,
        });
        if (wErr) toast.error(`Views ok, mas saldo falhou: ${wErr.message}`);
        else toast.success(`+${delta} views • +R$ ${amount.toFixed(2)} no saldo`);
      }
    } else {
      toast.success("Views atualizadas");
    }
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, views_count: Math.floor(newViews) } : x)));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Select label="Categoria" value={cat} onChange={setCat} options={CATEGORIES} />
        <Select label="Status" value={status} onChange={setStatus} options={STATUSES} />
        <span className="text-sm text-muted-foreground ml-auto">{rows.length} artigo(s)</span>
      </div>

      {loading ? (
        <div className="h-40 grid place-items-center"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Título</th>
                <th className="text-left p-3">Categoria</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3"><Eye className="inline h-3 w-3" /></th>
                <th className="text-right p-3"><Heart className="inline h-3 w-3" /></th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-3 max-w-md truncate font-medium">{r.title}</td>
                  <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{r.category}</span></td>
                  <td className="p-3">
                    <select
                      value={r.status}
                      onChange={(e) => setArticleStatus(r.id, e.target.value)}
                      className="h-7 px-2 text-xs rounded bg-input border border-border"
                    >
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                      <option value="archived">archived</option>
                    </select>
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    <ViewsEditor row={r} onSave={saveViews} />
                  </td>
                  <td className="p-3 text-right tabular-nums">{r.likes_count.toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum artigo</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 px-3 rounded-lg bg-input border border-border text-sm">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
