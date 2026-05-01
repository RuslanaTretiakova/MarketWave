-- profiles
CREATE INDEX idx_profiles_role ON public.profiles (role);

-- sites catalog (primary browse filters)
CREATE INDEX idx_sites_status ON public.sites (status);
CREATE INDEX idx_sites_category_id ON public.sites (category_id);
CREATE INDEX idx_sites_price ON public.sites (price);
CREATE INDEX idx_sites_dr ON public.sites (dr);
CREATE INDEX idx_sites_domain_fts ON public.sites USING gin (to_tsvector('english', domain));

-- site relations (geo/language filter)
CREATE INDEX idx_site_countries_country ON public.site_countries (country);
CREATE INDEX idx_site_languages_language ON public.site_languages (language);

-- cart items
CREATE INDEX idx_cart_items_cart_id ON public.cart_items (cart_id);
CREATE INDEX idx_cart_items_site_id ON public.cart_items (site_id);

-- orders (most queried per user)
CREATE INDEX idx_orders_user_id ON public.orders (user_id);
CREATE INDEX idx_orders_status ON public.orders (status);
CREATE INDEX idx_orders_user_status ON public.orders (user_id, status);
CREATE INDEX idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX idx_orders_site_id ON public.orders (site_id);

-- invoices
CREATE INDEX idx_invoices_status ON public.invoices (status);

-- change requests
CREATE INDEX idx_change_requests_order_id ON public.change_requests (order_id);
CREATE INDEX idx_change_requests_user_id ON public.change_requests (user_id);

-- error logs
CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_level ON public.error_logs (level);
CREATE INDEX idx_error_logs_context ON public.error_logs (context);
