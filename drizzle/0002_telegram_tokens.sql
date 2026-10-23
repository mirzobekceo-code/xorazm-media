CREATE TYPE "public"."tg_token_purpose" AS ENUM('login', 'link');--> statement-breakpoint
CREATE TYPE "public"."tg_token_status" AS ENUM('pending', 'confirmed', 'used');--> statement-breakpoint
CREATE TABLE "telegram_tokens" (
	"token" varchar(64) PRIMARY KEY NOT NULL,
	"secret_hash" varchar(64) NOT NULL,
	"purpose" "tg_token_purpose" NOT NULL,
	"user_id" integer,
	"status" "tg_token_status" DEFAULT 'pending' NOT NULL,
	"chat_id" varchar(32),
	"telegram_id" varchar(32),
	"phone" varchar(20),
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_tokens" ADD CONSTRAINT "telegram_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tg_tokens_chat_idx" ON "telegram_tokens" USING btree ("chat_id","created_at");