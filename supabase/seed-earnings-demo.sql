-- Dev-only demo seed: fake sourcer earnings for March 2026 and May 2026
-- Run against the local DB:
--   npx supabase db execute --local < supabase/seed-earnings-demo.sql
-- Safe to re-run — all inserts use ON CONFLICT DO NOTHING.
--
-- Creates:
--   • 2 sourcer profiles  (alice + bob)
--   • 1 demo client profile  (for orders.user_id)
--   • 4 active sites  (2 per sourcer)
--   • 10 orders  (5 March · 5 May)  — triggers auto-create invoices + earnings
--   • 3 March earnings marked as paid

BEGIN;

-- ─── 1. Sourcer auth users ─────────────────────────────────────────────────────
-- The handle_new_user trigger reads raw_user_meta_data.role and creates the
-- corresponding profiles row (+ sets role, email, full_name) automatically.
-- The handle_new_profile trigger then creates an empty cart for each user.

INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at
) VALUES
  (
    '00000000-0000-4000-8001-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'alice.sourcer@demo.dev',
    crypt('Demo1234!', gen_salt('bf')),
    now(),
    '{"full_name": "Alice Sourcer", "role": "sourcer"}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-4000-8001-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'bob.sourcer@demo.dev',
    crypt('Demo1234!', gen_salt('bf')),
    now(),
    '{"full_name": "Bob Sourcer", "role": "sourcer"}'::jsonb,
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Demo client (orders need a real user_id) ──────────────────────────────

INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at
) VALUES
  (
    '00000000-0000-4000-8001-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'demo.client@demo.dev',
    crypt('Demo1234!', gen_salt('bf')),
    now(),
    '{"full_name": "Demo Client"}'::jsonb,
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 3. Active sites (2 per sourcer) ─────────────────────────────────────────
-- sourcer_id links each site to its sourcer; the earning trigger joins here to
-- resolve which sourcer earns from a given order.

INSERT INTO public.sites (
  id, domain, status, category_id, dr, price, link_type,
  sourcer_id, description, created_at, updated_at
) VALUES
  (
    '00000000-0000-4000-8002-000000000001'::uuid,
    'techblog-alice.demo.dev', 'active',
    (SELECT id FROM public.categories WHERE slug = 'technology' LIMIT 1),
    55, 250.00, 'dofollow',
    '00000000-0000-4000-8001-000000000001'::uuid,
    'Tech industry blog covering AI, software and startups.',
    now(), now()
  ),
  (
    '00000000-0000-4000-8002-000000000002'::uuid,
    'finance-alice.demo.dev', 'active',
    (SELECT id FROM public.categories WHERE slug = 'finance' LIMIT 1),
    48, 180.00, 'dofollow',
    '00000000-0000-4000-8001-000000000001'::uuid,
    'Personal finance and investment analysis.',
    now(), now()
  ),
  (
    '00000000-0000-4000-8002-000000000003'::uuid,
    'health-bob.demo.dev', 'active',
    (SELECT id FROM public.categories WHERE slug = 'health' LIMIT 1),
    62, 300.00, 'dofollow',
    '00000000-0000-4000-8001-000000000002'::uuid,
    'Evidence-based health and wellness content.',
    now(), now()
  ),
  (
    '00000000-0000-4000-8002-000000000004'::uuid,
    'travel-bob.demo.dev', 'active',
    (SELECT id FROM public.categories WHERE slug = 'travel' LIMIT 1),
    40, 150.00, 'dofollow',
    '00000000-0000-4000-8001-000000000002'::uuid,
    'Budget travel guides and destination reviews.',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Orders ────────────────────────────────────────────────────────────────
-- Status-transition trigger only fires on UPDATE OF status, so direct INSERT
-- with 'published' / 'completed' is safe.
--
-- Two triggers fire automatically on each INSERT:
--   on_order_created         → creates a draft invoice for the order
--   on_order_earning_refresh → creates a sourcer_earnings row using
--                              earning_month = date_trunc('month', updated_at)
--
-- Setting updated_at to a date in the target month is therefore the key to
-- landing each earning in the correct month.

-- March 2026 ──────────────────────────────────────────────────────────────────

INSERT INTO public.orders (
  id, user_id, site_id, status, price,
  publish_date, publish_month,
  site_domain, site_dr, site_category,
  site_countries, site_languages, site_link_type,
  created_at, updated_at
) VALUES
  -- Alice / techblog-alice (#1)
  (
    '00000000-0000-4000-8003-000000000001'::uuid,
    '00000000-0000-4000-8001-000000000003'::uuid,
    '00000000-0000-4000-8002-000000000001'::uuid,
    'completed', 250.00,
    '2026-03-10'::date, '2026-03-01'::date,
    'techblog-alice.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-03-05 09:00:00+00', '2026-03-10 11:00:00+00'
  ),
  -- Alice / finance-alice
  (
    '00000000-0000-4000-8003-000000000002'::uuid,
    '00000000-0000-4000-8001-000000000003'::uuid,
    '00000000-0000-4000-8002-000000000002'::uuid,
    'published', 180.00,
    '2026-03-14'::date, '2026-03-01'::date,
    'finance-alice.demo.dev', 48, 'Finance',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-03-08 10:00:00+00', '2026-03-14 14:30:00+00'
  ),
  -- Alice / techblog-alice (#2)
  (
    '00000000-0000-4000-8003-000000000003'::uuid,
    '00000000-0000-4000-8001-000000000003'::uuid,
    '00000000-0000-4000-8002-000000000001'::uuid,
    'completed', 250.00,
    '2026-03-22'::date, '2026-03-01'::date,
    'techblog-alice.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-03-15 08:00:00+00', '2026-03-22 16:00:00+00'
  ),
  -- Bob / health-bob
  (
    '00000000-0000-4000-8003-000000000004'::uuid,
    '00000000-0000-4000-8001-000000000003'::uuid,
    '00000000-0000-4000-8002-000000000003'::uuid,
    'completed', 300.00,
    '2026-03-18'::date, '2026-03-01'::date,
    'health-bob.demo.dev', 62, 'Health',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-03-12 10:00:00+00', '2026-03-18 12:00:00+00'
  ),
  -- Bob / travel-bob
  (
    '00000000-0000-4000-8003-000000000005'::uuid,
    '00000000-0000-4000-8001-000000000003'::uuid,
    '00000000-0000-4000-8002-000000000004'::uuid,
    'published', 150.00,
    '2026-03-27'::date, '2026-03-01'::date,
    'travel-bob.demo.dev', 40, 'Travel',
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
  -- Alice / techblog-alice (#1)
  (
    '00000000-0000-4000-8003-000000000006'::uuid,
    '00000000-0000-4000-8001-000000000003'::uuid,
    '00000000-0000-4000-8002-000000000001'::uuid,
    'completed', 250.00,
    '2026-05-08'::date, '2026-05-01'::date,
    'techblog-alice.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-05-02 09:00:00+00', '2026-05-08 11:00:00+00'
  ),
  -- Alice / finance-alice
  (
    '00000000-0000-4000-8003-000000000007'::uuid,
    '00000000-0000-4000-8001-000000000003'::uuid,
    '00000000-0000-4000-8002-000000000002'::uuid,
    'completed', 180.00,
    '2026-05-12'::date, '2026-05-01'::date,
    'finance-alice.demo.dev', 48, 'Finance',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-05-06 10:00:00+00', '2026-05-12 14:00:00+00'
  ),
  -- Bob / health-bob
  (
    '00000000-0000-4000-8003-000000000008'::uuid,
    '00000000-0000-4000-8001-000000000003'::uuid,
    '00000000-0000-4000-8002-000000000003'::uuid,
    'published', 300.00,
    '2026-05-16'::date, '2026-05-01'::date,
    'health-bob.demo.dev', 62, 'Health',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-05-10 08:00:00+00', '2026-05-16 10:00:00+00'
  ),
  -- Bob / travel-bob
  (
    '00000000-0000-4000-8003-000000000009'::uuid,
    '00000000-0000-4000-8001-000000000003'::uuid,
    '00000000-0000-4000-8002-000000000004'::uuid,
    'completed', 150.00,
    '2026-05-22'::date, '2026-05-01'::date,
    'travel-bob.demo.dev', 40, 'Travel',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-05-16 11:00:00+00', '2026-05-22 13:00:00+00'
  ),
  -- Alice / techblog-alice (#2)
  (
    '00000000-0000-4000-8003-000000000010'::uuid,
    '00000000-0000-4000-8001-000000000003'::uuid,
    '00000000-0000-4000-8002-000000000001'::uuid,
    'published', 220.00,
    '2026-05-28'::date, '2026-05-01'::date,
    'techblog-alice.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    '2026-05-20 09:00:00+00', '2026-05-28 16:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Mark older March earnings as paid ────────────────────────────────────
-- Only the three completed-status March orders (the two published ones stay
-- unpaid to show the mixed state).

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
