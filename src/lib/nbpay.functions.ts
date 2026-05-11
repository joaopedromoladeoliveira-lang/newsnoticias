import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const NBPAY_BASE = "https://app.nbpay.com.br/api/v1";

function log(scope: string, payload: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(`[nbpay:${scope}]`, JSON.stringify(payload));
}

function authHeaders() {
  const apiKey = process.env.NBPAY_API_KEY;
  const clientId = process.env.NBPAY_CLIENT_ID;
  if (!apiKey || !clientId) throw new Error("Credenciais NBPay ausentes");
  return {
    Authorization: `Bearer ${apiKey}`,
    "X-Client-ID": clientId,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  scope: string,
  maxAttempts = 3,
): Promise<{ ok: boolean; status: number; body: any; error?: string }> {
  let lastErr: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      const body = await res.json().catch(() => ({}));
      log(scope, { attempt, status: res.status, ok: res.ok });
      // Retry on 5xx / 429
      if (!res.ok && (res.status >= 500 || res.status === 429) && attempt < maxAttempts) {
        await sleep(500 * Math.pow(2, attempt - 1));
        continue;
      }
      return { ok: res.ok, status: res.status, body };
    } catch (e: any) {
      lastErr = e;
      log(scope, { attempt, error: String(e?.message ?? e) });
      if (attempt < maxAttempts) await sleep(500 * Math.pow(2, attempt - 1));
    }
  }
  return { ok: false, status: 0, body: null, error: String(lastErr?.message ?? lastErr ?? "network") };
}

async function computeNbpayBalance(userId: string): Promise<{ balance: number; nbpayOnly: number }> {
  const { data } = await supabaseAdmin
    .from("wallet_transactions")
    .select("amount_brl, type, status, gateway_provider")
    .eq("user_id", userId);
  let bal = 0;
  let nbpayOnly = 0;
  for (const t of data ?? []) {
    const v = Number(t.amount_brl);
    const isNb = (t.gateway_provider ?? "nbpay") === "nbpay";
    const credit = t.type === "credit_ads" || t.type === "credit_sponsor" || t.type === "credit_views" || t.type === "adjustment";
    if (credit && t.status === "confirmed") {
      bal += v;
      if (isNb) nbpayOnly += v;
    }
    if (t.type === "payout_pix" && (t.status === "pending" || t.status === "confirmed" || t.status === "paid")) {
      bal -= v;
      if (isNb) nbpayOnly -= v;
    }
  }
  return { balance: bal, nbpayOnly };
}

const computeBalance = async (userId: string) => (await computeNbpayBalance(userId)).balance;

async function fetchNbpayAccountBalance(): Promise<number | null> {
  // Optional: query NBPay account balance to double-validate before payout.
  try {
    const r = await fetchWithRetry(`${NBPAY_BASE}/balance`, { headers: authHeaders() }, "balance", 2);
    if (!r.ok) return null;
    const b = r.body?.data ?? r.body ?? {};
    const v = Number(b.available ?? b.balance ?? b.amount);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

export const getWalletSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { balance, nbpayOnly } = await computeNbpayBalance(context.userId);
    const { data: txs } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id, amount_brl, type, status, gateway_status, gateway_provider, pix_key, description, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return { balance, nbpayBalance: nbpayOnly, transactions: txs ?? [] };
  });

