import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import { config } from '../src/config/index.js';

const connectionString = config.database.url;
const client = postgres(connectionString);

async function runMigration(migrationFile: string) {
  const sql = readFileSync(migrationFile, 'utf-8');

  try {
    const fileName = migrationFile.split('/').pop() || migrationFile;
    console.log(`Running migration: ${fileName}`);
    console.log('Connecting to database...');

    // Execute SQL statements
    await client.unsafe(sql);

    console.log(`✅ Migration ${fileName} completed successfully!`);
  } catch (error) {
    console.error(`❌ Migration failed:`, error);
    throw error;
  }
}

async function main() {
  try {
    // Run RBAC tables creation first
    const rbacTablesFile = join(process.cwd(), 'src/db/migrations/0001_create_rbac_tables.sql');
    await runMigration(rbacTablesFile);

    // Then run permissions expansion
    const permissionsExpansionFile = join(
      process.cwd(),
      'src/db/migrations/0002_expand_permissions_table.sql'
    );
    await runMigration(permissionsExpansionFile);

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

