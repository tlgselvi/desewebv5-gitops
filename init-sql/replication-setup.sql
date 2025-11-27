-- PostgreSQL Replication Setup Script
-- This script runs on primary database initialization

-- Create replication user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator') THEN
    CREATE USER replicator WITH REPLICATION PASSWORD 'replication_password';
  END IF;
END
$$;

-- Grant replication privileges
GRANT REPLICATION ON DATABASE dese_ea_plan_v5 TO replicator;

-- Create replication slot (optional, for better replication management)
-- Note: Replication slots prevent WAL files from being removed
-- This is useful for ensuring replicas don't fall behind
SELECT pg_create_physical_replication_slot('replica_slot_1', true, false)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_replication_slots WHERE slot_name = 'replica_slot_1'
);

-- Log replication setup
DO $$
BEGIN
  RAISE NOTICE 'Replication setup completed. Replication user: replicator';
END
$$;

