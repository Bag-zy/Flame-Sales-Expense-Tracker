BEGIN;

-- Drop the existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'organizations_created_by_fk'
  ) THEN
    ALTER TABLE public.organizations DROP CONSTRAINT organizations_created_by_fk;
  END IF;
END$$;

-- Add the new constraint with ON DELETE SET NULL
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_created_by_fk
  FOREIGN KEY (created_by)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

COMMIT;
