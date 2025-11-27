-- Vector DB Schema Migration
-- Adds vector_index_metadata and chat_history tables

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vector_index_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"index_name" varchar(255) NOT NULL,
	"source_type" varchar(100) NOT NULL,
	"source_id" varchar(255),
	"last_indexed_at" timestamp,
	"indexed_count" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'active',
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vector_index_metadata" ADD CONSTRAINT "vector_index_metadata_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vector_index_metadata_org_idx" ON "vector_index_metadata" ("organization_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vector_index_metadata_source_idx" ON "vector_index_metadata" ("organization_id","source_type","source_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vector_index_metadata_status_idx" ON "vector_index_metadata" ("organization_id","status");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_history_org_user_idx" ON "chat_history" ("organization_id","user_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_history_session_idx" ON "chat_history" ("organization_id","session_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_history_created_at_idx" ON "chat_history" ("created_at");

