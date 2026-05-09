import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * AdSlot — placeholder real para AdSense / anúncios programáticos.
 *
 * Em produção, insira aqui o snippet do Google AdSense ou outro provedor:
 *   <ins class="adsbygoogle" data-ad-client="..." data-ad-slot="..." />
 *   (window.adsbygoogle = window.adsbygoogle || []).push({});
 *
 * Cada impressão é registrada na tabela ad_impressions para tracking real
 * de CPM e revenue por artigo.
 */
export function AdSlot({
  slot,
  articleId,
  format = "banner",
}: {
  slot: string;
  articleId?: string;
  format?: "banner" | "inline" | "card";
}) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    // Real impression tracking — inserts a row that contributes to revenue analytics
    supabase.from("ad_impressions").insert({
      slot,
      article_id: articleId ?? null,
      event_type: "impression",
      estimated_revenue_brl: 0, // será calculado pelo provedor real
    });
  }, [slot, articleId]);

  const heights = { banner: "h-24 md:h-28", inline: "h-32", card: "h-64" };

  return (
    <div
      className={`relative w-full ${heights[format]} rounded-xl border border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden`}
      data-ad-slot={slot}
    >
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          Espaço publicitário
        </div>
        <div className="text-xs text-muted-foreground/60">
          AdSense / Programática · slot: {slot}
        </div>
      </div>
    </div>
  );
}
