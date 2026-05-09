
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS gateway_tx_id text,
  ADD COLUMN IF NOT EXISTS gateway_status text,
  ADD COLUMN IF NOT EXISTS gateway_provider text,
  ADD COLUMN IF NOT EXISTS pix_qrcode text,
  ADD COLUMN IF NOT EXISTS pix_copy_paste text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_gateway ON public.wallet_transactions(gateway_tx_id);
