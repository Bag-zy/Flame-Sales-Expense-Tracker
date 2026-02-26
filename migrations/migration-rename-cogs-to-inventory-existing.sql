-- Migration: Rename existing project categories from 'COGS (Cost of Goods Sold)' to 'Inventory'
-- This updates existing projects' categories.

BEGIN;

-- Update existing project categories
UPDATE public.project_categories
SET category_name = 'Inventory'
WHERE category_name = 'COGS (Cost of Goods Sold)';

COMMIT;
