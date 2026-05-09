import { createServerFn } from "@tanstack/react-start";

export type NewsCategory = "ia" | "tecnologia" | "games" | "futebol" | "negocios" | "cripto" | "viral" | "all";

export interface NewsItem {
  article_id: string;
  title: string;
  link: string;
  description: string | null;
  content: string | null;
  pubDate: string | null;
  image_url: string | null;
  source_id: string | null;
  source_name?: string | null;
  source_icon?: string | null;
  creator: string[] | null;
  category: string[] | null;
  country: string[] | null;
  language: string | null;
}

// Map our internal category to NewsData.io categories + keywords
const CATEGORY_MAP: Record<Exclude<NewsCategory, "all">, { category?: string; q?: string }> = {
  ia: { q: "inteligência artificial OR IA OR AI OR ChatGPT OR OpenAI" },
  tecnologia: { category: "technology" },
  games: { q: "games OR gaming OR PlayStation OR Xbox OR Nintendo OR esports" },
  futebol: { q: "futebol OR brasileirão OR libertadores OR copa" },
  negocios: { category: "business" },
  cripto: { q: "bitcoin OR ethereum OR criptomoeda OR crypto OR blockchain" },
  viral: { q: "viral OR trending OR tiktok" },
};

export const fetchNews = createServerFn({ method: "GET" })
  .inputValidator((input: { category?: NewsCategory; page?: string | null; q?: string }) => ({
    category: (input.category ?? "all") as NewsCategory,
    page: input.page ?? null,
    q: input.q ?? "",
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) {
      return { results: [] as NewsItem[], nextPage: null as string | null, error: "API key não configurada" };
    }

    const params = new URLSearchParams({
      apikey: apiKey,
      language: "pt",
      country: "br",
      removeduplicate: "1",
      image: "1",
    });

    if (data.q && data.q.trim()) {
      params.set("q", data.q.trim().slice(0, 200));
    } else if (data.category && data.category !== "all") {
      const map = CATEGORY_MAP[data.category];
      if (map.category) params.set("category", map.category);
      if (map.q) params.set("q", map.q);
    }

    if (data.page) params.set("page", data.page);

    try {
      const res = await fetch(`https://newsdata.io/api/1/latest?${params.toString()}`);
      if (!res.ok) {
        const body = await res.text();
        console.error("NewsData error", res.status, body);
        return { results: [], nextPage: null, error: `NewsData ${res.status}` };
      }
      const json = (await res.json()) as {
        status: string;
        results?: NewsItem[];
        nextPage?: string | null;
      };
      return {
        results: json.results ?? [],
        nextPage: json.nextPage ?? null,
        error: null as string | null,
      };
    } catch (e) {
      console.error("NewsData fetch failed", e);
      return { results: [], nextPage: null, error: "Falha ao buscar notícias" };
    }
  });

export const fetchNewsById = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) return { item: null as NewsItem | null, error: "API key não configurada" };
    try {
      const res = await fetch(
        `https://newsdata.io/api/1/latest?apikey=${apiKey}&id=${encodeURIComponent(data.id)}`
      );
      if (!res.ok) return { item: null, error: `NewsData ${res.status}` };
      const json = (await res.json()) as { results?: NewsItem[] };
      return { item: json.results?.[0] ?? null, error: null as string | null };
    } catch {
      return { item: null, error: "Falha ao buscar notícia" };
    }
  });
