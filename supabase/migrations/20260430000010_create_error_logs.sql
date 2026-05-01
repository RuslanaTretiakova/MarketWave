-- Append-only server-side error log
CREATE TABLE public.error_logs (
  id          BIGSERIAL PRIMARY KEY,
  level       TEXT NOT NULL DEFAULT 'error' CHECK (level IN ('info', 'warn', 'error', 'critical')),
  context     TEXT,
  message     TEXT NOT NULL,
  payload     JSONB,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
