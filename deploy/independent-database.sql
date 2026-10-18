-- Apply repository migrations first, then this additive completion script.
ALTER TABLE public.login_attempts ADD COLUMN IF NOT EXISTS key_code text;
GRANT ALL ON public.access_keys, public.login_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.login_attempts_id_seq TO service_role;
REVOKE ALL ON public.access_keys, public.login_attempts FROM anon, authenticated;
ALTER TABLE public.access_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;