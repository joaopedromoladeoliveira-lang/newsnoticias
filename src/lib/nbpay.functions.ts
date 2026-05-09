import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const NBPAY_BASE = "https://app.nbpay.com.br/api/v1";

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

async function computeBalance(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("wallet_transactions")
    .select("amount_brl, type, status")
    .eq("user_id", userId);
  let bal = 0;
  for (const t of data ?? []) {
    const v = Number(t.amount_brl);
    const credit = t.type === "credit_ads" || t.type === "credit_sponsor" || t.type === "credit_views" || t.type === "adjustment";
    if (credit && t.status === "confirmed") bal += v;
    if (t.type === "payout_pix" && (t.status === "pending" || t.status === "confirmed" || t.status === "paid")) bal -= v;
  }
  return bal;
}

export const getWalletSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const balance = await computeBalance(context.userId);
    const { data: txs } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id, amount_brl, type, status, gateway_status, pix_key, description, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return { balance, transactions: txs ?? [] };
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
    const balance = await computeBalance(context.userId);
    if (balance < data.amountBrl) {
      return { ok: false, error: `Saldo insuficiente. Disponível: R$ ${balance.toFixed(2)}` };
    }

    // Create pending row
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
      })
      .select("id")
      .single();
    if (txErr || !tx) return { ok: false, error: txErr?.message ?? "Erro ao registrar saque" };

    try {
      const res = await fetch(`${NBPAY_BASE}/cashout/pix`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount: data.amountBrl, pix_key: data.pixKey }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        await supabaseAdmin.from("wallet_transactions").update({
          status: "rejected", gateway_status: `error_${res.status}`, description: `Falha NBPay: ${JSON.stringify(body).slice(0, 200)}`,
        }).eq("id", tx.id);
        return { ok: false, error: body?.message ?? `Erro NBPay (${res.status})` };
      }
      const w = body.withdrawal ?? body.data ?? {};
      await supabaseAdmin.from("wallet_transactions").update({
        gateway_tx_id: String(w.id ?? w.uuid ?? w.transaction_uuid ?? ""),
        gateway_status: w.status ?? "processing",
      }).eq("id", tx.id);
      return { ok: true, status: w.status ?? "processing", txId: tx.id };
    } catch (e: any) {
      await supabaseAdmin.from("wallet_transactions").update({
        status: "rejected", gateway_status: "exception", description: String(e?.message ?? e).slice(0, 200),
      }).eq("id", tx.id);
      return { ok: false, error: "Falha ao contatar NBPay" };
    }
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

    const res = await fetch(`${NBPAY_BASE}/transactions/${tx.gateway_tx_id}`, { headers: authHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `NBPay ${res.status}` };
    const remote = body.data ?? body.withdrawal ?? body;
    const status = remote.status ?? "unknown";
    let localStatus = tx.status;
    if (status === "completed" || status === "paid") localStatus = "paid";
    else if (status === "failed" || status === "cancelled" || status === "expired") localStatus = "rejected";
    await supabaseAdmin.from("wallet_transactions")
      .update({ gateway_status: status, status: localStatus, updated_at: new Date().toISOString() })
      .eq("id", tx.id);
    return { ok: true, status, localStatus };
  });
