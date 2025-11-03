#!/bin/sh
set -e

echo "🚀 Starting Dese EA Plan v6.7.0..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until node -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dese_ea_plan_v5');
sql\`SELECT 1\`.then(() => { sql.end(); process.exit(0); }).catch((e) => { sql.end(); process.exit(1); });
" 2>/dev/null; do
  echo "   Database not ready, waiting..."
  sleep 2
done
echo "✅ Database connection established"

# Run migrations
if [ "$RUN_MIGRATIONS" != "false" ]; then
  echo "📦 Running database migrations..."
  node -e "
const { execSync } = require('child_process');
try {
  execSync('pnpm db:migrate', { stdio: 'inherit', env: process.env });
} catch (e) {
  console.error('⚠️  Migration failed, but continuing...');
  process.exit(0);
}
" || {
    echo "⚠️  Migration failed, but continuing..."
  }
  echo "✅ Migrations completed"
fi

# Seed RBAC data (only if RBAC_SEED is true)
if [ "$RBAC_SEED" = "true" ]; then
  echo "🌱 Seeding RBAC data..."
  node -e "
const { execSync } = require('child_process');
try {
  execSync('pnpm rbac:seed', { stdio: 'inherit', env: process.env });
} catch (e) {
  console.error('⚠️  RBAC seed failed, but continuing...');
  process.exit(0);
}
" || {
    echo "⚠️  RBAC seed failed, but continuing..."
  }
  echo "✅ RBAC seed completed"
fi

# Audit retention (opsiyonel): son AUDIT_RETENTION_DAYS dışındakileri sil
if [ -n "$AUDIT_RETENTION_DAYS" ]; then
  echo "🧹 Cleaning old audit logs (older than $AUDIT_RETENTION_DAYS days)..."
  node -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dese_ea_plan_v5');
sql\`DELETE FROM audit_logs WHERE ts < NOW() - INTERVAL '\${process.env.AUDIT_RETENTION_DAYS} days'\`.then(() => {
  console.log('✅ Old audit logs cleaned');
  sql.end();
  process.exit(0);
}).catch((e) => {
  console.error('⚠️  Audit cleanup failed, but continuing...', e.message);
  sql.end();
  process.exit(0);
});
" || {
    echo "⚠️  Audit cleanup failed, but continuing..."
  }
fi

# Start the application
echo "🎯 Starting application..."
exec "$@"

