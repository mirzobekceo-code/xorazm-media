CREATE TYPE "public"."ad_event_type" AS ENUM('impression', 'click');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'ended');--> statement-breakpoint
CREATE TYPE "public"."creative_type" AS ENUM('text', 'image', 'video');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('view', 'contact_click');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('f', 'm');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'hidden', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('new', 'reviewing', 'closed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('specialist', 'moderator', 'admin');--> statement-breakpoint
CREATE TABLE "ad_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"advertiser" varchar(120) DEFAULT 'Adverto' NOT NULL,
	"slots" text[] DEFAULT '{}' NOT NULL,
	"professions" text[] DEFAULT '{}' NOT NULL,
	"districts" text[] DEFAULT '{}' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"weight" integer DEFAULT 1 NOT NULL,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_creatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"type" "creative_type" DEFAULT 'text' NOT NULL,
	"title" varchar(60) NOT NULL,
	"body" varchar(120) DEFAULT '' NOT NULL,
	"cta" varchar(24) DEFAULT 'Batafsil' NOT NULL,
	"url" text NOT NULL,
	"image_desktop" text,
	"image_mobile" text,
	"video" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"creative_id" integer NOT NULL,
	"slot" varchar(8) NOT NULL,
	"type" "ad_event_type" NOT NULL,
	"page" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blogger_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"name" varchar(60) NOT NULL,
	"role" varchar(60) DEFAULT 'Reklama bo‘yicha admin' NOT NULL,
	"phone" varchar(20) NOT NULL,
	"telegram" varchar(64),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blogger_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"followers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"er" real,
	"avg_views" integer,
	"stories_reach" integer,
	"audience" jsonb,
	"rates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"topics" varchar(200) DEFAULT '' NOT NULL,
	"no_ads" varchar(200) DEFAULT '' NOT NULL,
	"screenshots" text[] DEFAULT '{}' NOT NULL,
	"stat_date" timestamp with time zone,
	"verified_by" integer,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(40) NOT NULL,
	"name_uz" varchar(60) NOT NULL,
	"name_ru" varchar(60),
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "districts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"type" "event_type" NOT NULL,
	"channel" varchar(20),
	"session_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"type" "media_type" NOT NULL,
	"url" text NOT NULL,
	"thumb_url" text,
	"is_cover" boolean DEFAULT false NOT NULL,
	"is_stat_screenshot" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"moderation_status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer,
	"media_id" integer,
	"moderator_id" integer,
	"action" varchar(30) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(40) NOT NULL,
	"name_uz" varchar(60) NOT NULL,
	"name_ru" varchar(60),
	"description" varchar(120) DEFAULT '' NOT NULL,
	"unit" varchar(20) NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"fields_schema" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "professions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profile_contacts" (
	"profile_id" integer PRIMARY KEY NOT NULL,
	"phone" varchar(20),
	"telegram" varchar(64),
	"instagram" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "profile_districts" (
	"profile_id" integer NOT NULL,
	"district_id" integer NOT NULL,
	CONSTRAINT "profile_districts_profile_id_district_id_pk" PRIMARY KEY("profile_id","district_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"slug" varchar(80) NOT NULL,
	"profession_id" integer NOT NULL,
	"extra_profession_id" integer,
	"full_name" varchar(80) NOT NULL,
	"birth_year" integer,
	"gender" "gender",
	"languages" text[] DEFAULT '{}' NOT NULL,
	"bio" varchar(500) DEFAULT '' NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"price" integer,
	"price_negotiable" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"status" "profile_status" DEFAULT 'draft' NOT NULL,
	"reject_reason" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rank_score" real DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"reason" varchar(60) NOT NULL,
	"text" varchar(1000) DEFAULT '' NOT NULL,
	"reporter_phone" varchar(20),
	"status" "report_status" DEFAULT 'new' NOT NULL,
	"resolved_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(60) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"telegram_id" varchar(32),
	"role" "role" DEFAULT 'specialist' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_creative_id_ad_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."ad_creatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogger_admins" ADD CONSTRAINT "blogger_admins_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogger_stats" ADD CONSTRAINT "blogger_stats_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogger_stats" ADD CONSTRAINT "blogger_stats_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_log" ADD CONSTRAINT "moderation_log_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_log" ADD CONSTRAINT "moderation_log_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_contacts" ADD CONSTRAINT "profile_contacts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_districts" ADD CONSTRAINT "profile_districts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_districts" ADD CONSTRAINT "profile_districts_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_profession_id_professions_id_fk" FOREIGN KEY ("profession_id") REFERENCES "public"."professions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_extra_profession_id_professions_id_fk" FOREIGN KEY ("extra_profession_id") REFERENCES "public"."professions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_events_idx" ON "ad_events" USING btree ("creative_id","created_at");--> statement-breakpoint
CREATE INDEX "bs_profile_idx" ON "blogger_stats" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "events_profile_idx" ON "events" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "otp_phone_idx" ON "otp_codes" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "pd_district_idx" ON "profile_districts" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "profiles_catalog_idx" ON "profiles" USING btree ("profession_id","status","rank_score");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_key_idx" ON "settings" USING btree ("key");