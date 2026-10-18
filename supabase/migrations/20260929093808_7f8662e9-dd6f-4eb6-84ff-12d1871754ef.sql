CREATE TABLE public.login_attempts (
  id bigserial PRIMARY KEY,
  ip text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_ip_time ON public.login_attempts (ip, created_at DESC);
GRANT ALL ON public.login_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.login_attempts_id_seq TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;