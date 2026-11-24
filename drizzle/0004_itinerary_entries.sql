ALTER TABLE "trip_itinerary_days" ADD COLUMN "day_number" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_itinerary_days" ADD COLUMN "time_label" text;--> statement-breakpoint
ALTER TABLE "trip_itinerary_days" ADD COLUMN "place" text;--> statement-breakpoint
ALTER TABLE "trip_itinerary_days" ADD COLUMN "media_id" uuid;--> statement-breakpoint
ALTER TABLE "trip_itinerary_days" ADD COLUMN "lodging" jsonb;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "difficulty" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "badge" text;--> statement-breakpoint
ALTER TABLE "trip_itinerary_days" ADD CONSTRAINT "trip_itinerary_days_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;