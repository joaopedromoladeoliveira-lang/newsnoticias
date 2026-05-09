import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

interface CategoryStat { category: string; articles: number; views: number; likes: number; comments: number }
interface DayStat { day: string; views: number; revenue: number }

function AdminAnalytics() {
  const [cats, setCats] = useState<CategoryStat[]>([]);
  const [days, setDays] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();

      const [{ data: articles }, { data: viewsRows }, { data: ads }, { data: comments }] = await Promise.all([
        supabase.from("articles").select("id, category, views_count, likes_count").limit(5000),
        supabase.from("article_views").select("created_at").gte("created_at", since).limit(50000),
        supabase.from("ad_impressions").select("created_at, estimated_revenue_brl").gte("created_at", since).limit(50000),
        supabase.from("article_comments").select("article_id").eq("status", "approved").limit(5000),
      ]);

      // Aggregate per category
      const commentsByArticle = new Map<string, number>();
      for (const c of comments ?? []) commentsByArticle.set(c.article_id, (commentsByArticle.get(c.article_id) ?? 0) + 1);

      const catMap = new Map<string, CategoryStat>();
      for (const a of articles ?? []) {
        const s = catMap.get(a.category) ?? { category: a.category, articles: 0, views: 0, likes: 0, comments: 0 };
        s.articles += 1;
        s.views += a.views_count ?? 0;
        s.likes += a.likes_count ?? 0;
        s.comments += commentsByArticle.get(a.id) ?? 0;
        catMap.set(a.category, s);
      }
      setCats([...catMap.values()].sort((a, b) => b.views - a.views));

      // Aggregate per day
      const dayMap = new Map<string, DayStat>();
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000);
        dayMap.set(fmt(d), { day: fmt(d), views: 0, revenue: 0 });
      }
      for (const v of viewsRows ?? []) {
        const k = fmt(new Date(v.created_at));
        const s = dayMap.get(k); if (s) s.views += 1;
      }
      for (const a of ads ?? []) {
        const k = fmt(new Date((a as any).created_at));
        const s = dayMap.get(k); if (s) s.revenue += Number((a as any).estimated_revenue_brl ?? 0);
      }
      setDays([...dayMap.values()]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="h-40 grid place-items-center"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>;

  const maxViews = Math.max(1, ...days.map((d) => d.views));
  const maxRev = Math.max(0.01, ...days.map((d) => d.revenue));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-xl mb-3">Por categoria</h2>
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Categoria</th>
                <th className="text-right p-3">Artigos</th>
                <th className="text-right p-3">Views</th>
                <th className="text-right p-3">Curtidas</th>
                <th className="text-right p-3">Comentários</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.category} className="border-t border-border">
                  <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{c.category}</span></td>
                  <td className="p-3 text-right tabular-nums">{c.articles.toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-right tabular-nums">{c.views.toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-right tabular-nums">{c.likes.toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-right tabular-nums">{c.comments.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
              {cats.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sem dados</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl mb-3">Últimos 30 dias</h2>
        <div className="rounded-2xl border border-border bg-gradient-card p-4">
          <div className="flex items-end gap-1 h-40">
            {days.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col justify-end gap-0.5" title={`${d.day} · ${d.views} views · R$${d.revenue.toFixed(2)}`}>
                <div className="bg-primary/30 rounded-t" style={{ height: `${(d.views / maxViews) * 100}%` }} />
                <div className="bg-gradient-ember rounded-t" style={{ height: `${(d.revenue / maxRev) * 30}%` }} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/30" /> Views</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gradient-ember" /> Receita (R$)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
