import { Link } from "@tanstack/react-router";
import { Clock, ExternalLink } from "lucide-react";
import type { NewsItem } from "@/lib/news.functions";

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function NewsCard({ item, featured = false }: { item: NewsItem; featured?: boolean }) {
  const source = item.source_name || item.source_id || "Fonte";
  const img = item.image_url;

  if (featured) {
    return (
      <Link
        to="/news/$id"
        params={{ id: item.article_id }}
        className="group relative block overflow-hidden rounded-2xl bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300 animate-fade-up"
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => ((e.currentTarget.style.display = "none"))}
            />
          ) : (
            <div className="h-full w-full bg-gradient-ember opacity-30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-3 font-semibold">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Em destaque
            </div>
            <h2 className="font-display text-2xl md:text-3xl leading-tight mb-3 group-hover:text-gradient-ember transition-colors">
              {item.title}
            </h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">{source}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {timeAgo(item.pubDate)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/news/$id"
      params={{ id: item.article_id }}
      className="group flex gap-4 p-4 rounded-xl hover:bg-surface transition-colors animate-fade-up"
    >
      {img ? (
        <div className="relative shrink-0 w-28 h-28 sm:w-36 sm:h-28 overflow-hidden rounded-lg bg-muted">
          <img
            src={img}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => ((e.currentTarget.style.display = "none"))}
          />
        </div>
      ) : (
        <div className="shrink-0 w-28 h-28 sm:w-36 sm:h-28 rounded-lg bg-gradient-ember opacity-20" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
          <span className="font-semibold text-primary uppercase tracking-wide">{source}</span>
          <span>•</span>
          <span>{timeAgo(item.pubDate)}</span>
        </div>
        <h3 className="font-display text-base sm:text-lg leading-snug line-clamp-3 group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2 hidden sm:block">
            {item.description}
          </p>
        )}
      </div>
    </Link>
  );
}

export function NewsCardSkeleton({ featured = false }: { featured?: boolean }) {
  if (featured) return <div className="aspect-[16/9] rounded-2xl skeleton" />;
  return (
    <div className="flex gap-4 p-4">
      <div className="shrink-0 w-28 h-28 sm:w-36 sm:h-28 rounded-lg skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 rounded skeleton" />
        <div className="h-5 w-full rounded skeleton" />
        <div className="h-5 w-2/3 rounded skeleton" />
      </div>
    </div>
  );
}
