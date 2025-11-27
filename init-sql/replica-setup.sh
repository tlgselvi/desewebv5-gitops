#!/bin/bash
# PostgreSQL Replica Setup Script
# This script runs on replica database initialization

set -e

PRIMARY_HOST=${POSTGRES_MASTER_HOST:-db-primary}
PRIMARY_PORT=${POSTGRES_MASTER_PORT:-5432}
REPLICATION_USER=${POSTGRES_REPLICATION_USER:-replicator}
REPLICATION_PASSWORD=${POSTGRES_REPLICATION_PASSWORD:-replication_password}
PGDATA=${PGDATA:-/var/lib/postgresql/data}

echo "Setting up PostgreSQL replica from ${PRIMARY_HOST}:${PRIMARY_PORT}..."

# Wait for primary to be ready
until pg_isready -h ${PRIMARY_HOST} -p ${PRIMARY_PORT} -U ${REPLICATION_USER}; do
  echo "Waiting for primary database to be ready..."
  sleep 2
done

# Remove existing data if any
if [ -d "${PGDATA}" ] && [ "$(ls -A ${PGDATA})" ]; then
  echo "Removing existing data directory..."
  rm -rf ${PGDATA}/*
fi

# Create base backup from primary
echo "Creating base backup from primary..."
PGPASSWORD=${REPLICATION_PASSWORD} pg_basebackup \
  -h ${PRIMARY_HOST} \
  -p ${PRIMARY_PORT} \
  -U ${REPLICATION_USER} \
  -D ${PGDATA} \
  -Fp \
  -Xs \
  -P \
  -R

# Create recovery configuration
echo "Configuring recovery settings..."
cat >> ${PGDATA}/postgresql.conf <<EOF

# Replica configuration
hot_standby = on
max_standby_streaming_delay = 30s
wal_receiver_status_interval = 10s
hot_standby_feedback = on
EOF

echo "Replica setup completed successfully!"

