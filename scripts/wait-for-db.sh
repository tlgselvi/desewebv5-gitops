#!/bin/sh
# Wait for PostgreSQL database to be ready
# Usage: wait-for-db.sh [host] [port] [timeout]

set -e

HOST=${1:-${DB_HOST:-db}}
PORT=${2:-${DB_PORT:-5432}}
TIMEOUT=${3:-30}
DB_NAME=${DB_NAME:-${POSTGRES_DB:-dese_ea_plan_v5}}
DB_USER=${DB_USER:-${POSTGRES_USER:-dese}}

echo "Waiting for PostgreSQL at $HOST:$PORT to be ready..."

for i in $(seq 1 $TIMEOUT); do
  if nc -z "$HOST" "$PORT" 2>/dev/null; then
    echo "PostgreSQL is ready!"
    exit 0
  fi
  echo "Waiting for PostgreSQL... ($i/$TIMEOUT)"
  sleep 1
done

echo "Timeout waiting for PostgreSQL at $HOST:$PORT"
exit 1

