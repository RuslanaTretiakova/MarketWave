-- Spec alignment: Category.created_by (User)

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.categories.created_by IS
  'Profile that created this category; set by trigger on insert when NULL. Legacy/seed rows may be NULL.';

-- Backfill: first admin by signup order
UPDATE public.categories c
SET created_by = a.id
FROM (
  SELECT id
  FROM public.profiles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1
) a
WHERE c.created_by IS NULL;

CREATE OR REPLACE FUNCTION public.categories_set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categories_set_created_by ON public.categories;

CREATE TRIGGER categories_set_created_by
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.categories_set_created_by();
