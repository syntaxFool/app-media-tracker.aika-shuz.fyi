-- Add series fields to tasks table for parent-child multi-part video grouping
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "series_id" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "part_number" INTEGER;

-- Indexes for fast grouping and ordered lookups
CREATE INDEX IF NOT EXISTS "tasks_series_id_idx" ON "tasks"("series_id");
CREATE INDEX IF NOT EXISTS "tasks_series_id_part_number_idx" ON "tasks"("series_id", "part_number");
