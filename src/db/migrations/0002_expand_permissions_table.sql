-- Migration: Expand permissions table with description and category
-- Feature: RBAC Expansion + Audit Trail Integration
-- Date: 2025-11-04

-- Check if permissions table exists, if not create it first
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'permissions') THEN
    CREATE TABLE permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      resource TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT,
      category TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  END IF;
END $$;

-- Add description column to permissions table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'permissions' AND column_name = 'description'
  ) THEN
    ALTER TABLE permissions ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add category column to permissions table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'permissions' AND column_name = 'category'
  ) THEN
    ALTER TABLE permissions ADD COLUMN category TEXT;
  END IF;
END $$;

-- Add updated_at column to permissions table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'permissions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE permissions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Update existing permissions with updated_at if null
UPDATE permissions 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

-- Create index on resource and action for faster lookups
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- Add comment to permissions table
COMMENT ON TABLE permissions IS 'Permissions table with expanded fields for RBAC management';
COMMENT ON COLUMN permissions.description IS 'Human-readable description of the permission';
COMMENT ON COLUMN permissions.category IS 'Category grouping: finance, seo, analytics, system, etc.';
COMMENT ON COLUMN permissions.updated_at IS 'Timestamp of last update';

