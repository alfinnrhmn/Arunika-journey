CREATE TABLE "booking_drafts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"schedule_id" uuid NOT NULL,
	"adults" integer DEFAULT 2 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"contact" jsonb,
	"participants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_drafts_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "booking_drafts_party" CHECK ("booking_drafts"."adults" >= 1 and "booking_drafts"."children" >= 0)
);
--> statement-breakpoint
ALTER TABLE "booking_drafts" ADD CONSTRAINT "booking_drafts_schedule_id_trip_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."trip_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_drafts_expires_idx" ON "booking_drafts" USING btree ("expires_at");