import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Eye, Heart, FileText, TrendingUp, Send, RefreshCw, Loader2 } from "lucide-react";
import { getWalletSummary, requestPixPayout, refreshPayoutStatus } from "@/lib/nbpay.functions";
import { authErrorMessage, getAuthenticatedHeaders } from "@/lib/authenticated-server-fn";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NewsFlow AI" }] }),
  component: Dashboard,
});

type Tx = {
  id: string;
  amount_brl: number;
  type: string;
  status: string;
  gateway_status: string | null;
  pix_key: string | null;
  description: string | null;
  created_at: string;
};

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ articles: 0, views: 0, likes: 0 });
  const [wallet, setWallet] = useState<{ balance: number; nbpayBalance: number; transactions: Tx[] }>({ balance: 0, nbpayBalance: 0, transactions: [] });
  const [userEmail, setUserEmail] = useState<string>("");
  const [pixKey, setPixKey] = useState("");
  const [amount, setAmount] = useState("50");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchWallet = useServerFn(getWalletSummary);
  const payoutFn = useServerFn(requestPixPayout);
  const refreshFn = useServerFn(refreshPayoutStatus);

  async function load() {
    try {
      setLoading(true);
      const { headers, session } = await getAuthenticatedHeaders();
      if (!session.user) { window.location.href = "/login"; return; }
      const user = session.user;
      setUserEmail(user.email ?? "");
      const [{ count: articles }, { data: myArticles }, w] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("author_id", user.id),
        supabase.from("articles").select("id, views_count, likes_count").eq("author_id", user.id),
        fetchWallet({ headers }),
      ]);
      const views = (myArticles ?? []).reduce((s, a) => s + (a.views_count ?? 0), 0);
      const likes = (myArticles ?? []).reduce((s, a) => s + (a.likes_count ?? 0), 0);
      setStats({ articles: articles ?? 0, views, likes });
      const ww: any = w ?? {};
      setWallet({ balance: Number(ww.balance ?? 0), transactions: Array.isArray(ww.transactions) ? ww.transactions : [] });
    } catch (e: any) {
      if (e?.message?.includes("Sessão expirada") || e instanceof Response && e.status === 401) window.location.href = "/login";
      setFeedback({ ok: false, msg: authErrorMessage(e, "Erro ao carregar o dashboard") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submitPayout(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const { headers } = await getAuthenticatedHeaders();
      const res = await payoutFn({
        data: { amountBrl: Number(amount), pixKey: pixKey.trim() },
        headers,
      });
      if (res.ok) {
        setFeedback({ ok: true, msg: `Saque solicitado • status: ${res.status}` });
        setPixKey("");
        await load();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Erro" });
      }
    } catch (e: any) {
      if (e?.message?.includes("Sessão expirada") || e instanceof Response && e.status === 401) window.location.href = "/login";
      setFeedback({ ok: false, msg: authErrorMessage(e, "Erro de rede") });
    } finally {
      setSubmitting(false);
    }
  }

  async function refresh(txId: string) {
    const { headers } = await getAuthenticatedHeaders();
    await refreshFn({ data: { txId }, headers });
    await load();
  }

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
        <StatCard icon={<Wallet />} label="Saldo (R$)" value={Number(wallet?.balance ?? 0).toFixed(2)} highlight />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-10">
        <div className="rounded-2xl bg-gradient-card border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Send className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">Sacar via PIX (NBPay)</h2>
          </div>
          <form onSubmit={submitPayout} className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Chave PIX</label>
              <input value={pixKey} onChange={(e) => setPixKey(e.target.value)} required minLength={5}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                className="mt-1 w-full h-11 px-3 rounded-lg bg-background border border-border focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Valor (R$ — mín. 50,00)</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={50} step="0.01" required
                className="mt-1 w-full h-11 px-3 rounded-lg bg-background border border-border focus:border-primary outline-none" />
            </div>
            <button disabled={submitting || wallet.balance < 50}
              className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-full bg-gradient-ember text-primary-foreground font-semibold shadow-glow disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Solicitar saque
            </button>
            {feedback && (
              <p className={`text-sm ${feedback.ok ? "text-primary" : "text-destructive"}`}>{feedback.msg}</p>
            )}
            {wallet.balance < 50 && (
              <p className="text-xs text-muted-foreground">Acumule pelo menos R$ 50,00 em receita para sacar.</p>
            )}
          </form>
        </div>

        <div className="rounded-2xl bg-gradient-card border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">Últimas transações</h2>
          </div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {wallet.transactions.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem transações ainda. Publique artigos para começar a monetizar.</p>
            )}
            {wallet.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background/40 border border-border">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.description ?? t.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("pt-BR")} • {t.status}{t.gateway_status ? ` • ${t.gateway_status}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-display text-sm ${t.type === "payout_pix" ? "text-destructive" : "text-primary"}`}>
                    {t.type === "payout_pix" ? "−" : "+"}R$ {Number(t.amount_brl).toFixed(2)}
                  </span>
                  {t.type === "payout_pix" && t.status === "pending" && (
                    <button onClick={() => refresh(t.id)} className="p-1.5 rounded hover:bg-muted" title="Atualizar status">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-card border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg">Como funciona a monetização</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Cada visualização real e cada clique em anúncio gera receita conforme o CPM dos anunciantes ativos.
          O saldo é creditado automaticamente na sua carteira e pode ser sacado via PIX a partir de R$ 50,00
          através da integração com a <strong className="text-foreground">NBPay</strong>. Toda receita vem de
          tráfego e anunciantes reais.
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
