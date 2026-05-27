-- Dev-only demo seed: fake data for all test roles
-- Run against the remote DB via Supabase MCP execute_sql.
-- Safe to re-run — all inserts use ON CONFLICT (id) DO NOTHING.
--
-- Requires these test users to already exist (created by ensureTestUsersForLogin):
--   test.sourcer@local.marketwave   → sourcer
--   test.client@local.marketwave    → client
--   test.manager@local.marketwave   → manager
--   test.copywriter@local.marketwave → copywriter
--
-- WARNING: do NOT insert raw rows into auth.users — use adminClient.auth.admin.createUser
--          instead. Direct inserts leave null tokens that break the auth Admin API.
--
-- What this creates:
--   • 4 active sites linked to test.sourcer
--   • 10 sourcer orders (March + May 2026) → auto-creates earnings via trigger
--   •  6 client orders (varied statuses, 2 assigned to test.copywriter)
--   • test.client assigned to test.manager via account_manager_id
--   •  3 client invoices: March=paid ($1,130), April=sent ($430), May=draft ($1,100)

BEGIN;

-- ─── 1. Sites (linked to test.sourcer) ───────────────────────────────────────

INSERT INTO public.sites (
  id, domain, status, category_id, dr, price, link_type,
  sourcer_id, description, created_at, updated_at
) VALUES
  (
    '00000000-0000-4000-8002-000000000001'::uuid,
    'techblog-test.demo.dev', 'active', 1,
    55, 250.00, 'dofollow',
    '8c753b3e-ae07-45a1-a545-ca79bd970433',
    'Tech industry blog covering AI, software and startups.',
    now(), now()
  ),
  (
    '00000000-0000-4000-8002-000000000002'::uuid,
    'finance-test.demo.dev', 'active', 1,
    48, 180.00, 'dofollow',
    '8c753b3e-ae07-45a1-a545-ca79bd970433',
    'Personal finance and investment analysis.',
    now(), now()
  ),
  (
    '00000000-0000-4000-8002-000000000003'::uuid,
    'health-test.demo.dev', 'active', 1,
    62, 300.00, 'dofollow',
    '8c753b3e-ae07-45a1-a545-ca79bd970433',
    'Evidence-based health and wellness content.',
    now(), now()
  ),
  (
    '00000000-0000-4000-8002-000000000004'::uuid,
    'travel-test.demo.dev', 'active', 1,
    40, 150.00, 'dofollow',
    '8c753b3e-ae07-45a1-a545-ca79bd970433',
    'Budget travel guides and destination reviews.',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Assign test.client → test.manager ────────────────────────────────────
-- Manager RLS (orders_select_manager_assigned) requires account_manager_id to be set.
-- Runs as service role so the profiles_guard_account_manager_change trigger allows it.

UPDATE public.profiles
SET account_manager_id = (
  SELECT p.id FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = 'test.manager@local.marketwave' LIMIT 1
)
WHERE id = (
  SELECT p.id FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = 'test.client@local.marketwave' LIMIT 1
);

-- ─── 3. Sourcer earnings orders (March + May 2026) ────────────────────────────
-- on_order_earning_refresh trigger fires on INSERT and creates sourcer_earnings
-- using earning_month = date_trunc('month', updated_at).
-- on_order_created trigger fires and auto-creates a draft invoice per order.
-- Status-transition trigger only fires on UPDATE OF status — direct INSERT is safe.

INSERT INTO public.orders (
  id, user_id, site_id, status, price,
  publish_date, publish_month,
  site_domain, site_dr, site_category,
  site_countries, site_languages, site_link_type,
  published_url,
  created_at, updated_at
) VALUES
  -- March 2026
  (
    '00000000-0000-4000-8003-000000000001'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000001'::uuid,
    'completed', 250.00, '2026-03-10', '2026-03-01',
    'techblog-test.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    'https://techblog-test.demo.dev/article-1',
    '2026-03-05 09:00:00+00', '2026-03-10 11:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000002'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000002'::uuid,
    'published', 180.00, '2026-03-14', '2026-03-01',
    'finance-test.demo.dev', 48, 'Finance',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    'https://finance-test.demo.dev/article-1',
    '2026-03-08 10:00:00+00', '2026-03-14 14:30:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000003'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000001'::uuid,
    'completed', 250.00, '2026-03-22', '2026-03-01',
    'techblog-test.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    'https://techblog-test.demo.dev/article-2',
    '2026-03-15 08:00:00+00', '2026-03-22 16:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000004'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000003'::uuid,
    'completed', 300.00, '2026-03-18', '2026-03-01',
    'health-test.demo.dev', 62, 'Health',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    'https://health-test.demo.dev/article-1',
    '2026-03-12 10:00:00+00', '2026-03-18 12:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000005'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000004'::uuid,
    'published', 150.00, '2026-03-27', '2026-03-01',
    'travel-test.demo.dev', 40, 'Travel',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    'https://travel-test.demo.dev/article-1',
    '2026-03-20 09:00:00+00', '2026-03-27 15:00:00+00'
  ),
  -- May 2026
  (
    '00000000-0000-4000-8003-000000000006'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000001'::uuid,
    'completed', 250.00, '2026-05-08', '2026-05-01',
    'techblog-test.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    'https://techblog-test.demo.dev/article-3',
    '2026-05-02 09:00:00+00', '2026-05-08 11:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000007'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000002'::uuid,
    'completed', 180.00, '2026-05-12', '2026-05-01',
    'finance-test.demo.dev', 48, 'Finance',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    'https://finance-test.demo.dev/article-2',
    '2026-05-06 10:00:00+00', '2026-05-12 14:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000008'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000003'::uuid,
    'published', 300.00, '2026-05-16', '2026-05-01',
    'health-test.demo.dev', 62, 'Health',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    'https://health-test.demo.dev/article-2',
    '2026-05-10 08:00:00+00', '2026-05-16 10:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000009'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000004'::uuid,
    'completed', 150.00, '2026-05-22', '2026-05-01',
    'travel-test.demo.dev', 40, 'Travel',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    'https://travel-test.demo.dev/article-2',
    '2026-05-16 11:00:00+00', '2026-05-22 13:00:00+00'
  ),
  (
    '00000000-0000-4000-8003-000000000010'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000001'::uuid,
    'published', 220.00, '2026-05-28', '2026-05-01',
    'techblog-test.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    'https://techblog-test.demo.dev/article-4',
    '2026-05-20 09:00:00+00', '2026-05-28 16:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Mark 3 March earnings as paid ────────────────────────────────────────

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

-- ─── 5. Client orders (varied statuses, 2 assigned to test.copywriter) ────────
-- Orders 3 & 4 have copywriter_id set so the copywriter sees active work.

INSERT INTO public.orders (
  id, user_id, site_id, status, price,
  publish_date, publish_month,
  anchor_text, target_url, client_notes,
  site_domain, site_dr, site_category,
  site_countries, site_languages, site_link_type,
  published_url,
  created_at, updated_at
) VALUES
  -- new
  (
    '00000000-0000-4000-8004-000000000001'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000001'::uuid,
    'new', 250.00, NULL, '2026-05-01',
    'best project management tools', 'https://acme.com/pm-tools', 'Please keep it natural, max 2 links.',
    'techblog-test.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow', NULL,
    '2026-05-20 10:00:00+00', '2026-05-20 10:00:00+00'
  ),
  -- in_progress
  (
    '00000000-0000-4000-8004-000000000002'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000002'::uuid,
    'in_progress', 180.00, NULL, '2026-05-01',
    'personal budgeting tips', 'https://acme.com/budgeting', 'Target audience: young professionals.',
    'finance-test.demo.dev', 48, 'Finance',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow', NULL,
    '2026-05-10 09:00:00+00', '2026-05-15 11:00:00+00'
  ),
  -- content_sent (copywriter assigned)
  (
    '00000000-0000-4000-8004-000000000003'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000003'::uuid,
    'content_sent', 300.00, NULL, '2026-05-01',
    'immune system support', 'https://acme.com/health', 'Cite at least 2 medical sources.',
    'health-test.demo.dev', 62, 'Health',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow', NULL,
    '2026-05-05 08:00:00+00', '2026-05-18 14:00:00+00'
  ),
  -- content_approved (copywriter assigned)
  (
    '00000000-0000-4000-8004-000000000004'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000004'::uuid,
    'content_approved', 150.00, '2026-05-30', '2026-05-01',
    'hidden gems europe', 'https://acme.com/travel', 'Include at least one Eastern Europe destination.',
    'travel-test.demo.dev', 40, 'Travel',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow', NULL,
    '2026-05-03 07:00:00+00', '2026-05-19 16:00:00+00'
  ),
  -- published
  (
    '00000000-0000-4000-8004-000000000005'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000001'::uuid,
    'published', 250.00, '2026-04-22', '2026-04-01',
    'AI productivity tools 2026', 'https://acme.com/ai-tools', 'Focus on B2B use cases.',
    'techblog-test.demo.dev', 55, 'Technology',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    'https://techblog-test.demo.dev/ai-productivity-2026',
    '2026-04-10 09:00:00+00', '2026-04-22 12:00:00+00'
  ),
  -- completed
  (
    '00000000-0000-4000-8004-000000000006'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '00000000-0000-4000-8002-000000000002'::uuid,
    'completed', 180.00, '2026-04-15', '2026-04-01',
    'index fund investing guide', 'https://acme.com/investing', 'Keep it beginner friendly.',
    'finance-test.demo.dev', 48, 'Finance',
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'dofollow',
    'https://finance-test.demo.dev/index-funds-2026',
    '2026-04-05 10:00:00+00', '2026-04-15 15:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 6. Assign copywriter to orders 3 & 4 ────────────────────────────────────

UPDATE public.orders
SET copywriter_id = (
  SELECT p.id FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = 'test.copywriter@local.marketwave' LIMIT 1
)
WHERE id IN (
  '00000000-0000-4000-8004-000000000003'::uuid,
  '00000000-0000-4000-8004-000000000004'::uuid
);

-- ─── 7. Client invoices (March=paid, April=sent, May=draft) ─────────────────
-- One invoice per billing_month. Insert as draft first, then transition status.
-- ON CONFLICT (id) DO NOTHING makes re-runs safe.
-- Status-guard WHERE clauses prevent the mutability trigger from blocking re-runs.

INSERT INTO public.invoices (
  id, client_id, billing_month, status, generated_at, due_date
) VALUES
  -- March 2026 — will be transitioned to paid below
  (
    '00000000-0000-4000-8005-000000000001'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '2026-03-01', 'draft', '2026-04-01 02:00:00+00', '2026-04-15'
  ),
  -- April 2026 — will be transitioned to sent below
  (
    '00000000-0000-4000-8005-000000000002'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '2026-04-01', 'draft', '2026-05-01 02:00:00+00', '2026-05-15'
  ),
  -- May 2026 — stays draft
  (
    '00000000-0000-4000-8005-000000000003'::uuid,
    (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.client@local.marketwave' LIMIT 1),
    '2026-05-01', 'draft', '2026-06-01 02:00:00+00', '2026-06-15'
  )
ON CONFLICT (id) DO NOTHING;

-- Invoice items — March 2026 (5 sourcer orders)
INSERT INTO public.invoice_items (invoice_id, order_id, site_domain, amount, description)
VALUES
  ('00000000-0000-4000-8005-000000000001'::uuid, '00000000-0000-4000-8003-000000000001'::uuid, 'techblog-test.demo.dev',  250.00, 'Guest post — techblog-test.demo.dev'),
  ('00000000-0000-4000-8005-000000000001'::uuid, '00000000-0000-4000-8003-000000000002'::uuid, 'finance-test.demo.dev',   180.00, 'Guest post — finance-test.demo.dev'),
  ('00000000-0000-4000-8005-000000000001'::uuid, '00000000-0000-4000-8003-000000000003'::uuid, 'techblog-test.demo.dev',  250.00, 'Guest post — techblog-test.demo.dev'),
  ('00000000-0000-4000-8005-000000000001'::uuid, '00000000-0000-4000-8003-000000000004'::uuid, 'health-test.demo.dev',    300.00, 'Guest post — health-test.demo.dev'),
  ('00000000-0000-4000-8005-000000000001'::uuid, '00000000-0000-4000-8003-000000000005'::uuid, 'travel-test.demo.dev',    150.00, 'Guest post — travel-test.demo.dev')
ON CONFLICT (order_id) DO NOTHING;

-- Invoice items — April 2026 (2 client direct orders)
INSERT INTO public.invoice_items (invoice_id, order_id, site_domain, amount, description)
VALUES
  ('00000000-0000-4000-8005-000000000002'::uuid, '00000000-0000-4000-8004-000000000005'::uuid, 'techblog-test.demo.dev',  250.00, 'Guest post — techblog-test.demo.dev'),
  ('00000000-0000-4000-8005-000000000002'::uuid, '00000000-0000-4000-8004-000000000006'::uuid, 'finance-test.demo.dev',   180.00, 'Guest post — finance-test.demo.dev')
ON CONFLICT (order_id) DO NOTHING;

-- Invoice items — May 2026 (5 sourcer orders)
INSERT INTO public.invoice_items (invoice_id, order_id, site_domain, amount, description)
VALUES
  ('00000000-0000-4000-8005-000000000003'::uuid, '00000000-0000-4000-8003-000000000006'::uuid, 'techblog-test.demo.dev',  250.00, 'Guest post — techblog-test.demo.dev'),
  ('00000000-0000-4000-8005-000000000003'::uuid, '00000000-0000-4000-8003-000000000007'::uuid, 'finance-test.demo.dev',   180.00, 'Guest post — finance-test.demo.dev'),
  ('00000000-0000-4000-8005-000000000003'::uuid, '00000000-0000-4000-8003-000000000008'::uuid, 'health-test.demo.dev',    300.00, 'Guest post — health-test.demo.dev'),
  ('00000000-0000-4000-8005-000000000003'::uuid, '00000000-0000-4000-8003-000000000009'::uuid, 'travel-test.demo.dev',    150.00, 'Guest post — travel-test.demo.dev'),
  ('00000000-0000-4000-8005-000000000003'::uuid, '00000000-0000-4000-8003-000000000010'::uuid, 'techblog-test.demo.dev',  220.00, 'Guest post — techblog-test.demo.dev')
ON CONFLICT (order_id) DO NOTHING;

-- Transition March: draft → sent
-- WHERE status = 'draft' is a no-op guard on re-run (mutability trigger would block otherwise)
UPDATE public.invoices
SET
  status   = 'sent',
  sent_at  = '2026-04-02 09:00:00+00',
  sent_by  = (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.manager@local.marketwave' LIMIT 1)
WHERE id = '00000000-0000-4000-8005-000000000001'::uuid
  AND status = 'draft';

-- Transition March: sent → paid
-- handle_invoice_paid trigger auto-sets paid_at and flips attached published orders to completed
UPDATE public.invoices
SET
  status   = 'paid',
  paid_at  = '2026-04-10 11:00:00+00',
  paid_by  = (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.manager@local.marketwave' LIMIT 1)
WHERE id = '00000000-0000-4000-8005-000000000001'::uuid
  AND status = 'sent';

-- Transition April: draft → sent
UPDATE public.invoices
SET
  status   = 'sent',
  sent_at  = '2026-05-02 10:00:00+00',
  sent_by  = (SELECT p.id FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'test.manager@local.marketwave' LIMIT 1)
WHERE id = '00000000-0000-4000-8005-000000000002'::uuid
  AND status = 'draft';

COMMIT;
