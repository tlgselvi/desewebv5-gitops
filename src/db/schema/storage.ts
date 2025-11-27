import { pgTable, uuid, varchar, text, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './saas/core.js';

/**
 * Files table for storing file metadata
 * Supports both local storage and S3-compatible storage
 */
export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    filename: varchar('filename', { length: 255 }).notNull(),
    originalFilename: varchar('original_filename', { length: 255 }),
    mimeType: varchar('mime_type', { length: 100 }),
    size: integer('size').notNull(), // Size in bytes
    path: text('path'), // Local path (for backward compatibility)
    category: varchar('category', { length: 50 }).default('documents'), // documents, images, exports, etc.
    
    // S3 storage fields
    storageProvider: varchar('storage_provider', { length: 20 }).default('local'), // local, s3, minio, digitalocean
    storageKey: text('storage_key'), // S3 key/path
    storageUrl: text('storage_url'), // Public or CDN URL
    
    // Metadata
    metadata: text('metadata'), // JSON string for additional metadata
    description: text('description'),
    
    // Access control
    isPublic: boolean('is_public').default(false),
    
    // Soft delete
    deletedAt: timestamp('deleted_at'),
    
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index('files_organization_idx').on(table.organizationId),
    categoryIdx: index('files_category_idx').on(table.category),
    storageProviderIdx: index('files_storage_provider_idx').on(table.storageProvider),
    deletedAtIdx: index('files_deleted_at_idx').on(table.deletedAt),
  })
);

export const filesRelations = relations(files, ({ one }) => ({
  organization: one(organizations, {
    fields: [files.organizationId],
    references: [organizations.id],
  }),
}));

