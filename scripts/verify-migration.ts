import postgres from 'postgres';
import { config } from '../src/config/index.js';

const connectionString = config.database.url;
const client = postgres(connectionString);

async function verifyMigration() {
  try {
    console.log('Verifying migration...\n');

    // Check if permissions table exists and has new columns
    const columns = await client`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'permissions'
      ORDER BY column_name;
    `;

    console.log('Permissions table columns:');
    columns.forEach((col: { column_name: string; data_type: string }) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check indexes
    const indexes = await client`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'permissions';
    `;

    console.log('\nIndexes on permissions table:');
    indexes.forEach((idx: { indexname: string }) => {
      console.log(`  - ${idx.indexname}`);
    });

    // Check if new columns exist
    const hasDescription = columns.some(
      (col: { column_name: string }) => col.column_name === 'description'
    );
    const hasCategory = columns.some(
      (col: { column_name: string }) => col.column_name === 'category'
    );
    const hasUpdatedAt = columns.some(
      (col: { column_name: string }) => col.column_name === 'updated_at'
    );

    console.log('\n✅ Migration verification:');
    console.log(`  - description column: ${hasDescription ? '✅' : '❌'}`);
    console.log(`  - category column: ${hasCategory ? '✅' : '❌'}`);
    console.log(`  - updated_at column: ${hasUpdatedAt ? '✅' : '❌'}`);

    if (hasDescription && hasCategory && hasUpdatedAt) {
      console.log('\n✅ All migration checks passed!');
    } else {
      console.log('\n❌ Some columns are missing!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyMigration();

