import { defineConfig } from 'drizzle-kit';
// Note: drizzle-kit runs in CJS context, so we can't use path aliases
// We'll use environment variables directly
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dese_ea_plan_v5';

export default defineConfig({
  schema: ['./src/db/schema.ts', './src/db/schema/rbac.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
});
