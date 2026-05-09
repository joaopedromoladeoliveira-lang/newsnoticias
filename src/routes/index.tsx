import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useEffect, useRef } from "react";
import { fetchNews, type NewsItem } from "@/lib/news.functions";
import { NewsCard, NewsCardSkeleton } from "@/components/NewsCard";
import { AdSlot } from "@/components/AdSlot";
import { Sparkles, TrendingUp, Zap } from "lucide-react";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "NewsFlow AI — As notícias mais relevantes em tempo real" },
      {
        name: "description",
        content:
          "Feed inteligente de notícias sobre IA, tecnologia, games, futebol, negócios, cripto e o que está bombando agora.",
      },
      { property: "og:title", content: "NewsFlow AI" },
      { property: "og:description", content: "Feed inteligente de notícias em tempo real." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { q } = Route.useSearch();
  const fetchFn = useServerFn(fetchNews);

  const query = useInfiniteQuery({
    queryKey: ["news", "all", q ?? ""],
    queryFn: ({ pageParam }) =>
      fetchFn({ data: { category: "all", page: pageParam ?? null, q: q ?? "" } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextPage ?? null,
  });

  const items: NewsItem[] = query.data?.pages.flatMap((p) => p.results) ?? [];
  const featured = items[0];
  const rest = items.slice(1);
  const apiError = query.data?.pages[0]?.error;

  // Infinite scroll sentinel
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinel.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      },
      { rootMargin: "400px" }
    );
    obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [query]);

  return (
    <main>
      {!q && <Hero />}

      <section className="mx-auto max-w-7xl px-4 py-8">
        {q && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Resultados para</div>
            <h1 className="font-display text-3xl">"{q}"</h1>
          </div>
        )}

        {apiError && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            Não foi possível carregar notícias agora: {apiError}. Verifique a chave da API NewsData.io.
          </div>
        )}

        {query.isLoading && (
          <div className="space-y-6">
            <NewsCardSkeleton featured />
            <div className="grid gap-2 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => <NewsCardSkeleton key={i} />)}
            </div>
          </div>
        )}

        {!query.isLoading && featured && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-2">
              <NewsCard item={featured} featured />
              <div className="my-6">
                <AdSlot slot="home_top_banner" format="banner" />
              </div>
              <div className="space-y-1">
                {rest.map((item, idx) => (
                  <div key={item.article_id}>
                    <NewsCard item={item} />
                    {(idx + 1) % 8 === 0 && (
                      <div className="my-4">
                        <AdSlot slot={`home_inline_${idx}`} format="inline" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div ref={sentinel} className="py-8 text-center text-sm text-muted-foreground">
                {query.isFetchingNextPage ? "Carregando mais…" : query.hasNextPage ? "" : "Você chegou ao fim 🚀"}
              </div>
            </div>

            <aside className="space-y-6">
              <TrendingPanel items={rest.slice(0, 5)} />
              <CategoryPanel />
              <AdSlot slot="home_sidebar" format="card" />
            </aside>
          </div>
        )}

        {!query.isLoading && items.length === 0 && !apiError && (
          <div className="py-20 text-center text-muted-foreground">Nenhuma notícia encontrada.</div>
        )}
      </section>
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <div className="max-w-3xl animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Powered by AI · Atualizado em tempo real</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight">
            As notícias <span className="text-gradient-ember">que importam</span>,
            <br /> antes de todo mundo.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            IA, tecnologia, games, futebol, negócios, cripto e tudo o que está viralizando agora.
            Curado por inteligência artificial, entregue em tempo real.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/category/$cat"
              params={{ cat: "ia" }}
              className="inline-flex items-center gap-2 px-5 h-12 rounded-full bg-gradient-ember text-primary-foreground font-semibold shadow-glow hover:scale-[1.02] transition-transform"
            >
              <Zap className="h-4 w-4" /> Ver últimas em IA
            </Link>
            <Link
              to="/category/$cat"
              params={{ cat: "tecnologia" }}
              className="inline-flex items-center gap-2 px-5 h-12 rounded-full glass font-semibold hover:bg-surface transition-colors"
            >
              <TrendingUp className="h-4 w-4" /> Tendências de Tech
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <Stat n="200+" label="fontes globais" />
            <Stat n="7" label="categorias premium" />
            <Stat n="24/7" label="atualização contínua" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl text-foreground">{n}</div>
      <div className="text-xs uppercase tracking-wider">{label}</div>
    </div>
  );
}

function TrendingPanel({ items }: { items: NewsItem[] }) {
  return (
    <div className="rounded-2xl bg-gradient-card border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm uppercase tracking-wider">Em alta agora</h3>
      </div>
      <ol className="space-y-3">
        {items.map((item, i) => (
          <li key={item.article_id}>
            <Link
              to="/news/$id"
              params={{ id: item.article_id }}
              className="group flex gap-3 items-start"
            >
              <span className="font-display text-xl text-gradient-ember w-6 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm leading-snug line-clamp-3 group-hover:text-primary transition-colors">
                {item.title}
              </span>
            </Link>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-muted-foreground">—</li>}
      </ol>
    </div>
  );
}

function CategoryPanel() {
  const cats = [
    { slug: "ia", label: "Inteligência Artificial", emoji: "🤖" },
    { slug: "tecnologia", label: "Tecnologia", emoji: "⚡" },
    { slug: "games", label: "Games", emoji: "🎮" },
    { slug: "futebol", label: "Futebol", emoji: "⚽" },
    { slug: "negocios", label: "Negócios", emoji: "📈" },
    { slug: "cripto", label: "Criptomoedas", emoji: "🪙" },
    { slug: "viral", label: "Viral", emoji: "🔥" },
  ] as const;
  return (
    <div className="rounded-2xl bg-gradient-card border border-border p-5">
      <h3 className="font-display text-sm uppercase tracking-wider mb-4">Categorias</h3>
      <div className="space-y-1">
        {cats.map((c) => (
          <Link
            key={c.slug}
            to="/category/$cat"
            params={{ cat: c.slug }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface transition-colors text-sm"
          >
            <span className="text-lg">{c.emoji}</span>
            <span className="font-medium">{c.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
