-- Dev-only demo seed: fake sourcer earnings for March 2026 and May 2026
-- Run against the remote DB via Supabase MCP execute_sql or:
--   psql <connection_string> -f supabase/seed-earnings-demo.sql
-- Safe to re-run — all inserts use ON CONFLICT DO NOTHING.
--
-- Creates earnings for the existing test.sourcer@local.marketwave user.
-- Uses test.client@local.marketwave as the order owner (must already exist).
-- NOTE: uses category_id=1; adjust if your categories differ.
-- NOTE: published_url is required by the orders_published_url_required check constraint.
-- WARNING: do NOT insert raw rows into auth.users — use adminClient.auth.admin.createUser
--          instead. Direct inserts leave null tokens that break the auth Admin API.

BEGIN;

-- ─── Resolve sourcer profile ID from existing auth user ───────────────────────
DO $$
DECLARE
  v_sourcer_id UUID;
BEGIN
  SELECT p.id INTO v_sourcer_id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = 'test.sourcer@local.marketwave'
  LIMIT 1;

  IF v_sourcer_id IS NULL THEN
    RAISE EXCEPTION 'User test.sourcer@local.marketwave not found — make sure this account exists first.';
  END IF;

  -- Update role to sourcer if not already set
  UPDATE public.profiles
  SET role = 'sourcer'
  WHERE id = v_sourcer_id AND role <> 'sourcer';
END $$;

-- ─── Client user for orders.user_id ──────────────────────────────────────────
-- Uses the existing test.client@local.marketwave — no raw auth.users insert needed.

-- ─── Active sites linked to test.sourcer ─────────────────────────────────────
-- sourcer_id resolved inline so we don't hard-code the UUID.

INSERT INTO public.sites (
  id, domain, status, category_id, dr, price, link_type,
  sourcer_id, description, created_at, updated_at
)
SELECT
  s.id, s.domain, 'active',
  s.category_id, s.dr, s.price, s.link_type::public.link_type,
  p.id,
  s.description,
  now(), now()
FROM (
  VALUES
    (
      '00000000-0000-4000-8002-000000000001'::uuid,
      'techblog-test.demo.dev',
      (SELECT id FROM public.categories WHERE slug = 'technology' LIMIT 1),
      55, 250.00, 'dofollow',
      'Tech industry blog covering AI, software and startups.'
    ),
    (
      '00000000-0000-4000-8002-000000000002'::uuid,
      'finance-test.demo.dev',
      (SELECT id FROM public.categories WHERE slug = 'finance' LIMIT 1),
      48, 180.00, 'dofollow',
      'Personal finance and investment analysis.'
    ),
    (
      '00000000-0000-4000-8002-000000000003'::uuid,
      'health-test.demo.dev',
      (SELECT id FROM public.categories WHERE slug = 'health' LIMIT 1),
      62, 300.00, 'dofollow',
      'Evidence-based health and wellness content.'
    ),
    (
      '00000000-0000-4000-8002-000000000004'::uuid,
      'travel-test.demo.dev',
      (SELECT id FROM public.categories WHERE slug = 'travel' LIMIT 1),
      40, 150.00, 'dofollow',
      'Budget travel guides and destination reviews.'
    )
) AS s(id, domain, category_id, dr, price, link_type, description)
JOIN public.profiles p
  ON p.id = (
    SELECT pr.id FROM public.profiles pr
    JOIN auth.users u ON u.id = pr.id
    WHERE u.email = 'test.sourcer@local.marketwave'
    LIMIT 1
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Orders ───────────────────────────────────────────────────────────────────
-- Status-transition trigger only fires on UPDATE OF status, so direct INSERT
-- with 'published' / 'completed' is safe.
--
-- Two triggers fire automatically on each INSERT:
--   on_order_created         → creates a draft invoice for the order
--   on_order_earning_refresh → creates a sourcer_earnings row where
--                              earning_month = date_trunc('month', updated_at)
--
-- updated_at is set to a date in the target month so earnings land correctly.

-- March 2026 ──────────────────────────────────────────────────────────────────

INSERT INTO public.orders (
  id, user_id, site_id, status, price,
  publish_date, publish_month,
  site_domain, site_dr, site_category,
  site_countries, site_languages, site_link_type,
  created_at, updated_at
) VALUES
  (
    '00000000-0000-4000-8003-000000000001'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000001'::uuid,
    'completed', 250.00,
    '2026-03-10'::date, '2026-03-01'::date,
    'techblog-test.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-03-05 09:00:00+00', '2026-03-10 11:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000002'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000002'::uuid,
    'published', 180.00,
    '2026-03-14'::date, '2026-03-01'::date,
    'finance-test.demo.dev', 48, 'Finance',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-03-08 10:00:00+00', '2026-03-14 14:30:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000003'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000001'::uuid,
    'completed', 250.00,
    '2026-03-22'::date, '2026-03-01'::date,
    'techblog-test.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-03-15 08:00:00+00', '2026-03-22 16:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000004'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000003'::uuid,
    'completed', 300.00,
    '2026-03-18'::date, '2026-03-01'::date,
    'health-test.demo.dev', 62, 'Health',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-03-12 10:00:00+00', '2026-03-18 12:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000005'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000004'::uuid,
    'published', 150.00,
    '2026-03-27'::date, '2026-03-01'::date,
    'travel-test.demo.dev', 40, 'Travel',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-03-20 09:00:00+00', '2026-03-27 15:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- May 2026 ────────────────────────────────────────────────────────────────────

INSERT INTO public.orders (
  id, user_id, site_id, status, price,
  publish_date, publish_month,
  site_domain, site_dr, site_category,
  site_countries, site_languages, site_link_type,
  created_at, updated_at
) VALUES
  (
    '00000000-0000-4000-8003-000000000006'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000001'::uuid,
    'completed', 250.00,
    '2026-05-08'::date, '2026-05-01'::date,
    'techblog-test.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-05-02 09:00:00+00', '2026-05-08 11:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000007'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000002'::uuid,
    'completed', 180.00,
    '2026-05-12'::date, '2026-05-01'::date,
    'finance-test.demo.dev', 48, 'Finance',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-05-06 10:00:00+00', '2026-05-12 14:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000008'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000003'::uuid,
    'published', 300.00,
    '2026-05-16'::date, '2026-05-01'::date,
    'health-test.demo.dev', 62, 'Health',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-05-10 08:00:00+00', '2026-05-16 10:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000009'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000004'::uuid,
    'completed', 150.00,
    '2026-05-22'::date, '2026-05-01'::date,
    'travel-test.demo.dev', 40, 'Travel',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-05-16 11:00:00+00', '2026-05-22 13:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000010'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000001'::uuid,
    'published', 220.00,
    '2026-05-28'::date, '2026-05-01'::date,
    'techblog-test.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-05-20 09:00:00+00', '2026-05-28 16:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Mark 3 March earnings as paid ───────────────────────────────────────────
-- The completed-status March orders; the two published ones stay unpaid.

UPDATE public.sourcer_earnings
SET
  payout_status    = 'paid',
  paid_at          = '2026-04-05 09:00:00+00',
  payout_reference = 'PAYOUT-MARCH-2026'
WHERE order_id IN (
  '00000000-0000-4000-8003-000000000001'::uuid,
  '00000000-0000-4000-8003-000000000003'::uuid,
  '00000000-0000-4000-8003-000000000004'::uuid
);

COMMIT;
