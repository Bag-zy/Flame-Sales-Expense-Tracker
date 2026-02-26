
-- Migration: Add unique constraint to inventory items to prevent duplicates
-- First, remove any existing duplicates (keep the oldest one)
DELETE FROM inventory_items
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY organization_id, name, inventory_item_type_id, COALESCE(project_id, 0)
                   ORDER BY id ASC
               ) as row_num
        FROM inventory_items
    ) t
    WHERE t.row_num > 1
);

-- Add unique index handling NULL project_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_unique_name
ON public.inventory_items (organization_id, name, inventory_item_type_id, COALESCE(project_id, 0));
