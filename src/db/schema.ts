import { pgTable, serial, text, timestamp, boolean, integer, decimal, jsonb, uuid, varchar, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users and Authentication
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).default('user').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

// SEO Projects
export const seoProjects = pgTable('seo_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  domain: varchar('domain', { length: 255 }).notNull(),
  targetRegion: varchar('target_region', { length: 100 }).default('Türkiye'),
  primaryKeywords: jsonb('primary_keywords').$type<string[]>().notNull(),
  targetDomainAuthority: integer('target_domain_authority').default(50),
  targetCtrIncrease: integer('target_ctr_increase').default(25),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  domainIdx: index('seo_projects_domain_idx').on(table.domain),
  ownerIdx: index('seo_projects_owner_idx').on(table.ownerId),
}));

// Core Web Vitals and Lighthouse Data
export const seoMetrics = pgTable('seo_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => seoProjects.id).notNull(),
  url: text('url').notNull(),
  performance: decimal('performance', { precision: 5, scale: 2 }),
  accessibility: decimal('accessibility', { precision: 5, scale: 2 }),
  bestPractices: decimal('best_practices', { precision: 5, scale: 2 }),
  seo: decimal('seo', { precision: 5, scale: 2 }),
  firstContentfulPaint: decimal('first_contentful_paint', { precision: 10, scale: 2 }),
  largestContentfulPaint: decimal('largest_contentful_paint', { precision: 10, scale: 2 }),
  cumulativeLayoutShift: decimal('cumulative_layout_shift', { precision: 10, scale: 4 }),
  firstInputDelay: decimal('first_input_delay', { precision: 10, scale: 2 }),
  totalBlockingTime: decimal('total_blocking_time', { precision: 10, scale: 2 }),
  speedIndex: decimal('speed_index', { precision: 10, scale: 2 }),
  timeToInteractive: decimal('time_to_interactive', { precision: 10, scale: 2 }),
  rawData: jsonb('raw_data'),
  measuredAt: timestamp('measured_at').defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('seo_metrics_project_idx').on(table.projectId),
  urlIdx: index('seo_metrics_url_idx').on(table.url),
  measuredAtIdx: index('seo_metrics_measured_at_idx').on(table.measuredAt),
}));

// Content Management
export const contentTemplates = pgTable('content_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'landing_page', 'blog_post', 'service_page'
  template: text('template').notNull(),
  variables: jsonb('variables').$type<Record<string, any>>(),
  eEatScore: decimal('e_eat_score', { precision: 3, scale: 2 }),
  qualityThreshold: decimal('quality_threshold', { precision: 3, scale: 2 }).default('0.8'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const generatedContent = pgTable('generated_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => seoProjects.id).notNull(),
  templateId: uuid('template_id').references(() => contentTemplates.id),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  contentType: varchar('content_type', { length: 50 }).notNull(),
  url: text('url'),
  keywords: jsonb('keywords').$type<string[]>(),
  eEatScore: decimal('e_eat_score', { precision: 3, scale: 2 }),
  qualityScore: decimal('quality_score', { precision: 3, scale: 2 }),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('generated_content_project_idx').on(table.projectId),
  contentTypeIdx: index('generated_content_type_idx').on(table.contentType),
  statusIdx: index('generated_content_status_idx').on(table.status),
}));

// Local SEO Management
export const localSeoProfiles = pgTable('local_seo_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => seoProjects.id).notNull(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  googleBusinessId: varchar('google_business_id', { length: 100 }),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  businessHours: jsonb('business_hours'),
  categories: jsonb('categories').$type<string[]>(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('local_seo_profiles_project_idx').on(table.projectId),
  googleBusinessIdx: index('local_seo_profiles_google_business_idx').on(table.googleBusinessId),
}));

export const localSeoReviews = pgTable('local_seo_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').references(() => localSeoProfiles.id).notNull(),
  reviewId: varchar('review_id', { length: 100 }).notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  rating: integer('rating').notNull(),
  content: text('content'),
  platform: varchar('platform', { length: 50 }).notNull(),
  reviewUrl: text('review_url'),
  isPositive: boolean('is_positive'),
  sentiment: varchar('sentiment', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  profileIdx: index('local_seo_reviews_profile_idx').on(table.profileId),
  reviewIdIdx: uniqueIndex('local_seo_reviews_review_id_idx').on(table.reviewId),
}));

// Link Building
export const backlinkTargets = pgTable('backlink_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => seoProjects.id).notNull(),
  domain: varchar('domain', { length: 255 }).notNull(),
  url: text('url').notNull(),
  domainRating: integer('domain_rating'),
  spamScore: integer('spam_score'),
  trafficValue: decimal('traffic_value', { precision: 10, scale: 2 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactForm: text('contact_form'),
  outreachStatus: varchar('outreach_status', { length: 50 }).default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('backlink_targets_project_idx').on(table.projectId),
  domainRatingIdx: index('backlink_targets_domain_rating_idx').on(table.domainRating),
  outreachStatusIdx: index('backlink_targets_outreach_status_idx').on(table.outreachStatus),
}));

export const backlinkCampaigns = pgTable('backlink_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => seoProjects.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  targetCount: integer('target_count').default(100),
  minDrThreshold: integer('min_dr_threshold').default(50),
  maxSpamScore: integer('max_spam_score').default(5),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('backlink_campaigns_project_idx').on(table.projectId),
  statusIdx: index('backlink_campaigns_status_idx').on(table.status),
}));

