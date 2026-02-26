BEGIN;

-- If a legacy Inventory-linked category would collide with an existing NULL-linked category
-- (same org/project/name), merge them by moving expenses to the NULL-linked category and
-- deleting the duplicate.
-- 0) First, deduplicate legacy Inventory-linked categories among themselves (same org/project/name).
-- This prevents a single UPDATE from detaching multiple rows into the same NULL-linked unique key.
WITH inventory_project_categories AS (
  SELECT id
  FROM public.project_categories
  WHERE category_name = 'Inventory'
),
inventory_linked AS (
  SELECT ec.id, ec.organization_id, ec.project_id, ec.category_name
  FROM public.expense_category ec
  WHERE ec.project_category_id IN (SELECT id FROM inventory_project_categories)
    AND ec.category_name NOT IN ('Raw Materials', 'Work In Progress', 'Product/Finished Goods')
),
inv_dupes AS (
  SELECT
    organization_id,
    project_id,
    category_name,
    MIN(id) AS keep_id
  FROM inventory_linked
  GROUP BY organization_id, project_id, category_name
  HAVING COUNT(*) > 1
),
inv_dupe_rows AS (
  SELECT il.id AS delete_id, d.keep_id
  FROM inventory_linked il
  JOIN inv_dupes d
    ON d.organization_id IS NOT DISTINCT FROM il.organization_id
   AND d.project_id IS NOT DISTINCT FROM il.project_id
   AND d.category_name = il.category_name
  WHERE il.id <> d.keep_id
)
UPDATE public.expenses e
SET category_id = r.keep_id
FROM inv_dupe_rows r
WHERE e.category_id = r.delete_id;

WITH inventory_project_categories AS (
  SELECT id
  FROM public.project_categories
  WHERE category_name = 'Inventory'
),
inventory_linked AS (
  SELECT ec.id, ec.organization_id, ec.project_id, ec.category_name
  FROM public.expense_category ec
  WHERE ec.project_category_id IN (SELECT id FROM inventory_project_categories)
    AND ec.category_name NOT IN ('Raw Materials', 'Work In Progress', 'Product/Finished Goods')
),
inv_dupes AS (
  SELECT
    organization_id,
    project_id,
    category_name,
    MIN(id) AS keep_id
  FROM inventory_linked
  GROUP BY organization_id, project_id, category_name
  HAVING COUNT(*) > 1
),
inv_dupe_rows AS (
  SELECT il.id AS delete_id, d.keep_id
  FROM inventory_linked il
  JOIN inv_dupes d
    ON d.organization_id IS NOT DISTINCT FROM il.organization_id
   AND d.project_id IS NOT DISTINCT FROM il.project_id
   AND d.category_name = il.category_name
  WHERE il.id <> d.keep_id
)
DELETE FROM public.expense_category ec
USING inv_dupe_rows r
WHERE ec.id = r.delete_id;

-- 1) Next, merge remaining Inventory-linked legacy categories into existing NULL-linked categories (same org/project/name).
WITH inventory_project_categories AS (
  SELECT id
  FROM public.project_categories
  WHERE category_name = 'Inventory'
),
inventory_linked AS (
  SELECT ec.id, ec.organization_id, ec.project_id, ec.category_name
  FROM public.expense_category ec
  WHERE ec.project_category_id IN (SELECT id FROM inventory_project_categories)
    AND ec.category_name NOT IN ('Raw Materials', 'Work In Progress', 'Product/Finished Goods')
),
collisions AS (
  SELECT
    il.id AS source_category_id,
    target.id AS target_category_id
  FROM inventory_linked il
  JOIN public.expense_category target
    ON target.organization_id IS NOT DISTINCT FROM il.organization_id
   AND target.project_id IS NOT DISTINCT FROM il.project_id
   AND target.project_category_id IS NULL
   AND target.category_name = il.category_name
)
UPDATE public.expenses e
SET category_id = c.target_category_id
FROM collisions c
WHERE e.category_id = c.source_category_id;

WITH inventory_project_categories AS (
  SELECT id
  FROM public.project_categories
  WHERE category_name = 'Inventory'
),
inventory_linked AS (
  SELECT ec.id, ec.organization_id, ec.project_id, ec.category_name
  FROM public.expense_category ec
  WHERE ec.project_category_id IN (SELECT id FROM inventory_project_categories)
    AND ec.category_name NOT IN ('Raw Materials', 'Work In Progress', 'Product/Finished Goods')
),
collisions AS (
  SELECT
    il.id AS source_category_id,
    target.id AS target_category_id
  FROM inventory_linked il
  JOIN public.expense_category target
    ON target.organization_id IS NOT DISTINCT FROM il.organization_id
   AND target.project_id IS NOT DISTINCT FROM il.project_id
   AND target.project_category_id IS NULL
   AND target.category_name = il.category_name
)
DELETE FROM public.expense_category ec
USING collisions c
WHERE ec.id = c.source_category_id;

-- 2) Finally, detach remaining legacy Inventory-linked categories that do not have NULL-linked duplicates.
UPDATE public.expense_category ec
SET project_category_id = NULL
WHERE ec.project_category_id IN (
  SELECT id
  FROM public.project_categories
  WHERE category_name = 'Inventory'
)
AND ec.category_name NOT IN ('Raw Materials', 'Work In Progress', 'Product/Finished Goods')
AND NOT EXISTS (
  SELECT 1
  FROM public.expense_category target
  WHERE target.organization_id IS NOT DISTINCT FROM ec.organization_id
    AND target.project_id IS NOT DISTINCT FROM ec.project_id
    AND target.project_category_id IS NULL
    AND target.category_name = ec.category_name
    AND target.id <> ec.id
);

COMMIT;
