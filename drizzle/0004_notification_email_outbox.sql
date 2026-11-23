CREATE TABLE "notification_email_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"last_error" text,
	"provider_message_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_email_deliveries_notification_id_unique" UNIQUE("notification_id")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "notification_email_deliveries" ADD CONSTRAINT "notification_email_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_email_deliveries_queue_idx" ON "notification_email_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key");