CREATE TYPE "public"."lead_kind" AS ENUM('contact', 'order');--> statement-breakpoint
ALTER TYPE "public"."request_status" ADD VALUE 'adverto';--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "lead_kind" NOT NULL,
	"user_id" integer,
	"profile_id" integer NOT NULL,
	"name" varchar(80),
	"phone" varchar(20),
	"telegram_username" varchar(64),
	"message" text,
	"source" varchar(60),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "profession_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "profession_ids" integer[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "remote" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "budget_label" varchar(40);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_username" varchar(64);--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_profile_idx" ON "leads" USING btree ("profile_id");