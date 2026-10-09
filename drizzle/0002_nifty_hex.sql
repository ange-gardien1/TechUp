ALTER TABLE "repair_quotes" ADD COLUMN "diagnosis" text;--> statement-breakpoint
ALTER TABLE "repair_quotes" ADD COLUMN "part_name" text;--> statement-breakpoint
ALTER TABLE "repair_quotes" ADD COLUMN "part_condition" text;--> statement-breakpoint
ALTER TABLE "repair_quotes" ADD COLUMN "part_cost" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_quotes" ADD COLUMN "labor_cost" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_quotes" ADD COLUMN "contact_phone" text;