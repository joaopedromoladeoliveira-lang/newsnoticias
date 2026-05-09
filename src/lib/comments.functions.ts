import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PostInput = z.object({
  articleId: z.string().uuid(),
  content: z.string().trim().min(2).max(2000),
});

type Verdict = { status: "approved" | "rejected"; reason: string | null };

async function moderate(content: string): Promise<Verdict> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { status: "approved", reason: null }; // fail-open if not configured

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "Você é um moderador de comentários em português. Classifique o comentário como SAFE, SPAM, HATE, NSFW ou ABUSE. Responda APENAS com JSON válido no formato {\"label\":\"...\",\"reason\":\"breve motivo\"}. Considere SAFE qualquer crítica respeitosa.",
          },
          { role: "user", content },
        ],
        temperature: 0,
        max_tokens: 80,
      }),
    });

    if (!res.ok) {
      console.error("AI moderation failed:", res.status, await res.text());
      return { status: "approved", reason: null };
    }
    const data: any = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : { label: "SAFE" };
    const label = String(parsed.label || "SAFE").toUpperCase();
    if (label === "SAFE") return { status: "approved", reason: null };
    return { status: "rejected", reason: `${label}: ${parsed.reason || "violação de diretrizes"}` };
  } catch (e) {
    console.error("AI moderation exception:", e);
    return { status: "approved", reason: null };
  }
}

export const postComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PostInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Anti-spam: rate limit 1 comment / 20s / user
    const since = new Date(Date.now() - 20_000).toISOString();
    const { count } = await supabase
      .from("article_comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) > 0) {
      return { ok: false, error: "Aguarde alguns segundos antes de comentar novamente." };
    }

    // Anti-spam: regex (URLs / repetição)
    const urls = (data.content.match(/https?:\/\//gi) ?? []).length;
    const repeated = /(.)\1{9,}/.test(data.content);
    let verdict: Verdict;
    if (urls >= 3 || repeated) {
      verdict = { status: "rejected", reason: "SPAM: links em excesso ou texto repetido" };
    } else {
      verdict = await moderate(data.content);
    }

    const { data: row, error } = await supabase
      .from("article_comments")
      .insert({
        article_id: data.articleId,
        user_id: userId,
        content: data.content,
        status: verdict.status,
        flag_reason: verdict.reason,
      })
      .select("id, status, flag_reason")
      .single();

    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      status: row.status,
      flag_reason: row.flag_reason,
    };
  });
