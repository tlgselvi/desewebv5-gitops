-- Enable Row Level Security for Subscription & Billing tables
-- This migration adds subscription tables and RLS policies

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "slug" varchar(50) NOT NULL UNIQUE,
  "description" text,
  "price" numeric(10, 2) NOT NULL,
  "currency" varchar(3) DEFAULT 'TRY' NOT NULL,
  "billing_cycle" varchar(20) NOT NULL,
  "trial_days" integer DEFAULT 14,
  "features" jsonb NOT NULL,
  "is_active" boolean DEFAULT true,
  "is_public" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "type" varchar(20) NOT NULL,
  "provider" varchar(50) NOT NULL,
  "last4" varchar(4),
  "brand" varchar(20),
  "expiry_month" integer,
  "expiry_year" integer,
  "is_default" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "stripe_payment_method_id" varchar(255),
  "stripe_customer_id" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "plan_id" uuid NOT NULL REFERENCES "subscription_plans"("id"),
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "current_period_start" timestamp NOT NULL,
  "current_period_end" timestamp NOT NULL,
  "trial_start" timestamp,
  "trial_end" timestamp,
  "canceled_at" timestamp,
  "cancel_at_period_end" boolean DEFAULT false,
  "payment_method_id" uuid REFERENCES "payment_methods"("id"),
  "stripe_subscription_id" varchar(255),
  "stripe_customer_id" varchar(255),
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create usage_metrics table
CREATE TABLE IF NOT EXISTS "usage_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "subscription_id" uuid REFERENCES "subscriptions"("id"),
  "metric_type" varchar(50) NOT NULL,
  "value" numeric(15, 2) NOT NULL,
  "period" varchar(20) NOT NULL,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create subscription_invoices table
CREATE TABLE IF NOT EXISTS "subscription_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "subscription_id" uuid REFERENCES "subscriptions"("id"),
  "invoice_number" varchar(50) NOT NULL UNIQUE,
  "amount" numeric(10, 2) NOT NULL,
  "tax" numeric(10, 2) DEFAULT '0',
  "discount" numeric(10, 2) DEFAULT '0',
  "total" numeric(10, 2) NOT NULL,
  "currency" varchar(3) DEFAULT 'TRY' NOT NULL,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "due_date" timestamp NOT NULL,
  "paid_date" timestamp,
  "line_items" jsonb NOT NULL,
  "pdf_url" text,
  "pdf_generated_at" timestamp,
  "stripe_invoice_id" varchar(255),
  "payment_method_id" uuid REFERENCES "payment_methods"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_slug_idx" ON "subscription_plans" ("slug");
CREATE INDEX IF NOT EXISTS "subscription_plans_active_idx" ON "subscription_plans" ("is_active", "is_public");

CREATE INDEX IF NOT EXISTS "payment_methods_org_idx" ON "payment_methods" ("organization_id");
CREATE INDEX IF NOT EXISTS "payment_methods_default_idx" ON "payment_methods" ("organization_id", "is_default");
CREATE INDEX IF NOT EXISTS "payment_methods_stripe_idx" ON "payment_methods" ("stripe_payment_method_id");

CREATE INDEX IF NOT EXISTS "subscriptions_org_idx" ON "subscriptions" ("organization_id");
CREATE INDEX IF NOT EXISTS "subscriptions_plan_idx" ON "subscriptions" ("plan_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" ("status");
CREATE INDEX IF NOT EXISTS "subscriptions_period_idx" ON "subscriptions" ("current_period_start", "current_period_end");
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_idx" ON "subscriptions" ("stripe_subscription_id");

CREATE INDEX IF NOT EXISTS "usage_org_metric_idx" ON "usage_metrics" ("organization_id", "metric_type");
CREATE INDEX IF NOT EXISTS "usage_period_idx" ON "usage_metrics" ("period_start", "period_end");
CREATE INDEX IF NOT EXISTS "usage_subscription_idx" ON "usage_metrics" ("subscription_id");
CREATE INDEX IF NOT EXISTS "usage_type_period_idx" ON "usage_metrics" ("metric_type", "period_start", "period_end");

CREATE INDEX IF NOT EXISTS "invoices_org_idx" ON "subscription_invoices" ("organization_id");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_number_idx" ON "subscription_invoices" ("invoice_number");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "subscription_invoices" ("status");
CREATE INDEX IF NOT EXISTS "invoices_due_date_idx" ON "subscription_invoices" ("due_date");
CREATE INDEX IF NOT EXISTS "invoices_subscription_idx" ON "subscription_invoices" ("subscription_id");
CREATE INDEX IF NOT EXISTS "invoices_stripe_idx" ON "subscription_invoices" ("stripe_invoice_id");


-- Enable RLS on subscription tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Subscription Plans Policies
-- Plans are public (read-only for all authenticated users)
CREATE POLICY "Users can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true AND is_public = true);

-- Super admins can manage plans
CREATE POLICY "Super admins can manage subscription plans"
  ON subscription_plans FOR ALL
  USING (
    current_setting('app.current_user_role', true) = 'super_admin'
  );

-- Subscriptions Policies
-- Users can view their organization's subscriptions
CREATE POLICY "Users can view their organization's subscriptions"
  ON subscriptions FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
  );

-- Organization admins can manage subscriptions
CREATE POLICY "Organization admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND (
      current_setting('app.current_user_role', true) = 'admin'
      OR current_setting('app.current_user_role', true) = 'super_admin'
    )
  );

-- Usage Metrics Policies
-- Users can view their organization's usage metrics
CREATE POLICY "Users can view their organization's usage metrics"
  ON usage_metrics FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
  );

-- System can insert usage metrics (via service account or background jobs)
-- Note: In production, this should be restricted to specific service accounts
CREATE POLICY "System can insert usage metrics"
  ON usage_metrics FOR INSERT
  WITH CHECK (true); -- Service layer will validate organization_id

-- Organization admins can view usage metrics
CREATE POLICY "Organization admins can view usage metrics"
  ON usage_metrics FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND (
      current_setting('app.current_user_role', true) = 'admin'
      OR current_setting('app.current_user_role', true) = 'super_admin'
    )
  );

-- Subscription Invoices Policies
-- Users can view their organization's invoices
CREATE POLICY "Users can view their organization's invoices"
  ON subscription_invoices FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
  );

-- Organization admins can manage invoices
CREATE POLICY "Organization admins can manage invoices"
  ON subscription_invoices FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND (
      current_setting('app.current_user_role', true) = 'admin'
      OR current_setting('app.current_user_role', true) = 'super_admin'
    )
  );

-- Payment Methods Policies
-- Users can view their organization's payment methods
CREATE POLICY "Users can view their organization's payment methods"
  ON payment_methods FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
  );

-- Organization admins can manage payment methods
CREATE POLICY "Organization admins can manage payment methods"
  ON payment_methods FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND (
      current_setting('app.current_user_role', true) = 'admin'
      OR current_setting('app.current_user_role', true) = 'super_admin'
    )
  );

-- Grant necessary permissions
-- Note: These grants assume a role-based access control system
-- Adjust based on your actual role structure

-- Allow authenticated users to read plans
GRANT SELECT ON subscription_plans TO authenticated;

-- Allow organization members to read their data
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON usage_metrics TO authenticated;
GRANT SELECT ON subscription_invoices TO authenticated;
GRANT SELECT ON payment_methods TO authenticated;

-- Allow admins to manage their organization's data
-- Note: These grants should be role-based in production
-- For now, we rely on RLS policies for access control
