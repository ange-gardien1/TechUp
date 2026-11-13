ALTER TABLE "repair_quotes" ADD COLUMN IF NOT EXISTS "diagnosis" text;--> statement-breakpoint
ALTER TABLE "repair_quotes" ADD COLUMN IF NOT EXISTS "part_name" text;--> statement-breakpoint
ALTER TABLE "repair_quotes" ADD COLUMN IF NOT EXISTS "part_condition" text;--> statement-breakpoint
ALTER TABLE "repair_quotes" ADD COLUMN IF NOT EXISTS "part_cost" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_quotes" ADD COLUMN IF NOT EXISTS "labor_cost" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_quotes" ADD COLUMN IF NOT EXISTS "contact_phone" text;