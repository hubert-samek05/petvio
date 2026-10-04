ALTER TABLE barf_plans ADD COLUMN IF NOT EXISTS supplements JSONB DEFAULT '[]'::jsonb;
