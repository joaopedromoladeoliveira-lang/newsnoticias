import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ExternalLink, Clock, Share2, Bookmark, Heart } from "lucide-react";
import { fetchNewsById } from "@/lib/news.functions";
import { AdSlot } from "@/components/AdSlot";
import { supabase } from "@/integrations/supabase/client";
import { useViewTracking } from "@/hooks/use-view-tracking";
import { toast } from "sonner";

export const Route = createFileRoute("/news/$id")({
  component: NewsDetail,
});

function NewsDetail() {
  const { id } = Route.useParams();
  const fn = useServerFn(fetchNewsById);
  const { data, isLoading } = useQuery({
    queryKey: ["news-detail", id],
    queryFn: () => fn({ data: { id } }),
  });

  const item = data?.item;

  // Real view + dwell-time tracking
  useViewTracking({ externalUrl: item?.link ?? null });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 space-y-6">
        <div className="h-8 w-32 skeleton rounded" />
        <div className="h-12 w-full skeleton rounded" />
        <div className="aspect-[16/9] skeleton rounded-2xl" />
      </main>
    );
  }

  if (!item) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Notícia indisponível</h1>
        <p className="text-muted-foreground mt-2">Esta notícia não está mais disponível na fonte.</p>
        <Link to="/" className="mt-4 inline-block text-primary">← Voltar</Link>
      </main>
    );
  }

  const date = item.pubDate ? new Date(item.pubDate.replace(" ", "T") + "Z") : null;

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: item.title, url: item.link }); } catch {}
    } else {
      navigator.clipboard.writeText(item.link);
      toast.success("Link copiado");
    }
  };

  const save = async () => {
    const { error } = await supabase.from("article_saves").insert({
      external_url: item.link,
      external_title: item.title,
      external_image: item.image_url,
      external_source: item.source_name || item.source_id,
      user_id: (await supabase.auth.getUser()).data.user?.id ?? "",
    } as any);
    if (error) toast.error("Faça login para salvar");
    else toast.success("Salvo na sua biblioteca");
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar ao feed
      </Link>

      <article className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider mb-4">
          {item.category?.slice(0, 2).map((c) => (
            <span key={c} className="px-2.5 py-1 rounded-full bg-primary/15 text-primary font-semibold">{c}</span>
          ))}
          <span className="text-muted-foreground font-semibold">{item.source_name || item.source_id}</span>
        </div>

        <h1 className="font-display text-4xl md:text-5xl leading-[1.05] mb-6">{item.title}</h1>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-border">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {item.creator?.[0] && <span>Por <span className="text-foreground font-medium">{item.creator[0]}</span></span>}
            {date && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {date.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toast.success("Curtido!")} className="h-10 w-10 rounded-full bg-muted hover:bg-secondary flex items-center justify-center" title="Curtir">
              <Heart className="h-4 w-4" />
            </button>
            <button onClick={save} className="h-10 w-10 rounded-full bg-muted hover:bg-secondary flex items-center justify-center" title="Salvar">
              <Bookmark className="h-4 w-4" />
            </button>
            <button onClick={share} className="h-10 w-10 rounded-full bg-muted hover:bg-secondary flex items-center justify-center" title="Compartilhar">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {item.image_url && (
          <img src={item.image_url} alt={item.title} className="w-full rounded-2xl mb-8 shadow-card" />
        )}

        {item.description && (
          <p className="text-xl leading-relaxed text-foreground/90 mb-6 font-medium border-l-2 border-primary pl-5">
            {item.description}
          </p>
        )}

        <div className="my-8"><AdSlot slot="article_inline_top" format="banner" /></div>

        {item.content && item.content !== "ONLY AVAILABLE IN PAID PLANS" && (
          <div className="prose prose-invert max-w-none text-foreground/90 leading-relaxed space-y-4">
            {item.content.split("\n").filter(Boolean).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        <div className="mt-10 p-6 rounded-2xl bg-gradient-card border border-border">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Conteúdo completo na fonte original</div>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-gradient-ember text-primary-foreground font-semibold shadow-glow"
          >
            Ler na {item.source_name || item.source_id} <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="my-10"><AdSlot slot="article_bottom" format="card" /></div>
      </article>
    </main>
  );
}
