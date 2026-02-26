-- Add inventory_item_variant_id to expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS inventory_item_variant_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_inventory_item_variant_id_fkey'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_inventory_item_variant_id_fkey
      FOREIGN KEY (inventory_item_variant_id) REFERENCES public.inventory_item_variants(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_inventory_item_variant_id ON public.expenses(inventory_item_variant_id);
