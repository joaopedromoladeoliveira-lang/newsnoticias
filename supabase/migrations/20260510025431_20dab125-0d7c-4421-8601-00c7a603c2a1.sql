CREATE OR REPLACE FUNCTION public.credit_admin_per_view()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE lower(email) = 'jpvanoempresa@gmail.com' LIMIT 1;
  IF admin_id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.wallet_transactions (user_id, type, status, amount_brl, description, gateway_provider, gateway_status)
  VALUES (admin_id, 'credit_views', 'confirmed', 2.00,
    'Receita por visita' || COALESCE(' • artigo ' || NEW.article_id::text, ''),
    'nbpay', 'credited');
  RETURN NEW;
END;
$function$;

UPDATE public.wallet_transactions
SET gateway_provider = 'nbpay', gateway_status = COALESCE(gateway_status, 'credited')
WHERE type IN ('credit_views','credit_ads','credit_sponsor') AND gateway_provider IS NULL;