import { defineConfig } from 'drizzle-kit';

// güvenli config yüklemesi ve normalize etme
// eslint-disable-next-line @typescript-eslint/no-var-requires
const _raw = require('./src/config/index.ts');
const appConfig = _raw?.default ?? _raw?.config ?? _raw;

if (!appConfig || !appConfig.database) {
  throw new Error(
    'Drizzle migration: appConfig.database not found. Loaded config keys: ' +
      JSON.stringify(Object.keys(appConfig ?? {})),
  );
}

// güvenli erişim örneği kullan
const connectionString = appConfig.database?.url ?? appConfig.database?.connectionString;
if (!connectionString) {
  throw new Error('Drizzle migration: database connection URL not defined on appConfig.database');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
});
