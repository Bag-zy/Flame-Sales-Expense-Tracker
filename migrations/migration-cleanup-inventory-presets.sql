-- Migration: Cleanup Inventory expense category presets
-- This deactivates unwanted presets and ensures only the correct inventory categories are active.

BEGIN;

-- 1. Get the ID for the 'Inventory' project category preset
DO $$
DECLARE
    inventory_preset_id INTEGER;
BEGIN
    SELECT id INTO inventory_preset_id FROM public.project_category_presets WHERE name = 'Inventory';

    IF inventory_preset_id IS NOT NULL THEN
        -- 2. Deactivate ALL expense category presets under 'Inventory' first
        UPDATE public.expense_category_presets
        SET is_active = false
        WHERE project_category_preset_id = inventory_preset_id;

        -- 3. Reactivate ONLY the correct inventory categories
        UPDATE public.expense_category_presets
        SET is_active = true,
            sort_order = CASE 
                WHEN name = 'Raw Materials' THEN 1
                WHEN name = 'Work In Progress' THEN 2
                WHEN name = 'Product/Finished Goods' THEN 3
                ELSE 99
            END
        WHERE project_category_preset_id = inventory_preset_id
          AND name IN ('Raw Materials', 'Work In Progress', 'Product/Finished Goods');

        -- 4. Ensure they exist if they were missing
        INSERT INTO public.expense_category_presets (project_category_preset_id, name, description, sort_order, is_active)
        VALUES 
            (inventory_preset_id, 'Raw Materials', 'Raw materials inventory', 1, true),
            (inventory_preset_id, 'Work In Progress', 'Work in progress inventory', 2, true),
            (inventory_preset_id, 'Product/Finished Goods', 'Finished goods inventory and purchases', 3, true)
        ON CONFLICT (project_category_preset_id, name) DO UPDATE 
        SET is_active = true, sort_order = EXCLUDED.sort_order;
    END IF;
END $$;

COMMIT;
