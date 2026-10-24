CREATE TABLE "profile_slugs" (
	"slug" varchar(80) PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "source" varchar(16);--> statement-breakpoint
ALTER TABLE "profile_slugs" ADD CONSTRAINT "profile_slugs_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;