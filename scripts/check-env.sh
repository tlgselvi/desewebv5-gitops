#!/bin/sh
# Environment file check script
# Checks if .env file exists and validates critical variables

set -e

ENV_FILE="${1:-.env}"
ENV_EXAMPLE="${2:-env.example}"

echo "🔍 Checking environment configuration..."

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  WARNING: $ENV_FILE file not found!"
  
  if [ -f "$ENV_EXAMPLE" ]; then
    echo "   Creating $ENV_FILE from $ENV_EXAMPLE..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "   ✅ Created $ENV_FILE"
    echo "   ⚠️  Please review and update $ENV_FILE with your actual values!"
  else
    echo "   ❌ $ENV_EXAMPLE not found either!"
    echo "   Please create $ENV_FILE manually."
    exit 1
  fi
else
  echo "   ✅ $ENV_FILE exists"
fi

# Check critical variables
echo ""
echo "🔐 Validating critical environment variables..."

# Source the .env file to check variables
# Note: This is a simple check, actual validation should be done by the application
MISSING_VARS=""

if ! grep -q "^DATABASE_URL=" "$ENV_FILE" 2>/dev/null; then
  MISSING_VARS="$MISSING_VARS DATABASE_URL"
fi

if ! grep -q "^JWT_SECRET=" "$ENV_FILE" 2>/dev/null; then
  MISSING_VARS="$MISSING_VARS JWT_SECRET"
fi

if ! grep -q "^POSTGRES_USER=" "$ENV_FILE" 2>/dev/null; then
  MISSING_VARS="$MISSING_VARS POSTGRES_USER"
fi

if ! grep -q "^POSTGRES_PASSWORD=" "$ENV_FILE" 2>/dev/null; then
  MISSING_VARS="$MISSING_VARS POSTGRES_PASSWORD"
fi

if ! grep -q "^POSTGRES_DB=" "$ENV_FILE" 2>/dev/null; then
  MISSING_VARS="$MISSING_VARS POSTGRES_DB"
fi

if [ -n "$MISSING_VARS" ]; then
  echo "   ⚠️  Missing or empty critical variables:$MISSING_VARS"
  echo "   Please check your $ENV_FILE file"
  exit 1
else
  echo "   ✅ All critical variables are set"
fi

echo ""
echo "✅ Environment check completed successfully"

