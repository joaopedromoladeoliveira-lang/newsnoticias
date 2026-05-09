import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

function sessionHash() {
  let h = sessionStorage.getItem("nf_sess");
  if (!h) {
    h = crypto.randomUUID();
    sessionStorage.setItem("nf_sess", h);
  }
  return h;
}

/**
 * Tracks a real article view + time-on-page.
 * - On mount: inserts a row in `article_views` (with referrer + session hash).
 * - On unmount: inserts an `engagement` impression in `ad_impressions` with
 *   estimated revenue calculated from dwell time (capped, conservative CPM).
 */
export function useViewTracking(opts: {
  articleId?: string | null;
  externalUrl?: string | null;
}) {
  const start = useRef<number>(Date.now());
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    if (!opts.articleId && !opts.externalUrl) return;
    tracked.current = true;
    start.current = Date.now();

    supabase.from("article_views").insert({
      article_id: opts.articleId ?? null,
      external_url: opts.externalUrl ?? null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      session_hash: sessionHash(),
    });

    return () => {
      const seconds = Math.min(600, Math.round((Date.now() - start.current) / 1000));
      // Conservative engagement revenue: ~R$0.01 per 10s, capped at R$0.30
      const revenue = Math.min(0.3, Math.round((seconds / 10) * 1) / 100);
      if (seconds < 3) return;
      supabase.from("ad_impressions").insert({
        slot: "engagement_dwell",
        article_id: opts.articleId ?? null,
        event_type: "impression",
        estimated_revenue_brl: revenue,
      });
    };
  }, [opts.articleId, opts.externalUrl]);
}
