import { defineConfig } from 'drizzle-kit';

// Docker environment için basit config
const isDocker = process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV === 'true';

const connectionString = isDocker 
  ? 'postgresql://dese:dese123@db:5432/dese_ea_plan_v5'
  : 'postgresql://dese:dese123@localhost:5432/dese_ea_plan_v5';

export default defineConfig({
  // Use glob pattern to include all schema files directly
  // This avoids issues with ESM .js imports in index files during migration generation
  schema: './src/db/schema/**/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
});
