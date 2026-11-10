CREATE OR REPLACE FUNCTION public.mint_tiktok_order_key(p_order_id uuid, p_plan_id text, p_telegram_chat_id text, p_candidate_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_order public.bot_orders%ROWTYPE;
  v_key public.access_keys%ROWTYPE;
  v_days integer;
  v_expiry timestamptz;
BEGIN
  IF p_order_id IS NULL OR p_plan_id IS NULL OR p_plan_id NOT IN ('day', 'week', 'month', 'lifetime')
     OR p_telegram_chat_id IS NULL OR p_telegram_chat_id !~ '^-?[0-9]{1,20}$'
     OR p_candidate_key IS NULL OR p_candidate_key !~ '^TT-[0-9A-F]{20}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid request';
  END IF;

  -- Reserve the unique order before minting. Concurrent INSERTs wait for the
  -- winning transaction, then all callers lock and read the same order row.
  INSERT INTO public.bot_orders(order_id, plan_id, telegram_chat_id)
  VALUES (p_order_id, p_plan_id, p_telegram_chat_id)
  ON CONFLICT (order_id) DO NOTHING;

  SELECT * INTO STRICT v_order FROM public.bot_orders WHERE order_id = p_order_id FOR UPDATE;
  IF v_order.plan_id <> p_plan_id OR v_order.telegram_chat_id <> p_telegram_chat_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'order conflict';
  END IF;

  IF v_order.key_id IS NOT NULL THEN
    SELECT * INTO STRICT v_key FROM public.access_keys WHERE id = v_order.key_id;
    RETURN jsonb_build_object('product', 'tiktok', 'key_code', v_key.key_code,
      'expires_at', v_key.expires_at, 'reused', true);
  END IF;

  v_days := CASE p_plan_id WHEN 'day' THEN 1 WHEN 'week' THEN 7 WHEN 'month' THEN 30 ELSE NULL END;
  v_expiry := CASE WHEN v_days IS NULL THEN NULL ELSE now() + v_days * interval '24 hours' END;
  INSERT INTO public.access_keys(key_code, label, is_active, is_admin, expires_at)
  VALUES (p_candidate_key, 'bot:' || p_telegram_chat_id, true, false, v_expiry)
  RETURNING * INTO v_key;
  UPDATE public.bot_orders SET key_id = v_key.id WHERE order_id = p_order_id;
  RETURN jsonb_build_object('product', 'tiktok', 'key_code', v_key.key_code,
    'expires_at', v_key.expires_at, 'reused', false);
END;
$$;
REVOKE ALL ON FUNCTION public.mint_tiktok_order_key(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mint_tiktok_order_key(uuid, text, text, text) TO service_role;
COMMENT ON FUNCTION public.mint_tiktok_order_key(uuid, text, text, text) IS 'Service-role-only atomic TikTok fulfillment: one locked order, one key, immutable plan and customer; caller verifies payment.';