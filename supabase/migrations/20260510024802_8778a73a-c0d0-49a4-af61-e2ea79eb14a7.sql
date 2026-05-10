
-- Function: credit R$2 to admin wallet per article view
CREATE OR REPLACE FUNCTION public.credit_admin_per_view()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE lower(email) = 'jpvanoempresa@gmail.com' LIMIT 1;
  IF admin_id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.wallet_transactions (user_id, type, status, amount_brl, description)
  VALUES (admin_id, 'credit_views', 'confirmed', 2.00,
    'Receita por visita' || COALESCE(' • artigo ' || NEW.article_id::text, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_admin_per_view ON public.article_views;
CREATE TRIGGER trg_credit_admin_per_view
AFTER INSERT ON public.article_views
FOR EACH ROW EXECUTE FUNCTION public.credit_admin_per_view();
