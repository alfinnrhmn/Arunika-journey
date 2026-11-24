CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin_ops');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('invited', 'active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."inclusion_kind" AS ENUM('include', 'exclude');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('draft', 'open', 'full', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."trip_type" AS ENUM('open', 'private');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'admin_ops' NOT NULL,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text,
	"caption" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"variants" jsonb,
	"uploaded_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "media_size_positive" CHECK ("media"."size" > 0)
);
--> statement-breakpoint
CREATE TABLE "cancellation_policies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tiers" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cancellation_policies_version_positive" CHECK ("cancellation_policies"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"region" text,
	"summary" text,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hero_media_id" uuid,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destinations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "schedule_waitlist" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trip_id" uuid NOT NULL,
	"email" text NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_faqs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trip_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_inclusions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trip_id" uuid NOT NULL,
	"kind" "inclusion_kind" NOT NULL,
	"position" smallint NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_itinerary_days" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trip_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"items" jsonb,
	CONSTRAINT "trip_itinerary_days_pos_unique" UNIQUE("trip_id","position")
);
--> statement-breakpoint
CREATE TABLE "trip_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trip_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"is_hero" boolean DEFAULT false NOT NULL,
	CONSTRAINT "trip_media_unique" UNIQUE("trip_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "trip_schedules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trip_id" uuid NOT NULL,
	"departure_date" date NOT NULL,
	"return_date" date NOT NULL,
	"capacity" integer NOT NULL,
	"min_participants" integer DEFAULT 1 NOT NULL,
	"booking_cutoff_days" integer DEFAULT 0 NOT NULL,
	"seats_taken" integer DEFAULT 0 NOT NULL,
	"price_override" bigint,
	"status" "schedule_status" DEFAULT 'draft' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_schedules_trip_date_unique" UNIQUE("trip_id","departure_date"),
	CONSTRAINT "trip_schedules_seats_range" CHECK ("trip_schedules"."seats_taken" between 0 and "trip_schedules"."capacity"),
	CONSTRAINT "trip_schedules_capacity_positive" CHECK ("trip_schedules"."capacity" > 0),
	CONSTRAINT "trip_schedules_dates" CHECK ("trip_schedules"."return_date" >= "trip_schedules"."departure_date"),
	CONSTRAINT "trip_schedules_min_participants" CHECK ("trip_schedules"."min_participants" between 1 and "trip_schedules"."capacity"),
	CONSTRAINT "trip_schedules_cutoff_nonnegative" CHECK ("trip_schedules"."booking_cutoff_days" >= 0),
	CONSTRAINT "trip_schedules_price_nonnegative" CHECK ("trip_schedules"."price_override" >= 0)
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"type" "trip_type" NOT NULL,
	"title" text NOT NULL,
	"tagline" text,
	"destination_id" uuid,
	"duration_days" integer NOT NULL,
	"nights" integer NOT NULL,
	"base_price" bigint,
	"child_price" bigint,
	"meeting_point" text,
	"summary" text,
	"description" text,
	"default_capacity" integer,
	"cancellation_policy_id" uuid,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"seo" jsonb,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_slug_unique" UNIQUE("slug"),
	CONSTRAINT "trips_duration_positive" CHECK ("trips"."duration_days" > 0 and "trips"."nights" >= 0),
	CONSTRAINT "trips_price_nonnegative" CHECK ("trips"."base_price" >= 0 and "trips"."child_price" >= 0),
	CONSTRAINT "trips_open_requires_price" CHECK ("trips"."type" = 'private' or "trips"."base_price" is not null)
);
--> statement-breakpoint
CREATE TABLE "code_counters" (
	"kind" text NOT NULL,
	"period" text NOT NULL,
	"last" integer NOT NULL,
	CONSTRAINT "code_counters_kind_period_pk" PRIMARY KEY("kind","period")
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_waitlist" ADD CONSTRAINT "schedule_waitlist_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_faqs" ADD CONSTRAINT "trip_faqs_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_inclusions" ADD CONSTRAINT "trip_inclusions_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_itinerary_days" ADD CONSTRAINT "trip_itinerary_days_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_media" ADD CONSTRAINT "trip_media_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_media" ADD CONSTRAINT "trip_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_schedules" ADD CONSTRAINT "trip_schedules_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_cancellation_policy_id_cancellation_policies_id_fk" FOREIGN KEY ("cancellation_policy_id") REFERENCES "public"."cancellation_policies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_waitlist_trip_email_unique" ON "schedule_waitlist" USING btree ("trip_id",lower("email"));--> statement-breakpoint
CREATE INDEX "trip_faqs_trip_idx" ON "trip_faqs" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_inclusions_trip_idx" ON "trip_inclusions" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_schedules_status_idx" ON "trip_schedules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trips_status_type_idx" ON "trips" USING btree ("status","type");--> statement-breakpoint
CREATE INDEX "trips_destination_idx" ON "trips" USING btree ("destination_id");