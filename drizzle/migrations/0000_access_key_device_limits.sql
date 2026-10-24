ALTER TABLE public.access_keys ADD COLUMN IF NOT EXISTS max_devices integer DEFAULT NULL;
ALTER TABLE public.access_keys ADD CONSTRAINT access_keys_max_devices_positive CHECK (max_devices IS NULL OR max_devices > 0);
CREATE OR REPLACE FUNCTION public.check_access_key_device(p_key text, p_device text, p_register boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k public.access_keys%ROWTYPE;
BEGIN
  SELECT * INTO k FROM public.access_keys WHERE key_code = p_key FOR UPDATE;
  IF NOT FOUND OR NOT k.is_active OR (k.expires_at IS NOT NULL AND k.expires_at <= now()) THEN RETURN false; END IF;
  IF k.max_devices IS NULL THEN RETURN true; END IF;
  IF p_device IS NULL OR p_device !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN RETURN false; END IF;
  IF k.used_devices @> jsonb_build_array(p_device) THEN RETURN true; END IF;
  IF NOT p_register OR jsonb_array_length(k.used_devices) >= k.max_devices THEN RETURN false; END IF;
  UPDATE public.access_keys SET used_devices = used_devices || jsonb_build_array(p_device), updated_at = now() WHERE id = k.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.check_access_key_device(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_access_key_device(text, text, boolean) TO service_role;