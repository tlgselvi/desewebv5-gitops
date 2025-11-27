#!/bin/sh
# Docker entrypoint script for DESE EA Plan
# This script handles:
# 1. Waiting for database to be ready
# 2. Running database migrations
# 3. Running seed script on first install (if needed)
# 4. Starting the application

set -e

echo "🚀 DESE EA Plan - Container Startup"
echo "===================================="

# Check if .env file exists and validate
if [ -f /app/scripts/check-env.sh ]; then
  sh /app/scripts/check-env.sh || {
    echo "⚠️  Environment check failed, but continuing..."
  }
else
  if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "   Please create .env file from env.example"
    echo "   Continuing anyway, but some features may not work..."
  fi
fi

# Wait for database to be ready
echo ""
echo "📡 Waiting for database to be ready..."
if [ -f /app/scripts/wait-for-db.sh ]; then
  sh /app/scripts/wait-for-db.sh
else
  # Fallback: simple wait using pg_isready if available
  echo "   Using fallback method..."
  until pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${POSTGRES_USER:-dese}" 2>/dev/null; do
    echo "   Waiting for database..."
    sleep 2
  done
fi

echo "✅ Database is ready!"

# Run database migrations
echo ""
echo "🔄 Running database migrations..."
if pnpm db:migrate; then
  echo "✅ Migrations completed successfully"
else
  echo "❌ Migration failed!"
  exit 1
fi

# Check if we should run seed script
# Only seed if SKIP_SEED is not set and this is first run
if [ -z "$SKIP_SEED" ]; then
  echo ""
  echo "🌱 Checking if seeding is needed..."
  
  # Check if organizations table has any data using psql
  # If not, run seed script
  ORG_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD:-dese123}" psql -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${POSTGRES_USER:-dese}" -d "${POSTGRES_DB:-dese_ea_plan_v5}" -t -c "SELECT COUNT(*) FROM organizations;" 2>/dev/null | tr -d ' ' || echo "0")
  
  if [ "$ORG_COUNT" = "0" ] || [ -z "$ORG_COUNT" ]; then
    echo "   No data found, running seed script..."
    if pnpm db:seed:data; then
      echo "✅ Seed completed successfully"
    else
      echo "⚠️  Seed script failed, but continuing..."
    fi
  else
    echo "   Data already exists ($ORG_COUNT organizations), skipping seed"
  fi
else
  echo "   SKIP_SEED is set, skipping seed script"
fi

# Start the application
echo ""
echo "🎯 Starting application..."
echo "===================================="
exec "$@"

