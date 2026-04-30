-- ─── Helper: updated_at ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.change_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Helper: get caller role (SECURITY DEFINER avoids RLS recursion) ───────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ─── Trigger 1: auto-create profile on auth.users INSERT ───────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Trigger 2: auto-create cart when profile is created ───────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.carts (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ─── Trigger 3: auto-create invoice when order is created ──────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.invoices (order_id, amount, due_date)
  VALUES (
    NEW.id,
    NEW.price,
    (CURRENT_DATE + INTERVAL '30 days')::DATE
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_order();

-- ─── Trigger 4: mark order completed when invoice is paid ──────────────────────
CREATE OR REPLACE FUNCTION public.handle_invoice_paid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    UPDATE public.orders
    SET status = 'completed', updated_at = now()
    WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_invoice_status_changed
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_invoice_paid();

-- ─── Trigger 5: enforce valid order status transitions ─────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  valid_next TEXT[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  valid_next := CASE OLD.status
    WHEN 'new'              THEN ARRAY['in_progress', 'canceled']
    WHEN 'in_progress'      THEN ARRAY['content_sent']
    WHEN 'content_sent'     THEN ARRAY['content_approved', 'needs_changes']
    WHEN 'needs_changes'    THEN ARRAY['in_progress']
    WHEN 'content_approved' THEN ARRAY['published']
    WHEN 'published'        THEN ARRAY[]::TEXT[]
    WHEN 'completed'        THEN ARRAY[]::TEXT[]
    WHEN 'canceled'         THEN ARRAY[]::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (NEW.status::TEXT = ANY(valid_next)) THEN
    RAISE EXCEPTION 'Invalid order status transition: % → %', OLD.status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_order_status_transitions
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_status_transition();

-- ─── Trigger 6: block adding inactive site to cart ─────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_active_site_in_cart()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT status FROM public.sites WHERE id = NEW.site_id) <> 'active' THEN
    RAISE EXCEPTION 'Cannot add site to cart: site is not active'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_site_active_before_cart_insert
  BEFORE INSERT ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_site_in_cart();
