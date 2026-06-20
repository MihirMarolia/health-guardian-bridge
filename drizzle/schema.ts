import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with healthcare-specific fields for clinicians and specialists.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "physician", "specialist"]).default("specialist").notNull(),
  licenseNumber: varchar("licenseNumber", { length: 100 }).unique(),
  twoFactorEnabled: boolean("twoFactorEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  roleIdx: index("role_idx").on(table.role),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Patient table with encrypted sensitive fields.
 * health_card_hash: Hashed (NOT plain text) for privacy
 * encrypted_name: App-level encryption required
 */
export const patients = mysqlTable("patients", {
  id: varchar("id", { length: 36 }).primaryKey(),
  healthCardHash: varchar("healthCardHash", { length: 255 }).notNull().unique(),
  encryptedName: text("encryptedName").notNull(),
  dob: timestamp("dob").notNull(),
  primaryPhysicianId: int("primaryPhysicianId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  physicianIdx: index("physician_idx").on(table.primaryPhysicianId),
}));

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

/**
 * ServiceRequest (Referrals) table with encryption and AI confidence tracking.
 * clinical_notes: Encrypted at app level before storage
 * ai_confidence_score: Tracks AI reasoning quality for audit
 */
export const serviceRequests = mysqlTable("serviceRequests", {
  id: varchar("id", { length: 36 }).primaryKey(),
  patientId: varchar("patientId", { length: 36 }).notNull(),
  requesterId: int("requesterId").notNull(),
  specialistDomain: varchar("specialistDomain", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["draft", "pending", "accepted", "completed"]).default("draft").notNull(),
  encryptedClinicalNotes: text("encryptedClinicalNotes").notNull(),
  aiConfidenceScore: decimal("aiConfidenceScore", { precision: 3, scale: 2 }),
  aiReasoningJson: text("aiReasoningJson"), // JSON string for explainability
  verifiedByPhysician: boolean("verifiedByPhysician").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  patientIdx: index("patient_referral_idx").on(table.patientId),
  statusIdx: index("status_idx").on(table.status),
}));

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = typeof serviceRequests.$inferInsert;

/**
 * Observation (Labs) table for tracking test results.
 */
export const observations = mysqlTable("observations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  patientId: varchar("patientId", { length: 36 }).notNull(),
  testType: varchar("testType", { length: 100 }).notNull(),
  resultValue: text("resultValue"),
  status: mysqlEnum("status", ["ordered", "resulted"]).default("ordered").notNull(),
  orderedDate: timestamp("orderedDate").notNull(),
  resultedDate: timestamp("resultedDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  patientIdx: index("patient_obs_idx").on(table.patientId),
  statusIdx: index("obs_status_idx").on(table.status),
}));

export type Observation = typeof observations.$inferSelect;
export type InsertObservation = typeof observations.$inferInsert;

/**
 * AuditLog table for PIPEDA/PHIPA compliance.
 * Tracks every critical action: view, create, update, delete.
 * ip_address: For security audit trails
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  actorId: int("actorId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resourceType", { length: 50 }).notNull(),
  resourceId: varchar("resourceId", { length: 36 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  details: text("details"), // JSON string for additional context
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  actorIdx: index("actor_idx").on(table.actorId),
  resourceIdx: index("resource_idx").on(table.resourceType, table.resourceId),
  timestampIdx: index("timestamp_idx").on(table.timestamp),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Timeline events for patient care journey tracking.
 */
export const timelineEvents = mysqlTable("timelineEvents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  patientId: varchar("patientId", { length: 36 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  patientIdx: index("patient_timeline_idx").on(table.patientId),
  typeIdx: index("type_idx").on(table.type),
}));

export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type InsertTimelineEvent = typeof timelineEvents.$inferInsert;
