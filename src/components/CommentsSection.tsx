import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { postComment } from "@/lib/comments.functions";
import { MessageCircle, Send, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  flag_reason: string | null;
  created_at: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

export function CommentsSection({ articleId }: { articleId: string }) {
  const { user } = useAuth();
  const post = useServerFn(postComment);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // Load + realtime subscription
  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("article_comments")
        .select("id, user_id, content, status, flag_reason, created_at")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!active || !data) return;
      const ids = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = ids.length
        ? await supabase
            .from("profiles")
            .select("user_id, display_name, username, avatar_url")
            .in("user_id", ids)
        : { data: [] as any[] };
      const map = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      setComments(data.map((c) => ({ ...c, profile: map.get(c.user_id) ?? null })) as Comment[]);
    };
    load();

    const ch = supabase
      .channel(`comments:${articleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "article_comments", filter: `article_id=eq.${articleId}` },
        async (payload) => {
          const c = payload.new as Comment;
          // RLS will filter — only approved or own. We optimistically ignore others.
          if (c.status !== "approved" && c.user_id !== user?.id) return;
          const { data: p } = await supabase
            .from("profiles")
            .select("user_id, display_name, username, avatar_url")
            .eq("user_id", c.user_id)
            .maybeSingle();
          setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [{ ...c, profile: p as any }, ...prev]));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [articleId, user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const content = text.trim();
    if (content.length < 2) return;
    setSending(true);
    try {
      const r: any = await post({ data: { articleId, content } });
      if (!r.ok) {
        toast.error(r.error || "Não foi possível publicar");
        return;
      }
      setText("");
      if (r.status === "rejected") {
        toast.warning("Comentário bloqueado pela moderação", { description: r.flag_reason ?? undefined });
      } else {
        toast.success("Comentário publicado");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="font-display text-2xl">Comentários</h2>
        <span className="text-sm text-muted-foreground">({comments.filter((c) => c.status === "approved").length})</span>
      </div>

      {user ? (
        <form onSubmit={submit} className="mb-8 rounded-2xl bg-gradient-card border border-border p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Compartilhe sua opinião…"
            className="w-full bg-transparent outline-none resize-none text-sm placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-3 mt-2">
            <span className="text-xs text-muted-foreground">
              <ShieldAlert className="inline h-3 w-3 mr-1" />
              Moderado por IA — respeite as diretrizes
            </span>
            <button
              disabled={sending || text.trim().length < 2}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-gradient-ember text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publicar
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary font-semibold">Entre</Link> para participar da discussão.
        </div>
      )}

      <ul className="space-y-4">
        {comments.map((c) => {
          const name = c.profile?.display_name || c.profile?.username || "Usuário";
          const isOwn = c.user_id === user?.id;
          return (
            <li
              key={c.id}
              className={`rounded-xl p-4 border ${
                c.status === "rejected"
                  ? "border-destructive/40 bg-destructive/5"
                  : c.status === "pending"
                    ? "border-yellow-500/40 bg-yellow-500/5"
                    : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {c.profile?.avatar_url ? (
                  <img src={c.profile.avatar_url} alt={name} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary/20 grid place-items-center text-xs font-semibold">
                    {name[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold">{name}</span>
                <span className="text-xs text-muted-foreground">
                  · {new Date(c.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                {isOwn && c.status !== "approved" && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                    {c.status === "rejected" ? "bloqueado" : "em análise"}
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.content}</p>
              {isOwn && c.status === "rejected" && c.flag_reason && (
                <p className="mt-2 text-xs text-destructive">{c.flag_reason}</p>
              )}
            </li>
          );
        })}
        {comments.length === 0 && (
          <li className="text-center text-sm text-muted-foreground py-8">Seja o primeiro a comentar.</li>
        )}
      </ul>
    </section>
  );
}
