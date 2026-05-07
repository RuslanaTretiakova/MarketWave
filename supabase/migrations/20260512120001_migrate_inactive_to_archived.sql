-- Migrate any legacy inactive site statuses to archived after archived enum value exists.

UPDATE public.sites
SET status = 'archived'::public.site_status
WHERE status = 'inactive'::public.site_status;
