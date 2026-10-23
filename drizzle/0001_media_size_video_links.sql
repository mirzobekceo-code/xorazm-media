ALTER TABLE "media" ADD COLUMN "size_bytes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "video_links" text[] DEFAULT '{}' NOT NULL;