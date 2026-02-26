-- Migration: Add inventory_item_id to expenses table
-- This allows linking expenses to specific inventory items for better categorization.

ALTER TABLE public.expenses ADD COLUMN inventory_item_id INTEGER;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_inventory_item_id_fkey'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_inventory_item_id_fkey
      FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_expenses_inventory_item_id ON public.expenses(inventory_item_id);