// SEO Monitoring and Anomaly Detection
export const seoAlerts = pgTable('seo_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => seoProjects.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'ranking_drop', 'traffic_spike', 'penalty', 'technical_issue'
  severity: varchar('severity', { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  data: jsonb('data'),
  isResolved: boolean('is_resolved').default(false).notNull(),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('seo_alerts_project_idx').on(table.projectId),
  typeIdx: index('seo_alerts_type_idx').on(table.type),
  severityIdx: index('seo_alerts_severity_idx').on(table.severity),
  isResolvedIdx: index('seo_alerts_resolved_idx').on(table.isResolved),
}));

// Sprint Management
export const seoSprints = pgTable('seo_sprints', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => seoProjects.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phase: varchar('phase', { length: 50 }).notNull(), // 'visibility', 'authority', 'top_rank'
  sprintNumber: integer('sprint_number').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  goals: jsonb('goals').$type<string[]>(),
  tasks: jsonb('tasks').$type<Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assignee?: string;
  }>>(),
  status: varchar('status', { length: 50 }).default('planning').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('seo_sprints_project_idx').on(table.projectId),
  phaseIdx: index('seo_sprints_phase_idx').on(table.phase),
  sprintNumberIdx: index('seo_sprints_number_idx').on(table.sprintNumber),
}));

// Analytics and Reporting
export const seoReports = pgTable('seo_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => seoProjects.id).notNull(),
  reportType: varchar('report_type', { length: 50 }).notNull(), // 'weekly', 'monthly', 'sprint', 'custom'
  period: varchar('period', { length: 50 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  data: jsonb('data').notNull(),
  insights: text('insights'),
  recommendations: text('recommendations'),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  generatedBy: uuid('generated_by').references(() => users.id),
}, (table) => ({
  projectIdx: index('seo_reports_project_idx').on(table.projectId),
  reportTypeIdx: index('seo_reports_type_idx').on(table.reportType),
  generatedAtIdx: index('seo_reports_generated_at_idx').on(table.generatedAt),
}));

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  seoProjects: many(seoProjects),
  resolvedAlerts: many(seoAlerts),
  generatedReports: many(seoReports),
}));

export const seoProjectsRelations = relations(seoProjects, ({ one, many }) => ({
  owner: one(users, {
    fields: [seoProjects.ownerId],
    references: [users.id],
  }),
  metrics: many(seoMetrics),
  content: many(generatedContent),
  localSeoProfiles: many(localSeoProfiles),
  backlinkTargets: many(backlinkTargets),
  backlinkCampaigns: many(backlinkCampaigns),
  alerts: many(seoAlerts),
  sprints: many(seoSprints),
  reports: many(seoReports),
}));

export const seoMetricsRelations = relations(seoMetrics, ({ one }) => ({
  project: one(seoProjects, {
    fields: [seoMetrics.projectId],
    references: [seoProjects.id],
  }),
}));

export const contentTemplatesRelations = relations(contentTemplates, ({ many }) => ({
  generatedContent: many(generatedContent),
}));

export const generatedContentRelations = relations(generatedContent, ({ one }) => ({
  project: one(seoProjects, {
    fields: [generatedContent.projectId],
    references: [seoProjects.id],
  }),
  template: one(contentTemplates, {
    fields: [generatedContent.templateId],
    references: [contentTemplates.id],
  }),
}));

export const localSeoProfilesRelations = relations(localSeoProfiles, ({ one, many }) => ({
  project: one(seoProjects, {
    fields: [localSeoProfiles.projectId],
    references: [seoProjects.id],
  }),
  reviews: many(localSeoReviews),
}));

export const localSeoReviewsRelations = relations(localSeoReviews, ({ one }) => ({
  profile: one(localSeoProfiles, {
    fields: [localSeoReviews.profileId],
    references: [localSeoProfiles.id],
  }),
}));

export const backlinkTargetsRelations = relations(backlinkTargets, ({ one }) => ({
  project: one(seoProjects, {
    fields: [backlinkTargets.projectId],
    references: [seoProjects.id],
  }),
}));

export const backlinkCampaignsRelations = relations(backlinkCampaigns, ({ one }) => ({
  project: one(seoProjects, {
    fields: [backlinkCampaigns.projectId],
    references: [seoProjects.id],
  }),
}));

export const seoAlertsRelations = relations(seoAlerts, ({ one }) => ({
  project: one(seoProjects, {
    fields: [seoAlerts.projectId],
    references: [seoProjects.id],
  }),
  resolvedBy: one(users, {
    fields: [seoAlerts.resolvedBy],
    references: [users.id],
  }),
}));

export const seoSprintsRelations = relations(seoSprints, ({ one }) => ({
  project: one(seoProjects, {
    fields: [seoSprints.projectId],
    references: [seoProjects.id],
  }),
}));

export const seoReportsRelations = relations(seoReports, ({ one }) => ({
  project: one(seoProjects, {
    fields: [seoReports.projectId],
    references: [seoProjects.id],
  }),
  generatedBy: one(users, {
    fields: [seoReports.generatedBy],
    references: [users.id],
  }),
}));

// Audit Logging
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(), // 'login', 'create_project', 'delete_content', etc.
  resourceType: varchar('resource_type', { length: 50 }), // 'project', 'content', 'user', etc.
  resourceId: uuid('resource_id'), // ID of the affected resource
  method: varchar('method', { length: 10 }), // HTTP method
  endpoint: text('endpoint'), // API endpoint
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
  userAgent: text('user_agent'),
  statusCode: integer('status_code'),
  success: boolean('success').default(true).notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>(), // Additional context
  errorMessage: text('error_message'), // Error message if action failed
  duration: integer('duration'), // Request duration in milliseconds
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  resourceTypeIdx: index('audit_logs_resource_type_idx').on(table.resourceType),
  resourceIdIdx: index('audit_logs_resource_id_idx').on(table.resourceId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  successIdx: index('audit_logs_success_idx').on(table.success),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));