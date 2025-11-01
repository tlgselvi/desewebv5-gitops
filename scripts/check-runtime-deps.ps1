# Runtime Initialization Dependencies Checker
# Dese EA Plan v5.0 - Runtime Dependencies Verification

Write-Host "═══════════════════════════════════════"
Write-Host "Runtime Initialization Dependencies"
Write-Host "═══════════════════════════════════════"
Write-Host ""

$errors = @()
$warnings = @()

# Load .env file if exists
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($value -notmatch '^#') {
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
            }
        }
    }
    Write-Host "✅ .env file loaded"
} else {
    $errors += ".env file not found"
    Write-Host "❌ .env file not found"
}

Write-Host ""

# [1] ENV Variables Check
Write-Host "[1] ENV Variables Check:"
$requiredEnv = @("DATABASE_URL", "JWT_SECRET")
foreach ($key in $requiredEnv) {
    $value = [Environment]::GetEnvironmentVariable($key, "Process")
    if (-not $value -or $value -match "your-|placeholder|example") {
        $errors += "Missing or invalid: $key"
        Write-Host "   ❌ $key : MISSING or INVALID"
    } else {
        Write-Host "   ✅ $key : OK"
    }
}

Write-Host ""

# [2] Database Connection Check
Write-Host "[2] Database Connection Check:"
$dbUrl = [Environment]::GetEnvironmentVariable("DATABASE_URL", "Process")
if ($dbUrl) {
    Write-Host "   DATABASE_URL: $($dbUrl.Substring(0, [Math]::Min(60, $dbUrl.Length)))..."
    
    # Check if PostgreSQL connection can be established
    try {
        $testScript = @"
const {Client} = require('pg');
const client = new Client(process.env.DATABASE_URL);
client.connect()
  .then(() => {
    console.log('✅ PostgreSQL connection OK');
    client.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection FAILED:', err.message);
    process.exit(1);
  });
"@
        $testScript | node
        if ($LASTEXITCODE -ne 0) {
            $errors += "PostgreSQL connection failed"
        }
    } catch {
        $warnings += "pg module not available - cannot test DB connection"
        Write-Host "   ⚠️  Cannot test connection (pg module may not be installed)"
    }
} else {
    $errors += "DATABASE_URL not set"
    Write-Host "   ❌ DATABASE_URL not configured"
}

Write-Host ""

# [3] Migrations/Schema Check
Write-Host "[3] Migrations/Schema Check:"
if (Test-Path "drizzle.config.ts") {
    Write-Host "   ✅ Drizzle config found"
    
    if (Test-Path "drizzle") {
        $migrations = Get-ChildItem -Path drizzle -Filter *.sql -ErrorAction SilentlyContinue
        if ($migrations.Count -gt 0) {
            Write-Host "   ✅ Migrations found: $($migrations.Count) files"
        } else {
            $warnings += "No migration files found in drizzle directory"
            Write-Host "   ⚠️  No migration files found"
        }
    } else {
        Write-Host "   ⚠️  Migrations directory not found"
    }
    
    # Check schema file
    if (Test-Path "src/db/schema.ts") {
        Write-Host "   ✅ Schema file found"
    } else {
        $errors += "Schema file not found (src/db/schema.ts)"
        Write-Host "   ❌ Schema file not found"
    }
} else {
    $warnings += "Drizzle config not found"
    Write-Host "   ⚠️  Drizzle config not found"
}

Write-Host ""

# [4] Redis Check (Optional)
Write-Host "[4] Redis Check (Optional):"
$redisUrl = [Environment]::GetEnvironmentVariable("REDIS_URL", "Process")
if ($redisUrl) {
    Write-Host "   REDIS_URL configured"
    try {
        $redisResult = redis-cli ping 2>&1
        if ($redisResult -match "PONG") {
            Write-Host "   ✅ Redis connection OK"
        } else {
            $warnings += "Redis not responding"
            Write-Host "   ⚠️  Redis not responding (optional, continuing...)"
        }
    } catch {
        $warnings += "Redis client not available"
        Write-Host "   ⚠️  Redis client not available (optional)"
    }
} else {
    Write-Host "   ⚠️  Redis not configured (optional, skipping...)"
}

Write-Host ""
Write-Host "═══════════════════════════════════════"
Write-Host "Summary"
Write-Host "═══════════════════════════════════════"

if ($errors.Count -eq 0) {
    Write-Host "✅ All required dependencies OK" -ForegroundColor Green
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  Warnings: $($warnings.Count)" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
    }
    exit 0
} else {
    Write-Host "❌ Errors found: $($errors.Count)" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  Warnings: $($warnings.Count)" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
    }
    exit 1
}

