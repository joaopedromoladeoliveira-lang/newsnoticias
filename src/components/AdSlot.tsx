import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * AdSlot — placeholder real para AdSense / anúncios programáticos.
 * Tracking real:
 *  - impressão registrada na montagem (apenas se entrar no viewport)
 *  - clique registrado quando o usuário interage com o slot
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
  const ref = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || tracked.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !tracked.current) {
            tracked.current = true;
            supabase.from("ad_impressions").insert({
              slot,
              article_id: articleId ?? null,
              event_type: "impression",
              // CPM conservador: R$5 / 1000 impressões = R$0.005 por impressão
              estimated_revenue_brl: 0.005,
            });
            io.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [slot, articleId]);

  const handleClick = () => {
    // CTR real: clique vale ~R$0.20 (CPC conservador BR)
    supabase.from("ad_impressions").insert({
      slot,
      article_id: articleId ?? null,
      event_type: "click",
      estimated_revenue_brl: 0.2,
    });
  };

  const heights = { banner: "h-24 md:h-28", inline: "h-32", card: "h-64" };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleClick();
      }}
      className={`relative w-full ${heights[format]} rounded-xl border border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-muted/60 transition-colors`}
      data-ad-slot={slot}
    >
      <div className="text-center pointer-events-none">
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
