CREATE TABLE "backlink_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"target_count" integer DEFAULT 100,
	"min_dr_threshold" integer DEFAULT 50,
	"max_spam_score" integer DEFAULT 5,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backlink_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"domain_rating" integer,
	"spam_score" integer,
	"traffic_value" numeric(10, 2),
	"contact_email" varchar(255),
	"contact_form" text,
	"outreach_status" varchar(50) DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"template" text NOT NULL,
	"variables" jsonb,
	"e_eat_score" numeric(3, 2),
	"quality_threshold" numeric(3, 2) DEFAULT '0.8',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"template_id" uuid,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"url" text,
	"keywords" jsonb,
	"e_eat_score" numeric(3, 2),
	"quality_score" numeric(3, 2),
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_seo_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"website" varchar(255),
	"google_business_id" varchar(100),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"business_hours" jsonb,
	"categories" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_seo_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"review_id" varchar(100) NOT NULL,
	"author" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"content" text,
	"platform" varchar(50) NOT NULL,
	"review_url" text,
	"is_positive" boolean,
	"sentiment" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"data" jsonb,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"url" text NOT NULL,
	"performance" numeric(5, 2),
	"accessibility" numeric(5, 2),
	"best_practices" numeric(5, 2),
	"seo" numeric(5, 2),
	"first_contentful_paint" numeric(10, 2),
	"largest_contentful_paint" numeric(10, 2),
	"cumulative_layout_shift" numeric(10, 4),
	"first_input_delay" numeric(10, 2),
	"total_blocking_time" numeric(10, 2),
	"speed_index" numeric(10, 2),
	"time_to_interactive" numeric(10, 2),
	"raw_data" jsonb,
	"measured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"domain" varchar(255) NOT NULL,
	"target_region" varchar(100) DEFAULT 'Türkiye',
	"primary_keywords" jsonb NOT NULL,
	"target_domain_authority" integer DEFAULT 50,
	"target_ctr_increase" integer DEFAULT 25,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"report_type" varchar(50) NOT NULL,
	"period" varchar(50) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"data" jsonb NOT NULL,
	"insights" text,
	"recommendations" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"generated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "seo_sprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"phase" varchar(50) NOT NULL,
	"sprint_number" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"goals" jsonb,
	"tasks" jsonb,
	"status" varchar(50) DEFAULT 'planning' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "backlink_campaigns" ADD CONSTRAINT "backlink_campaigns_project_id_seo_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."seo_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backlink_targets" ADD CONSTRAINT "backlink_targets_project_id_seo_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."seo_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_content" ADD CONSTRAINT "generated_content_project_id_seo_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."seo_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_content" ADD CONSTRAINT "generated_content_template_id_content_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."content_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_seo_profiles" ADD CONSTRAINT "local_seo_profiles_project_id_seo_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."seo_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_seo_reviews" ADD CONSTRAINT "local_seo_reviews_profile_id_local_seo_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."local_seo_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_alerts" ADD CONSTRAINT "seo_alerts_project_id_seo_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."seo_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_alerts" ADD CONSTRAINT "seo_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_metrics" ADD CONSTRAINT "seo_metrics_project_id_seo_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."seo_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_projects" ADD CONSTRAINT "seo_projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_reports" ADD CONSTRAINT "seo_reports_project_id_seo_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."seo_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_reports" ADD CONSTRAINT "seo_reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_sprints" ADD CONSTRAINT "seo_sprints_project_id_seo_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."seo_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "backlink_campaigns_project_idx" ON "backlink_campaigns" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "backlink_campaigns_status_idx" ON "backlink_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "backlink_targets_project_idx" ON "backlink_targets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "backlink_targets_domain_rating_idx" ON "backlink_targets" USING btree ("domain_rating");--> statement-breakpoint
CREATE INDEX "backlink_targets_outreach_status_idx" ON "backlink_targets" USING btree ("outreach_status");--> statement-breakpoint
CREATE INDEX "generated_content_project_idx" ON "generated_content" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "generated_content_type_idx" ON "generated_content" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "generated_content_status_idx" ON "generated_content" USING btree ("status");--> statement-breakpoint
CREATE INDEX "local_seo_profiles_project_idx" ON "local_seo_profiles" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "local_seo_profiles_google_business_idx" ON "local_seo_profiles" USING btree ("google_business_id");--> statement-breakpoint
CREATE INDEX "local_seo_reviews_profile_idx" ON "local_seo_reviews" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "local_seo_reviews_review_id_idx" ON "local_seo_reviews" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "seo_alerts_project_idx" ON "seo_alerts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "seo_alerts_type_idx" ON "seo_alerts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "seo_alerts_severity_idx" ON "seo_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "seo_alerts_resolved_idx" ON "seo_alerts" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "seo_metrics_project_idx" ON "seo_metrics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "seo_metrics_url_idx" ON "seo_metrics" USING btree ("url");--> statement-breakpoint
CREATE INDEX "seo_metrics_measured_at_idx" ON "seo_metrics" USING btree ("measured_at");--> statement-breakpoint
CREATE INDEX "seo_projects_domain_idx" ON "seo_projects" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "seo_projects_owner_idx" ON "seo_projects" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "seo_reports_project_idx" ON "seo_reports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "seo_reports_type_idx" ON "seo_reports" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "seo_reports_generated_at_idx" ON "seo_reports" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "seo_sprints_project_idx" ON "seo_sprints" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "seo_sprints_phase_idx" ON "seo_sprints" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "seo_sprints_number_idx" ON "seo_sprints" USING btree ("sprint_number");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");