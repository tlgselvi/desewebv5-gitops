import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '@/utils/logger.js';
import postgres from 'postgres';
import { config } from '@/config/index.js';
import { execSync } from 'child_process';

async function runMigrations() {
  logger.info('🔄 Running database migrations...');

  try {
    // Get database connection string
    const connectionString = config.database.url;
    const sql = postgres(connectionString);

    // Read migration files from drizzle directory
    // Try multiple possible paths
    const possiblePaths = [
      join(process.cwd(), 'drizzle'),
      join(process.cwd(), '..', 'drizzle'),
      '/app/drizzle',
      './drizzle',
    ];
    
    let drizzleDir: string | null = null;
    for (const path of possiblePaths) {
      try {
        if (readdirSync(path).length > 0) {
          drizzleDir = path;
          break;
        }
      } catch {
        // Path doesn't exist, try next
      }
    }
    
    if (!drizzleDir) {
      throw new Error('Drizzle migrations directory not found. Tried: ' + possiblePaths.join(', '));
    }
    
    const migrationFiles = readdirSync(drizzleDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      logger.info('   No migration files found');
      return;
    }

    logger.info(`   Found ${migrationFiles.length} migration file(s)`);

    // Create drizzle schema if it doesn't exist
    await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;

    // Check if migrations table exists, create if not
    await sql`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL UNIQUE,
        created_at bigint
      )
    `;

    // Get already applied migrations
    const appliedMigrations = await sql`
      SELECT hash FROM drizzle.__drizzle_migrations
    `;
    const appliedHashes = new Set(appliedMigrations.map((m: { hash: string }) => m.hash));

    // Read journal to get migration metadata
    const journalPath = join(drizzleDir!, 'meta', '_journal.json');
    let journalEntries: Array<{ tag: string; idx: number }> = [];
    
    if (existsSync(journalPath)) {
      try {
        const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
        journalEntries = journal.entries || [];
      } catch (error) {
        logger.warn('Could not read journal file, using filename-based hash');
      }
    }
    
    // Create a map of filename to tag
    const fileToTag = new Map<string, string>();
    for (const entry of journalEntries) {
      const sqlFile = `${String(entry.idx).padStart(4, '0')}_${entry.tag}.sql`;
      fileToTag.set(sqlFile, entry.tag);
    }
    
    // Run each migration
    for (const file of migrationFiles) {
      const filePath = join(drizzleDir!, file);
      const migrationSQL = readFileSync(filePath, 'utf-8');
      
      // Get hash from journal tag or extract from filename
      const hash = fileToTag.get(file) || file.split('_').slice(1, -1).join('_');

      // Check if migration is already applied
      // For migration 0000, always verify it actually completed by checking if key tables exist
      const isAlreadyApplied = appliedHashes.has(hash);
      
      // Special handling for migration 0000 - always verify it completed
      if (file.startsWith('0000_')) {
        // Check if users table exists and count total tables
        const [usersCheck, tableCount] = await Promise.all([
          sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') as exists`,
          sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
        ]);
        
        const usersExists = usersCheck[0]?.exists || false;
        const count = Number(tableCount[0]?.count || 0);
        
        logger.info(`   Migration ${file} - Hash in DB: ${isAlreadyApplied}, Users exists: ${usersExists}, Total tables: ${count}`);
        
        // If hash exists but migration incomplete, delete hash and re-run
        if (isAlreadyApplied && (!usersExists || count < 10)) {
          logger.warn(`   Migration ${file} marked as applied but incomplete. Re-running...`);
          await sql`DELETE FROM drizzle.__drizzle_migrations WHERE hash = ${hash}`;
          appliedHashes.delete(hash);
          logger.info(`   Hash removed, migration will be re-run`);
          // Continue to run the migration below (don't continue here)
        } else if (isAlreadyApplied && usersExists && count >= 10) {
          logger.info(`   ✓ ${file} (already applied and verified - ${count} tables exist)`);
          continue;
        }
        // If hash doesn't exist, continue to run migration below
      } else if (isAlreadyApplied) {
        // For other migrations, just check hash
        logger.info(`   ✓ ${file} (already applied)`);
        continue;
      }

      logger.info(`   Running ${file}...`);

      // Run migration using psql for reliable execution
      // This ensures all SQL statements are executed correctly
      // Prepare SQL content - make CREATE TABLE idempotent
      let sqlContent = migrationSQL
        .replace(/\r\n/g, '\n')  // Normalize Windows line endings
        .replace(/--> statement-breakpoint\n/g, '');  // Remove statement-breakpoint markers
      
      // Make CREATE TABLE statements idempotent by adding IF NOT EXISTS
      sqlContent = sqlContent.replace(/CREATE TABLE\s+("[\w_]+")/gim, (match, tableName) => {
        if (!match.includes('IF NOT EXISTS')) {
          return `CREATE TABLE IF NOT EXISTS ${tableName}`;
        }
        return match;
      });
      
      // Write SQL to temporary file
      const tempFile = `/tmp/migration_${Date.now()}.sql`;
      try {
        const { writeFileSync, unlinkSync } = await import('fs');
        writeFileSync(tempFile, sqlContent);
        
        // Execute using psql
        const dbUrl = config.database.url;
        // Parse connection string to get components
        const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
        if (!urlMatch) {
          throw new Error(`Invalid database URL format: ${dbUrl}`);
        }
        const [, dbUser, dbPassword, dbHost, dbPort, dbName] = urlMatch;
        
        logger.info(`   Executing migration ${file} using psql...`);
        
        // Use PGPASSWORD environment variable for password
        const env = { ...process.env, PGPASSWORD: dbPassword };
        const psqlCommand = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${tempFile}`;
        
        try {
          execSync(psqlCommand, { 
            env,
            stdio: 'pipe',
            encoding: 'utf-8'
          });
          
          // Record migration as successful
          await sql`
            INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
            VALUES (${hash}, ${Date.now()})
            ON CONFLICT (hash) DO NOTHING
          `;
          
          logger.info(`   ✓ ${file} completed successfully`);
        } catch (psqlError: any) {
          // Check if error is "already exists" - that's okay with IF NOT EXISTS
          const errorOutput = psqlError.stdout?.toString() || psqlError.stderr?.toString() || '';
          if (errorOutput.includes('already exists') && sqlContent.includes('IF NOT EXISTS')) {
            logger.warn(`   Migration ${file} had "already exists" warnings, but continuing...`);
            // Still record as successful
            await sql`
              INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
              VALUES (${hash}, ${Date.now()})
              ON CONFLICT (hash) DO NOTHING
            `;
          } else {
            // Delete hash if it exists so migration can be retried
            await sql`DELETE FROM drizzle.__drizzle_migrations WHERE hash = ${hash}`;
            logger.error(`Error executing migration ${file}:`, { 
              error: errorOutput || (psqlError instanceof Error ? psqlError.message : String(psqlError))
            });
            throw psqlError;
          }
        } finally {
          // Clean up temp file
          try {
            unlinkSync(tempFile);
          } catch {
            // Ignore cleanup errors
          }
        }
      } catch (error: any) {
        // If migration fails, delete hash if it exists so migration can be retried
        await sql`DELETE FROM drizzle.__drizzle_migrations WHERE hash = ${hash}`;
        logger.error(`Error executing migration ${file}:`, { 
          error: error instanceof Error ? error.message : String(error),
          code: error?.code
        });
        throw error;
      }

      logger.info(`   ✓ ${file} completed`);
    }

    logger.info('✅ All migrations completed successfully');
    await sql.end();
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migrations if called directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('run-migrations')) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { runMigrations };

