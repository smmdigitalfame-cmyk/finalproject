CREATE TABLE public.bot_orders (
  order_id uuid PRIMARY KEY,
  plan_id text NOT NULL,
  telegram_chat_id text NOT NULL,
  key_id uuid REFERENCES public.access_keys(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.bot_orders TO service_role;

ALTER TABLE public.bot_orders ENABLE ROW LEVEL SECURITY;