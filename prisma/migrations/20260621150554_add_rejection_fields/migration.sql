-- Add rejection fields to tasks table
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "rejection_note" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "rejected_by" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3);
