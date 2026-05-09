
-- =========================
-- 1. ROLES (separate table)
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Roles readable by self or admin" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- 2. PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user_' || substr(replace(NEW.id::text, '-', ''), 1, 12)
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- 3. ARTICLES
-- =========================
CREATE TYPE public.article_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.article_category AS ENUM ('ia', 'tecnologia', 'games', 'futebol', 'negocios', 'cripto', 'viral');

CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_url TEXT,
  category public.article_category NOT NULL DEFAULT 'tecnologia',
  tags TEXT[] DEFAULT '{}',
  status public.article_status NOT NULL DEFAULT 'draft',
  read_minutes INT DEFAULT 3,
  views_count INT NOT NULL DEFAULT 0,
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_articles_status_published ON public.articles(status, published_at DESC);
CREATE INDEX idx_articles_category ON public.articles(category);
CREATE INDEX idx_articles_author ON public.articles(author_id);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published articles are public" ON public.articles
  FOR SELECT USING (status = 'published' OR auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors create own articles" ON public.articles
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own articles" ON public.articles
  FOR UPDATE USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors delete own articles" ON public.articles
  FOR DELETE USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 4. LIKES
-- =========================
CREATE TABLE public.article_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, user_id)
);
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are public" ON public.article_likes FOR SELECT USING (true);
CREATE POLICY "Users like" ON public.article_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike" ON public.article_likes FOR DELETE USING (auth.uid() = user_id);

-- =========================
-- 5. COMMENTS
-- =========================
CREATE TABLE public.article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments public" ON public.article_comments FOR SELECT USING (true);
CREATE POLICY "Users create comment" ON public.article_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comment" ON public.article_comments FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =========================
-- 6. SAVES
-- =========================
CREATE TABLE public.article_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  external_url TEXT,
  external_title TEXT,
  external_image TEXT,
  external_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (article_id IS NOT NULL OR external_url IS NOT NULL)
);
ALTER TABLE public.article_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own saves" ON public.article_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users save" ON public.article_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unsave" ON public.article_saves FOR DELETE USING (auth.uid() = user_id);

-- =========================
-- 7. CATEGORY FOLLOWS
-- =========================
CREATE TABLE public.category_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.article_category NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);
ALTER TABLE public.category_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own follows" ON public.category_follows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users follow" ON public.category_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unfollow" ON public.category_follows FOR DELETE USING (auth.uid() = user_id);

-- =========================
-- 8. USER FOLLOWS
-- =========================
CREATE TABLE public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows public" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Users follow others" ON public.user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users unfollow others" ON public.user_follows FOR DELETE USING (auth.uid() = follower_id);

-- =========================
-- 9. VIEWS (analytics real)
-- =========================
CREATE TABLE public.article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  external_url TEXT,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_hash TEXT,
  country TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_views_article ON public.article_views(article_id, created_at DESC);
ALTER TABLE public.article_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone records view" ON public.article_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Authors see own views" ON public.article_views FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_views.article_id AND a.author_id = auth.uid())
);

-- =========================
-- 10. AD IMPRESSIONS / CLICKS (real CPM tracking)
-- =========================
CREATE TYPE public.ad_event_type AS ENUM ('impression', 'click');

CREATE TABLE public.ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slot TEXT NOT NULL,
  event_type public.ad_event_type NOT NULL DEFAULT 'impression',
  estimated_revenue_brl NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ads_article ON public.ad_impressions(article_id, created_at DESC);
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone records ad event" ON public.ad_impressions FOR INSERT WITH CHECK (true);
CREATE POLICY "Authors see own ads" ON public.ad_impressions FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.articles a WHERE a.id = ad_impressions.article_id AND a.author_id = auth.uid())
);

-- =========================
-- 11. WALLET (carteira real)
-- =========================
CREATE TYPE public.wallet_tx_type AS ENUM ('credit_views', 'credit_ads', 'credit_sponsor', 'payout_pix', 'adjustment');
CREATE TYPE public.wallet_tx_status AS ENUM ('pending', 'confirmed', 'paid', 'rejected');

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.wallet_tx_type NOT NULL,
  amount_brl NUMERIC(12,2) NOT NULL,
  status public.wallet_tx_status NOT NULL DEFAULT 'confirmed',
  description TEXT,
  pix_key TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_user ON public.wallet_transactions(user_id, created_at DESC);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own wallet" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users request payout" ON public.wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND type = 'payout_pix' AND status = 'pending');
CREATE POLICY "Admins manage wallet" ON public.wallet_transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- 12. STORAGE bucket for article images
-- =========================
INSERT INTO storage.buckets (id, name, public) VALUES ('article-images', 'article-images', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Article images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'article-images');
CREATE POLICY "Users upload own article images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'article-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own article images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'article-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own article images" ON storage.objects
  FOR DELETE USING (bucket_id = 'article-images' AND auth.uid()::text = (storage.foldername(name))[1]);
