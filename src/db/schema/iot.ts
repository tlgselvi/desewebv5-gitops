import { pgTable, text, timestamp, boolean, integer, decimal, jsonb, uuid, varchar, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './saas.js';

// IoT Devices (Cihazlar)
export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  serialNumber: varchar('serial_number', { length: 100 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull(), // pool_controller, sensor_hub, camera
  model: varchar('model', { length: 100 }),
  firmwareVersion: varchar('firmware_version', { length: 50 }),
  
  status: varchar('status', { length: 20 }).default('offline'), // online, offline, error, maintenance
  lastSeen: timestamp('last_seen'),
  
  config: jsonb('config'), // Cihaz ayarları (MQTT topic, update interval vs.)
  
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('devices_org_idx').on(table.organizationId),
  serialIdx: index('devices_serial_idx').on(table.serialNumber),
}));

// Telemetry Data (Sensör Verileri)
// Not: Büyük ölçekte TimescaleDB veya InfluxDB kullanılmalı, şimdilik PG içinde tutuyoruz.
export const telemetry = pgTable('telemetry', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  
  // Havuz spesifik veriler (JSONB yerine kolon olarak tutmak daha hızlı sorgu sağlar)
  temperature: decimal('temperature', { precision: 5, scale: 2 }),
  ph: decimal('ph', { precision: 4, scale: 2 }),
  orp: integer('orp'), // mV
  tds: integer('tds'), // ppm
  flowRate: decimal('flow_rate', { precision: 6, scale: 2 }), // L/dk
  
  // Diğer ham veriler
  data: jsonb('data'),
}, (table) => ({
  deviceTimeIdx: index('telemetry_device_time_idx').on(table.deviceId, table.timestamp),
  orgIdx: index('telemetry_org_idx').on(table.organizationId),
}));

// Automation Rules (Otomasyon Kuralları)
export const automationRules = pgTable('automation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  deviceId: uuid('device_id').references(() => devices.id),
  
  name: varchar('name', { length: 255 }).notNull(),
  condition: varchar('condition', { length: 255 }).notNull(), // ph > 7.6
  action: varchar('action', { length: 255 }).notNull(), // activate_pump_ph_minus
  
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('automation_rules_org_idx').on(table.organizationId),
  deviceIdx: index('automation_rules_device_idx').on(table.deviceId),
}));

// Device Alerts (Cihaz Alarmları)
export const deviceAlerts = pgTable('device_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  
  severity: varchar('severity', { length: 20 }).notNull(), // info, warning, critical
  message: text('message').notNull(),
  
  isResolved: boolean('is_resolved').default(false),
  resolvedAt: timestamp('resolved_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('device_alerts_org_idx').on(table.organizationId),
  deviceIdx: index('device_alerts_device_idx').on(table.deviceId),
  resolvedIdx: index('device_alerts_resolved_idx').on(table.isResolved),
}));

// Relations
export const devicesRelations = relations(devices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [devices.organizationId],
    references: [organizations.id],
  }),
  telemetry: many(telemetry),
  rules: many(automationRules),
  alerts: many(deviceAlerts),
}));

export const telemetryRelations = relations(telemetry, ({ one }) => ({
  device: one(devices, {
    fields: [telemetry.deviceId],
    references: [devices.id],
  }),
}));

export const automationRulesRelations = relations(automationRules, ({ one }) => ({
  device: one(devices, {
    fields: [automationRules.deviceId],
    references: [devices.id],
  }),
}));

export const deviceAlertsRelations = relations(deviceAlerts, ({ one }) => ({
  device: one(devices, {
    fields: [deviceAlerts.deviceId],
    references: [devices.id],
  }),
}));

