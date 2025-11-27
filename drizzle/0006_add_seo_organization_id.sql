-- Migration: Add organizationId to SEO tables for multi-tenancy support
-- Date: 2025-01-27
-- Description: Adds organization_id column to seo_projects and content_templates tables
--              and migrates existing data based on owner's organization

-- Step 1: Add organization_id column to seo_projects (nullable first for data migration)
ALTER TABLE seo_projects 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Step 2: Migrate existing data - set organization_id from owner's organization
UPDATE seo_projects sp
SET organization_id = u.organization_id
FROM users u
WHERE sp.owner_id = u.id 
  AND sp.organization_id IS NULL
  AND u.organization_id IS NOT NULL;

-- Step 3: For any remaining NULL organization_id, set to a default organization
-- (This handles edge cases where owner might not have organization_id)
-- In production, you should handle this case more carefully
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Try to get first organization, or create a default one
  SELECT id INTO default_org_id FROM organizations LIMIT 1;
  
  IF default_org_id IS NULL THEN
    -- Create a default organization if none exists
    INSERT INTO organizations (id, name, slug, status)
    VALUES (gen_random_uuid(), 'Default Organization', 'default-org', 'active')
    RETURNING id INTO default_org_id;
  END IF;
  
  -- Update any remaining NULL organization_id
  UPDATE seo_projects
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;
END $$;

-- Step 4: Make organization_id NOT NULL and add foreign key constraint
ALTER TABLE seo_projects
  ALTER COLUMN organization_id SET NOT NULL,
  ADD CONSTRAINT seo_projects_organization_id_fkey 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) 
    ON DELETE CASCADE;

-- Step 5: Add organization_id column to content_templates (nullable first)
ALTER TABLE content_templates 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Step 6: Migrate content_templates data
-- Since content_templates don't have a direct owner, we'll set them to the first organization
-- In production, you might want to map them based on usage or create a migration strategy
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  SELECT id INTO default_org_id FROM organizations LIMIT 1;
  
  IF default_org_id IS NOT NULL THEN
    UPDATE content_templates
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Step 7: Make content_templates.organization_id NOT NULL and add foreign key
ALTER TABLE content_templates
  ALTER COLUMN organization_id SET NOT NULL,
  ADD CONSTRAINT content_templates_organization_id_fkey 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) 
    ON DELETE CASCADE;

-- Step 8: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS seo_projects_org_idx ON seo_projects(organization_id);
CREATE INDEX IF NOT EXISTS seo_projects_org_domain_idx ON seo_projects(organization_id, domain);
CREATE INDEX IF NOT EXISTS content_templates_org_idx ON content_templates(organization_id);
CREATE INDEX IF NOT EXISTS content_templates_org_type_idx ON content_templates(organization_id, type);

-- Step 9: Enable RLS on SEO tables (if not already enabled)
ALTER TABLE seo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_seo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_seo_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_reports ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies for seo_projects
-- Policy: Users can only see projects from their organization
DROP POLICY IF EXISTS seo_projects_select_policy ON seo_projects;
CREATE POLICY seo_projects_select_policy ON seo_projects
  FOR SELECT
  USING (
    organization_id = current_user_organization_id() 
    OR is_super_admin()
  );

DROP POLICY IF EXISTS seo_projects_insert_policy ON seo_projects;
CREATE POLICY seo_projects_insert_policy ON seo_projects
  FOR INSERT
  WITH CHECK (
    organization_id = current_user_organization_id() 
    OR is_super_admin()
  );

DROP POLICY IF EXISTS seo_projects_update_policy ON seo_projects;
CREATE POLICY seo_projects_update_policy ON seo_projects
  FOR UPDATE
  USING (
    organization_id = current_user_organization_id() 
    OR is_super_admin()
  );

DROP POLICY IF EXISTS seo_projects_delete_policy ON seo_projects;
CREATE POLICY seo_projects_delete_policy ON seo_projects
  FOR DELETE
  USING (
    organization_id = current_user_organization_id() 
    OR is_super_admin()
  );

-- Step 11: Create RLS policies for seo_metrics (via project relationship)
DROP POLICY IF EXISTS seo_metrics_select_policy ON seo_metrics;
CREATE POLICY seo_metrics_select_policy ON seo_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seo_projects sp
      WHERE sp.id = seo_metrics.project_id
        AND (sp.organization_id = current_user_organization_id() OR is_super_admin())
    )
  );

