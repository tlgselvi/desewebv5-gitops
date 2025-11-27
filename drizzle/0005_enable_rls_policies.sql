-- Migration: Enable Row-Level Security (RLS) for Multi-Tenancy
-- Date: 2025-01-27
-- Description: Enables RLS on all tables with organization_id and creates policies for tenant isolation

-- Step 1: Create a function to get current user's organization_id from JWT
-- This function will be used in RLS policies
CREATE OR REPLACE FUNCTION current_user_organization_id()
RETURNS uuid AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Try to get organization_id from JWT claim (set by application)
  -- PostgreSQL doesn't have direct JWT support, so we use a session variable
  -- The application will set this using: SET LOCAL app.current_organization_id = 'uuid';
  SELECT current_setting('app.current_organization_id', true)::uuid INTO org_id;
  RETURN org_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 2: Create a function to check if user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user role from session variable (set by application)
  SELECT current_setting('app.current_user_role', true) INTO user_role;
  RETURN user_role = 'super_admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 3: Enable RLS on all tables with organization_id

-- SaaS Tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Finance Tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- CRM Tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Inventory Tables
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- HR Tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

-- IoT Tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_alerts ENABLE ROW LEVEL SECURITY;

-- Service Tables
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_executions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies for each table
-- Policy: Users can only see/modify data from their own organization
-- Super admin can see all data

-- Organizations: Users can see their own organization, super_admin can see all
CREATE POLICY organizations_isolation_policy ON organizations
  FOR ALL
  USING (
    id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    id = current_user_organization_id() OR is_super_admin()
  );

-- Users: Users can see users from their organization, super_admin can see all
CREATE POLICY users_isolation_policy ON users
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin() OR id::text = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- Permissions: Organization-scoped
CREATE POLICY permissions_isolation_policy ON permissions
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- Note: integrations, suppliers, service_requests, technicians, service_visits, maintenance_plans, maintenance_executions
-- tables do not exist yet. RLS policies will be added when these tables are created.

-- Finance: Accounts
CREATE POLICY accounts_isolation_policy ON accounts
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- Finance: Invoices
CREATE POLICY invoices_isolation_policy ON invoices
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- Finance: Invoice Items
CREATE POLICY invoice_items_isolation_policy ON invoice_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (invoices.organization_id = current_user_organization_id() OR is_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (invoices.organization_id = current_user_organization_id() OR is_super_admin())
    )
  );

-- Finance: Transactions
CREATE POLICY transactions_isolation_policy ON transactions
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- Finance: Ledgers
CREATE POLICY ledgers_isolation_policy ON ledgers
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- Finance: Ledger Entries
CREATE POLICY ledger_entries_isolation_policy ON ledger_entries
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- CRM: Contacts
CREATE POLICY contacts_isolation_policy ON contacts
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- CRM: Pipeline Stages
CREATE POLICY pipeline_stages_isolation_policy ON pipeline_stages
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- CRM: Deals
CREATE POLICY deals_isolation_policy ON deals
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- CRM: Activities
CREATE POLICY activities_isolation_policy ON activities
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- Inventory: Warehouses
CREATE POLICY warehouses_isolation_policy ON warehouses
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- Inventory: Products
CREATE POLICY products_isolation_policy ON products
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- Inventory: Stock Levels
CREATE POLICY stock_levels_isolation_policy ON stock_levels
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- Inventory: Stock Movements
CREATE POLICY stock_movements_isolation_policy ON stock_movements
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- Note: suppliers table does not exist yet. RLS policy will be added when table is created.

-- HR: Departments
CREATE POLICY departments_isolation_policy ON departments
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- HR: Employees
CREATE POLICY employees_isolation_policy ON employees
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- HR: Payrolls
CREATE POLICY payrolls_isolation_policy ON payrolls
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- IoT: Devices
CREATE POLICY devices_isolation_policy ON devices
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- IoT: Telemetry
CREATE POLICY telemetry_isolation_policy ON telemetry
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = telemetry.device_id
      AND (devices.organization_id = current_user_organization_id() OR is_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = telemetry.device_id
      AND (devices.organization_id = current_user_organization_id() OR is_super_admin())
    )
  );

-- IoT: Automation Rules
CREATE POLICY automation_rules_isolation_policy ON automation_rules
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- IoT: Device Alerts
CREATE POLICY device_alerts_isolation_policy ON device_alerts
  FOR ALL
  USING (
    organization_id = current_user_organization_id() OR is_super_admin()
  )
  WITH CHECK (
    organization_id = current_user_organization_id() OR is_super_admin()
  );

-- Note: service_requests, technicians, service_visits, maintenance_plans, maintenance_executions
-- tables do not exist yet. RLS policies will be added when these tables are created.

-- Step 5: Grant necessary permissions
-- Allow application user to set session variables
GRANT USAGE ON SCHEMA public TO CURRENT_USER;

-- Note: The application must set these session variables before each query:
-- SET LOCAL app.current_organization_id = 'uuid';
-- SET LOCAL app.current_user_id = 'uuid';
-- SET LOCAL app.current_user_role = 'role';