export const requestPixPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      amountBrl: z.number().min(50, "Mínimo R$ 50,00").max(50000),
      pixKey: z.string().min(5).max(120),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { balance, nbpayOnly } = await computeNbpayBalance(context.userId);
    log("payout:start", { userId: context.userId, amount: data.amountBrl, balance, nbpayOnly });

    if (nbpayOnly < data.amountBrl) {
      return { ok: false, error: `Saldo NBPay insuficiente. Disponível: R$ ${nbpayOnly.toFixed(2)}` };
    }
    if (balance < data.amountBrl) {
      return { ok: false, error: `Saldo insuficiente. Disponível: R$ ${balance.toFixed(2)}` };
    }

    // Optional account-side validation
    const accountBal = await fetchNbpayAccountBalance();
    log("payout:account-balance", { accountBal });
    if (accountBal !== null && accountBal < data.amountBrl) {
      return { ok: false, error: `Conta NBPay sem saldo suficiente (R$ ${accountBal.toFixed(2)})` };
    }

    const { data: tx, error: txErr } = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: context.userId,
        type: "payout_pix",
        status: "pending",
        amount_brl: data.amountBrl,
        pix_key: data.pixKey,
        description: "Saque PIX via NBPay",
        gateway_provider: "nbpay",
        gateway_status: "submitting",
      })
      .select("id")
      .single();
    if (txErr || !tx) return { ok: false, error: txErr?.message ?? "Erro ao registrar saque" };

    const r = await fetchWithRetry(
      `${NBPAY_BASE}/cashout/pix`,
      { method: "POST", headers: authHeaders(), body: JSON.stringify({ amount: data.amountBrl, pix_key: data.pixKey }) },
      "payout:create",
      3,
    );

    if (!r.ok || r.body?.success === false) {
      await supabaseAdmin.from("wallet_transactions").update({
        status: "rejected",
        gateway_status: `error_${r.status}`,
        description: `Falha NBPay: ${JSON.stringify(r.body ?? r.error ?? {}).slice(0, 200)}`,
      }).eq("id", tx.id);
      log("payout:fail", { txId: tx.id, status: r.status, body: r.body });
      return { ok: false, error: r.body?.message ?? r.error ?? `Erro NBPay (${r.status})` };
    }

    const w = r.body.withdrawal ?? r.body.data ?? r.body ?? {};
    const gatewayId = String(w.id ?? w.uuid ?? w.transaction_uuid ?? "");
    await supabaseAdmin.from("wallet_transactions").update({
      gateway_tx_id: gatewayId,
      gateway_status: w.status ?? "processing",
    }).eq("id", tx.id);
    log("payout:created", { txId: tx.id, gatewayId, status: w.status });

    // Best-effort polling: try to confirm completion within a few seconds.
    let finalStatus: string = w.status ?? "processing";
    if (gatewayId) {
      for (let i = 0; i < 3; i++) {
        await sleep(1500 * (i + 1));
        const poll = await fetchWithRetry(
          `${NBPAY_BASE}/transactions/${gatewayId}`,
          { headers: authHeaders() },
          "payout:poll",
          2,
        );
        if (!poll.ok) continue;
        const remote = poll.body?.data ?? poll.body?.withdrawal ?? poll.body ?? {};
        const status = String(remote.status ?? "");
        if (!status) continue;
        finalStatus = status;
        let local: string | null = null;
        if (status === "completed" || status === "paid") local = "paid";
        else if (status === "failed" || status === "cancelled" || status === "expired") local = "rejected";
        await supabaseAdmin.from("wallet_transactions").update({
          gateway_status: status,
          ...(local ? { status: local } : {}),
          updated_at: new Date().toISOString(),
        }).eq("id", tx.id);
        log("payout:poll-update", { txId: tx.id, status, local });
        if (local) break;
      }
    }

    return { ok: true, status: finalStatus, txId: tx.id };
  });

export const refreshPayoutStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ txId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: tx } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id, user_id, gateway_tx_id, status")
      .eq("id", data.txId)
      .maybeSingle();
    if (!tx || tx.user_id !== context.userId) return { ok: false, error: "Não encontrado" };
    if (!tx.gateway_tx_id) return { ok: false, error: "Sem ID de gateway" };

    const r = await fetchWithRetry(
      `${NBPAY_BASE}/transactions/${tx.gateway_tx_id}`,
      { headers: authHeaders() },
      "refresh",
      3,
    );
    if (!r.ok) return { ok: false, error: r.error ?? `NBPay ${r.status}` };
    const remote = r.body?.data ?? r.body?.withdrawal ?? r.body ?? {};
    const status = String(remote.status ?? "unknown");
    let localStatus = tx.status;
    if (status === "completed" || status === "paid") localStatus = "paid";
    else if (status === "failed" || status === "cancelled" || status === "expired") localStatus = "rejected";
    await supabaseAdmin.from("wallet_transactions")
      .update({ gateway_status: status, status: localStatus, updated_at: new Date().toISOString() })
      .eq("id", tx.id);
    log("refresh", { txId: tx.id, status, localStatus });
    return { ok: true, status, localStatus };
  });

export const updateArticleViewsAndCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ articleId: z.string().uuid(), views: z.number().int().min(0) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return { ok: false, error: "Acesso restrito" };

    const { data: article, error: readErr } = await supabaseAdmin
      .from("articles")
      .select("views_count")
      .eq("id", data.articleId)
      .single();
    if (readErr || !article) return { ok: false, error: readErr?.message ?? "Artigo não encontrado" };

    const delta = data.views - Number(article.views_count ?? 0);
    const { error: updateErr } = await supabaseAdmin
      .from("articles")
      .update({ views_count: data.views })
      .eq("id", data.articleId);
    if (updateErr) return { ok: false, error: updateErr.message };

    if (delta > 0) {
      const amount = delta * 2;
      const { error: walletErr } = await supabaseAdmin.from("wallet_transactions").insert({
        user_id: context.userId,
        type: "credit_views",
        status: "confirmed",
        amount_brl: amount,
        description: `+${delta} views manuais • artigo ${data.articleId}`,
        reference_id: data.articleId,
        gateway_provider: "nbpay",
        gateway_status: "credited",
      });
      if (walletErr) return { ok: false, error: `Views ok, mas saldo falhou: ${walletErr.message}` };
      return { ok: true, delta, amount };
    }

    return { ok: true, delta, amount: 0 };
  });
