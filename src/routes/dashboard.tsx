import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Eye, Heart, FileText, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NewsFlow AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ articles: 0, views: 0, likes: 0, balance: 0 });
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUserEmail(user.email ?? "");

      const [{ count: articles }, { data: myArticles }, { data: wallet }] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("author_id", user.id),
        supabase.from("articles").select("id, views_count, likes_count").eq("author_id", user.id),
        supabase.from("wallet_transactions").select("amount_brl, status").eq("user_id", user.id),
      ]);

      const views = (myArticles ?? []).reduce((s, a) => s + (a.views_count ?? 0), 0);
      const likes = (myArticles ?? []).reduce((s, a) => s + (a.likes_count ?? 0), 0);
      const balance = (wallet ?? [])
        .filter((t) => t.status === "confirmed" || t.status === "paid")
        .reduce((s, t) => s + Number(t.amount_brl), 0);

      setStats({ articles: articles ?? 0, views, likes, balance });
      setLoading(false);
    })();
  }, []);

  if (loading) return <main className="mx-auto max-w-7xl px-4 py-12"><div className="h-12 w-64 skeleton rounded" /></main>;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Bem-vindo</div>
          <h1 className="font-display text-4xl">{userEmail.split("@")[0]}</h1>
        </div>
        <Link to="/write" className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-ember text-primary-foreground font-semibold shadow-glow">
          <FileText className="h-4 w-4" /> Novo artigo
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-10">
        <StatCard icon={<FileText />} label="Seus artigos" value={stats.articles.toString()} />
        <StatCard icon={<Eye />} label="Visualizações" value={stats.views.toLocaleString("pt-BR")} />
        <StatCard icon={<Heart />} label="Curtidas" value={stats.likes.toLocaleString("pt-BR")} />
        <StatCard icon={<Wallet />} label="Saldo (R$)" value={stats.balance.toFixed(2)} highlight />
      </div>

      <div className="rounded-2xl bg-gradient-card border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg">Como funciona a monetização</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Cada visualização real e cada clique em anúncio dos seus artigos gera receita conforme o CPM
          dos anunciantes ativos. O saldo é creditado automaticamente na sua carteira e pode ser sacado
          via PIX a partir de R$ 50,00. <strong className="text-foreground">Toda receita vem de tráfego e anunciantes reais</strong> —
          conecte sua conta do Google AdSense em Configurações para ativar a monetização premium.
        </p>
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "bg-gradient-ember text-primary-foreground border-transparent shadow-glow" : "bg-gradient-card border-border"}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">{icon}{label}</div>
      <div className="font-display text-3xl mt-2">{value}</div>
    </div>
  );
}
