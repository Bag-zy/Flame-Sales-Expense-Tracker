-- Remove duplicate cycles, keeping the one with the lowest ID
DELETE FROM cycles c1
USING cycles c2
WHERE c1.id > c2.id
  AND c1.project_id = c2.project_id
  AND c1.cycle_number = c2.cycle_number;

-- Add unique constraint to prevent future duplicates
ALTER TABLE cycles 
ADD CONSTRAINT cycles_project_id_cycle_number_key UNIQUE (project_id, cycle_number);