DROP POLICY IF EXISTS seo_metrics_insert_policy ON seo_metrics;
CREATE POLICY seo_metrics_insert_policy ON seo_metrics
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seo_projects sp
      WHERE sp.id = seo_metrics.project_id
        AND (sp.organization_id = current_user_organization_id() OR is_super_admin())
    )
  );

-- Step 12: Create RLS policies for content_templates
DROP POLICY IF EXISTS content_templates_select_policy ON content_templates;
CREATE POLICY content_templates_select_policy ON content_templates
  FOR SELECT
  USING (
    organization_id = current_user_organization_id() 
    OR is_super_admin()
  );

DROP POLICY IF EXISTS content_templates_insert_policy ON content_templates;
CREATE POLICY content_templates_insert_policy ON content_templates
  FOR INSERT
  WITH CHECK (
    organization_id = current_user_organization_id() 
    OR is_super_admin()
  );

DROP POLICY IF EXISTS content_templates_update_policy ON content_templates;
CREATE POLICY content_templates_update_policy ON content_templates
  FOR UPDATE
  USING (
    organization_id = current_user_organization_id() 
    OR is_super_admin()
  );

DROP POLICY IF EXISTS content_templates_delete_policy ON content_templates;
CREATE POLICY content_templates_delete_policy ON content_templates
  FOR DELETE
  USING (
    organization_id = current_user_organization_id() 
    OR is_super_admin()
  );

-- Step 13: Create RLS policies for other SEO tables (via project relationship)
-- These tables reference seo_projects, so we check through that relationship

-- generated_content
DROP POLICY IF EXISTS generated_content_select_policy ON generated_content;
CREATE POLICY generated_content_select_policy ON generated_content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seo_projects sp
      WHERE sp.id = generated_content.project_id
        AND (sp.organization_id = current_user_organization_id() OR is_super_admin())
    )
  );

-- local_seo_profiles
DROP POLICY IF EXISTS local_seo_profiles_select_policy ON local_seo_profiles;
CREATE POLICY local_seo_profiles_select_policy ON local_seo_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seo_projects sp
      WHERE sp.id = local_seo_profiles.project_id
        AND (sp.organization_id = current_user_organization_id() OR is_super_admin())
    )
  );

-- backlink_targets
DROP POLICY IF EXISTS backlink_targets_select_policy ON backlink_targets;
CREATE POLICY backlink_targets_select_policy ON backlink_targets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seo_projects sp
      WHERE sp.id = backlink_targets.project_id
        AND (sp.organization_id = current_user_organization_id() OR is_super_admin())
    )
  );

-- backlink_campaigns
DROP POLICY IF EXISTS backlink_campaigns_select_policy ON backlink_campaigns;
CREATE POLICY backlink_campaigns_select_policy ON backlink_campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seo_projects sp
      WHERE sp.id = backlink_campaigns.project_id
        AND (sp.organization_id = current_user_organization_id() OR is_super_admin())
    )
  );

-- seo_alerts
DROP POLICY IF EXISTS seo_alerts_select_policy ON seo_alerts;
CREATE POLICY seo_alerts_select_policy ON seo_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seo_projects sp
      WHERE sp.id = seo_alerts.project_id
        AND (sp.organization_id = current_user_organization_id() OR is_super_admin())
    )
  );

-- seo_sprints
DROP POLICY IF EXISTS seo_sprints_select_policy ON seo_sprints;
CREATE POLICY seo_sprints_select_policy ON seo_sprints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seo_projects sp
      WHERE sp.id = seo_sprints.project_id
        AND (sp.organization_id = current_user_organization_id() OR is_super_admin())
    )
  );

-- seo_reports
DROP POLICY IF EXISTS seo_reports_select_policy ON seo_reports;
CREATE POLICY seo_reports_select_policy ON seo_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seo_projects sp
      WHERE sp.id = seo_reports.project_id
        AND (sp.organization_id = current_user_organization_id() OR is_super_admin())
    )
  );

-- Note: For INSERT/UPDATE/DELETE policies on these tables, you may want to add them
-- based on your specific business requirements. The SELECT policies above ensure
-- that users can only see data from their organization.

