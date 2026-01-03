BEGIN;

ALTER TABLE IF EXISTS public.expenses
  ADD COLUMN IF NOT EXISTS expense_name character varying(255);

COMMIT;
