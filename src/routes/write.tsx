import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/write")({
  head: () => ({ meta: [{ title: "Publicar artigo — NewsFlow AI" }] }),
  component: WritePage,
});

const CATEGORIES = ["ia", "tecnologia", "games", "futebol", "negocios", "cripto", "viral"] as const;

function WritePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("tecnologia");
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = "/login";
    });
  }, []);

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

  const publish = async (status: "draft" | "published") => {
    if (!title.trim() || !content.trim()) return toast.error("Título e conteúdo são obrigatórios");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`;
    const { error } = await supabase.from("articles").insert({
      author_id: user.id,
      title: title.trim(),
      slug,
      excerpt: excerpt.trim() || null,
      content,
      category,
      cover_url: coverUrl.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
      read_minutes: Math.max(1, Math.round(content.split(/\s+/).length / 200)),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Artigo publicado!" : "Rascunho salvo");
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 animate-fade-up">
      <h1 className="font-display text-3xl mb-6">Novo artigo</h1>
      <div className="space-y-4">
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da matéria"
          className="w-full font-display text-3xl bg-transparent outline-none border-b border-border pb-3 focus:border-primary"
        />
        <input
          value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="URL da imagem de capa (opcional)"
          className="w-full h-11 px-4 rounded-lg bg-input border border-border outline-none focus:border-primary text-sm"
        />
        <div className="flex gap-3">
          <select
            value={category} onChange={(e) => setCategory(e.target.value as any)}
            className="h-11 px-4 rounded-lg bg-input border border-border outline-none text-sm"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={tags} onChange={(e) => setTags(e.target.value)}
            placeholder="tags, separadas, por, vírgula"
            className="flex-1 h-11 px-4 rounded-lg bg-input border border-border outline-none focus:border-primary text-sm"
          />
        </div>
        <textarea
          value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Resumo (1-2 linhas que aparecerão no feed)"
          rows={2}
          className="w-full px-4 py-3 rounded-lg bg-input border border-border outline-none focus:border-primary text-sm"
        />
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva sua matéria… (parágrafos separados por linha em branco)"
          rows={18}
          className="w-full px-4 py-3 rounded-lg bg-input border border-border outline-none focus:border-primary text-base leading-relaxed"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => publish("draft")} disabled={saving}
            className="h-11 px-5 rounded-full border border-border font-semibold disabled:opacity-50"
          >
            Salvar rascunho
          </button>
          <button
            onClick={() => publish("published")} disabled={saving}
            className="h-11 px-5 rounded-full bg-gradient-ember text-primary-foreground font-semibold shadow-glow disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Save className="h-4 w-4" /> Publicar
          </button>
        </div>
      </div>
    </main>
  );
}
