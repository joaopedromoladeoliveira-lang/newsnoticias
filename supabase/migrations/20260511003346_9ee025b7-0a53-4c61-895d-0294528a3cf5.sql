CREATE OR REPLACE FUNCTION public.credit_admin_per_view()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT ur.user_id INTO admin_id
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'admin'
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF NEW.article_id IS NOT NULL THEN
    UPDATE public.articles
    SET views_count = views_count + 1
    WHERE id = NEW.article_id;
  END IF;

  IF admin_id IS NOT NULL THEN
    INSERT INTO public.wallet_transactions (
      user_id,
      type,
      status,
      amount_brl,
      description,
      reference_id,
      gateway_provider,
      gateway_status
    )
    VALUES (
      admin_id,
      'credit_views',
      'confirmed',
      2.00,
      'Receita por visita' || COALESCE(' • artigo ' || NEW.article_id::text, ''),
      NEW.article_id,
      'nbpay',
      'credited'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_admin_per_view ON public.article_views;
CREATE TRIGGER trg_credit_admin_per_view
AFTER INSERT ON public.article_views
FOR EACH ROW
EXECUTE FUNCTION public.credit_admin_per_view();