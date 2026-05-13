-- Follow-up indexes for filtered listing pages.
-- Complements 20260626000001_filter_performance_indexes.sql with gaps surfaced by audit.

create index if not exists idx_sites_link_type
  on public.sites (link_type);

create index if not exists idx_sourcer_earnings_sourcer_month
  on public.sourcer_earnings (sourcer_id, earning_month);

create index if not exists idx_sites_category_status_domain
  on public.sites (category_id, status, domain);
