import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Eye, MessageSquare, Wallet, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const [s, setS] = useState({
    articles: 0,
    pending: 0,
    views7d: 0,
    revenue7d: 0,
    impressions7d: 0,
    clicks7d: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [{ count: articles }, { count: pending }, { data: views }, { data: ads }] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }),
        supabase.from("article_comments").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("article_views").select("id").gte("created_at", since),
        supabase
          .from("ad_impressions")
          .select("event_type, estimated_revenue_brl")
          .gte("created_at", since),
      ]);

      const revenue = (ads ?? []).reduce((a, r: any) => a + Number(r.estimated_revenue_brl ?? 0), 0);
      const impressions = (ads ?? []).filter((r: any) => r.event_type === "impression").length;
      const clicks = (ads ?? []).filter((r: any) => r.event_type === "click").length;

      setS({
        articles: articles ?? 0,
        pending: pending ?? 0,
        views7d: views?.length ?? 0,
        revenue7d: revenue,
        impressions7d: impressions,
        clicks7d: clicks,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="h-40 skeleton rounded-2xl" />;

  const cpm = s.impressions7d > 0 ? (s.revenue7d / s.impressions7d) * 1000 : 0;
  const ctr = s.impressions7d > 0 ? (s.clicks7d / s.impressions7d) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card icon={<FileText />} label="Artigos publicados" value={s.articles.toString()} />
      <Card icon={<MessageSquare />} label="Comentários pendentes" value={s.pending.toString()} highlight={s.pending > 0} />
      <Card icon={<Eye />} label="Views (7d)" value={s.views7d.toLocaleString("pt-BR")} />
      <Card icon={<Wallet />} label="Receita estimada (7d)" value={`R$ ${s.revenue7d.toFixed(2)}`} />
      <Card icon={<TrendingUp />} label="CPM médio" value={`R$ ${cpm.toFixed(2)}`} />
      <Card icon={<TrendingUp />} label="CTR" value={`${ctr.toFixed(2)}%`} />
    </div>
  );
}

function Card({
  icon, label, value, highlight,
}: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "bg-gradient-ember text-primary-foreground border-transparent shadow-glow" : "bg-gradient-card border-border"}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">{icon}{label}</div>
      <div className="font-display text-3xl mt-2">{value}</div>
    </div>
  );
}
