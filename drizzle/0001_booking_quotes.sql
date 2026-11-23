CREATE TYPE "public"."proposal_status" AS ENUM('draft', 'sent', 'approved', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending_review', 'in_progress', 'proposal_sent', 'approved', 'revision_requested', 'declined', 'converted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."balance_status" AS ENUM('due', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."booking_source" AS ENUM('web', 'manual');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('draft', 'pending_payment', 'confirmed', 'completed', 'expired', 'cancelled', 'refunded', 'needs_attention');--> statement-breakpoint
CREATE TYPE "public"."participant_kind" AS ENUM('adult', 'child', 'infant');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('dp', 'balance');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'needs_verification', 'paid', 'failed', 'expired', 'rejected', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending_approval', 'approved', 'processed', 'rejected');--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"itinerary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_total" bigint NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"status" "proposal_status" DEFAULT 'draft' NOT NULL,
	"access_token_hash" text,
	"sent_at" timestamp with time zone,
	"revision_note" text,
	"approved_at" timestamp with time zone,
	"approved_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposals_access_token_hash_unique" UNIQUE("access_token_hash"),
	CONSTRAINT "proposals_request_version_unique" UNIQUE("quote_request_id","version"),
	CONSTRAINT "proposals_price_nonnegative" CHECK ("proposals"."price_total" >= 0),
	CONSTRAINT "proposals_version_positive" CHECK ("proposals"."version" > 0),
	CONSTRAINT "proposals_approval_recorded" CHECK ("proposals"."status" <> 'approved' or ("proposals"."approved_at" is not null and "proposals"."approved_ip" is not null))
);
--> statement-breakpoint
CREATE TABLE "quote_drafts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"payload" jsonb NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_drafts_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"status" "request_status" DEFAULT 'pending_review' NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"destination" text,
	"start_date" date,
	"end_date" date,
	"flexible_dates" boolean DEFAULT false NOT NULL,
	"participants" integer NOT NULL,
	"duration_days" integer,
	"accommodation" text,
	"activities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"budget" text,
	"notes" text,
	"assigned_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_requests_code_unique" UNIQUE("code"),
	CONSTRAINT "quote_requests_participants_positive" CHECK ("quote_requests"."participants" > 0),
	CONSTRAINT "quote_requests_dates" CHECK ("quote_requests"."end_date" is null or "quote_requests"."start_date" is null or "quote_requests"."end_date" >= "quote_requests"."start_date")
);
--> statement-breakpoint
CREATE TABLE "booking_participants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"booking_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"full_name" text NOT NULL,
	"kind" "participant_kind" DEFAULT 'adult' NOT NULL,
	"special_needs" text
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"schedule_id" uuid,
	"type" "trip_type" NOT NULL,
	"status" "booking_status" DEFAULT 'draft' NOT NULL,
	"balance_status" "balance_status",
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"adults" integer NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"seat_count" integer NOT NULL,
	"price_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_amount" bigint NOT NULL,
	"dp_percent" integer NOT NULL,
	"dp_amount" bigint NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"legal_acceptance" jsonb,
	"cancellation_policy_id" uuid,
	"source" "booking_source" DEFAULT 'web' NOT NULL,
	"proposal_id" uuid,
	"access_token_hash" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_code_unique" UNIQUE("code"),
	CONSTRAINT "bookings_access_token_hash_unique" UNIQUE("access_token_hash"),
	CONSTRAINT "bookings_open_requires_schedule" CHECK ("bookings"."type" = 'private' or "bookings"."schedule_id" is not null),
	CONSTRAINT "bookings_adults_positive" CHECK ("bookings"."adults" >= 1 and "bookings"."children" >= 0),
	CONSTRAINT "bookings_seat_count" CHECK ("bookings"."seat_count" = "bookings"."adults" + "bookings"."children"),
	CONSTRAINT "bookings_amounts" CHECK ("bookings"."total_amount" >= 0 and "bookings"."dp_amount" between 0 and "bookings"."total_amount"),
	CONSTRAINT "bookings_dp_percent" CHECK ("bookings"."dp_percent" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"booking_id" uuid NOT NULL,
	"kind" "payment_kind" DEFAULT 'dp' NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"method" text,
	"amount" bigint NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"proof_media_id" uuid,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"idempotency_key" text,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_provider_ref_unique" UNIQUE("provider_ref"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payment_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"reason" text NOT NULL,
	"status" "refund_status" DEFAULT 'pending_approval' NOT NULL,
	"approved_by" uuid,
	"processed_by" uuid,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_amount_positive" CHECK ("refunds"."amount" > 0),
	CONSTRAINT "refunds_approval_recorded" CHECK ("refunds"."status" in ('pending_approval', 'rejected') or "refunds"."approved_by" is not null)
);
--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_schedule_id_trip_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."trip_schedules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancellation_policy_id_cancellation_policies_id_fk" FOREIGN KEY ("cancellation_policy_id") REFERENCES "public"."cancellation_policies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_proof_media_id_media_id_fk" FOREIGN KEY ("proof_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_requests_status_idx" ON "quote_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quote_requests_email_idx" ON "quote_requests" USING btree (lower("contact_email"));--> statement-breakpoint
CREATE INDEX "booking_participants_booking_idx" ON "booking_participants" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "bookings_status_hold_idx" ON "bookings" USING btree ("status","hold_expires_at");--> statement-breakpoint
CREATE INDEX "bookings_schedule_idx" ON "bookings" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "bookings_contact_email_idx" ON "bookings" USING btree (lower("contact_email"));--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_one_paid_dp_per_booking" ON "payments" USING btree ("booking_id") WHERE "payments"."kind" = 'dp' and "payments"."status" = 'paid';--> statement-breakpoint
CREATE INDEX "refunds_payment_idx" ON "refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("status");