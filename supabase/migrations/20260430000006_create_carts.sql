-- One cart per user enforced by UNIQUE on user_id
CREATE TABLE public.carts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Same site cannot appear twice in the same cart
CREATE TABLE public.cart_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id       UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  site_id       UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  publish_date  DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, site_id)
);
