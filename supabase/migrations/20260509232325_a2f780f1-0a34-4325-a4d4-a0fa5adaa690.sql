
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.comment_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.article_comments
  ADD COLUMN IF NOT EXISTS status public.comment_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS flag_reason text;

CREATE INDEX IF NOT EXISTS idx_article_comments_article_status
  ON public.article_comments(article_id, status, created_at DESC);

-- Replace public select policy to only show approved (or own / admin)
DROP POLICY IF EXISTS "Comments public" ON public.article_comments;

CREATE POLICY "Approved comments public"
  ON public.article_comments FOR SELECT
  USING (
    status = 'approved'
    OR auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Admins can update (moderate) comments
CREATE POLICY "Admins moderate comments"
  ON public.article_comments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Length validation via trigger (prevents giant payloads)
CREATE OR REPLACE FUNCTION public.validate_comment_length()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF char_length(coalesce(NEW.content, '')) < 2 THEN
    RAISE EXCEPTION 'Comentário muito curto';
  END IF;
  IF char_length(NEW.content) > 2000 THEN
    RAISE EXCEPTION 'Comentário muito longo (máx 2000 caracteres)';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_comment_length_trg ON public.article_comments;
CREATE TRIGGER validate_comment_length_trg
  BEFORE INSERT OR UPDATE ON public.article_comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_comment_length();

-- Realtime
ALTER TABLE public.article_comments REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'article_comments';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.article_comments';
  END IF;
END $$;
