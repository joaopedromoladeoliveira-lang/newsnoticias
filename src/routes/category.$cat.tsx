import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { fetchNews, type NewsCategory, type NewsItem } from "@/lib/news.functions";
import { NewsCard, NewsCardSkeleton } from "@/components/NewsCard";
import { AdSlot } from "@/components/AdSlot";

const CATS: Record<string, { label: string; emoji: string; tag: NewsCategory }> = {
  ia: { label: "Inteligência Artificial", emoji: "🤖", tag: "ia" },
  tecnologia: { label: "Tecnologia", emoji: "⚡", tag: "tecnologia" },
  games: { label: "Games", emoji: "🎮", tag: "games" },
  futebol: { label: "Futebol", emoji: "⚽", tag: "futebol" },
  negocios: { label: "Negócios", emoji: "📈", tag: "negocios" },
  cripto: { label: "Criptomoedas", emoji: "🪙", tag: "cripto" },
  viral: { label: "Viral", emoji: "🔥", tag: "viral" },
};

export const Route = createFileRoute("/category/$cat")({
  head: ({ params }) => {
    const c = CATS[params.cat];
    const title = c ? `${c.label} — NewsFlow AI` : "Categoria — NewsFlow AI";
    return {
      meta: [
        { title },
        { name: "description", content: `Últimas notícias de ${c?.label ?? params.cat} em tempo real.` },
        { property: "og:title", content: title },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { cat } = Route.useParams();
  const meta = CATS[cat];
  const fetchFn = useServerFn(fetchNews);

  const query = useInfiniteQuery({
    queryKey: ["news", cat],
    queryFn: ({ pageParam }) =>
      fetchFn({ data: { category: (meta?.tag ?? "all") as NewsCategory, page: pageParam ?? null } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextPage ?? null,
  });

  const items: NewsItem[] = query.data?.pages.flatMap((p) => p.results) ?? [];
  const apiError = query.data?.pages[0]?.error;

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinel.current) return;
    const obs = new IntersectionObserver((e) => {
      if (e[0].isIntersecting && query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    }, { rootMargin: "400px" });
    obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [query]);

  if (!meta) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Categoria não encontrada</h1>
        <Link to="/" className="mt-4 inline-block text-primary">Voltar ao feed</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4 animate-fade-up">
        <span className="text-5xl">{meta.emoji}</span>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Categoria</div>
          <h1 className="font-display text-4xl md:text-5xl">{meta.label}</h1>
        </div>
      </div>

      {apiError && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {apiError}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-1">
          {query.isLoading
            ? Array.from({ length: 6 }).map((_, i) => <NewsCardSkeleton key={i} />)
            : items.map((item, idx) => (
                <div key={item.article_id}>
                  <NewsCard item={item} />
                  {(idx + 1) % 6 === 0 && (
                    <div className="my-4">
                      <AdSlot slot={`cat_${cat}_${idx}`} format="inline" />
                    </div>
                  )}
                </div>
              ))}
          <div ref={sentinel} className="py-8 text-center text-sm text-muted-foreground">
            {query.isFetchingNextPage ? "Carregando mais…" : query.hasNextPage ? "" : "Fim do feed 🚀"}
          </div>
        </div>
        <aside className="space-y-6">
          <AdSlot slot={`cat_${cat}_sidebar`} format="card" />
        </aside>
      </div>
    </main>
  );
}
