
-- Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Tighten always-true policies
DROP POLICY IF EXISTS "Anyone records view" ON public.article_views;
CREATE POLICY "Record view" ON public.article_views
  FOR INSERT
  WITH CHECK (article_id IS NOT NULL OR (external_url IS NOT NULL AND char_length(external_url) BETWEEN 5 AND 2000));

DROP POLICY IF EXISTS "Anyone records ad event" ON public.ad_impressions;
CREATE POLICY "Record ad event" ON public.ad_impressions
  FOR INSERT
  WITH CHECK (
    char_length(slot) BETWEEN 1 AND 64
    AND estimated_revenue_brl >= 0
    AND estimated_revenue_brl < 10
  );
