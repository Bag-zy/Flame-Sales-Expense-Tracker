-- Migration: Replace 'COGS' project category with 'Inventory'
-- This updates the global presets used for new projects.

BEGIN;

-- 1. Update the project category preset name from 'COGS (Cost of Goods Sold)' to 'Inventory'
UPDATE public.project_category_presets
SET name = 'Inventory',
    sort_order = 1
WHERE name = 'COGS (Cost of Goods Sold)';

-- 2. Ensure 'Inventory' preset exists if it didn't before (fallback)
INSERT INTO public.project_category_presets (name, sort_order, is_active)
VALUES ('Inventory', 1, true)
ON CONFLICT (name) DO UPDATE SET is_active = true, sort_order = 1;

-- 3. Update existing expense category presets under the 'Inventory' preset
-- We keep the 3-stage inventory categories as they are the "actual inventory items" logic
-- but ensure they are correctly linked to the new 'Inventory' name.
WITH inventory_preset AS (
    SELECT id FROM public.project_category_presets WHERE name = 'Inventory'
)
UPDATE public.expense_category_presets
SET is_active = true
WHERE project_category_preset_id = (SELECT id FROM inventory_preset)
  AND name IN ('Raw Materials', 'Work In Progress', 'Product/Finished Goods');

-- 4. Deactivate the old COGS name if it somehow still exists as a duplicate
UPDATE public.project_category_presets
SET is_active = false
WHERE name = 'COGS (Cost of Goods Sold)' AND id NOT IN (SELECT id FROM public.project_category_presets WHERE name = 'Inventory');

COMMIT;
