-- Assignment FKs for copywriter workload and site sourcing (user disable / reassignment flows)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS copywriter_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS sourcer_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_copywriter_active
  ON public.orders (copywriter_id)
  WHERE copywriter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sites_sourcer_assigned
  ON public.sites (sourcer_id)
  WHERE sourcer_id IS NOT NULL;

COMMENT ON COLUMN public.orders.copywriter_id IS
  'Optional assigned copywriter for this order; cleared or reassigned when disabling that user.';

COMMENT ON COLUMN public.sites.sourcer_id IS
  'Profile responsible for sourcing this listing; cleared when disabling that sourcer.';
