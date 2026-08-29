import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

/** All Documenta records are scoped by user_id; routes must never query by id alone. */
export const documentaDocuments = pgTable("documenta_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  source: text("source").notNull().default("local_ocr"),
  cloudOptIn: boolean("cloud_opt_in").notNull().default(false),
  status: text("status").notNull().default("ready"),
  ...timestamps,
}, (table) => [index("documenta_documents_user_created_idx").on(table.userId, table.createdAt)]);

export const documentaPages = pgTable("documenta_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").notNull().references(() => documentaDocuments.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  pageNumber: integer("page_number").notNull(),
  ocrText: text("ocr_text").notNull(),
  ocrProvider: text("ocr_provider").notNull().default("local"),
  ocrState: text("ocr_state").notNull().default("COMPLETE"),
  ...timestamps,
}, (table) => [index("documenta_pages_user_document_idx").on(table.userId, table.documentId)]);

export const documentaIntelligence = pgTable("documenta_intelligence", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").notNull().references(() => documentaDocuments.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  family: text("family").notNull(),
  type: text("type").notNull(),
  subtype: text("subtype"),
  purpose: text("purpose"),
  summary: text("summary"),
  confidence: real("confidence").notNull(),
  validationState: text("validation_state").notNull(),
  extraction: jsonb("extraction").notNull().default({}),
  model: text("model"),
  ...timestamps,
}, (table) => [index("documenta_intelligence_user_document_idx").on(table.userId, table.documentId)]);

export const documentaEvidence = pgTable("documenta_evidence", {
  id: uuid("id").defaultRandom().primaryKey(),
  intelligenceId: uuid("intelligence_id").notNull().references(() => documentaIntelligence.id, { onDelete: "cascade" }),
  documentId: uuid("document_id").notNull().references(() => documentaDocuments.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  field: text("field").notNull(),
  value: text("value").notNull(),
  pageNumber: integer("page_number").notNull(),
  startOffset: integer("start_offset").notNull(),
  endOffset: integer("end_offset").notNull(),
  confidence: real("confidence").notNull(),
  validationState: text("validation_state").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("documenta_evidence_user_document_idx").on(table.userId, table.documentId)]);

export const documentaValidationRecords = pgTable("documenta_validation_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  intelligenceId: uuid("intelligence_id").notNull().references(() => documentaIntelligence.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  field: text("field").notNull(),
  state: text("state").notNull(),
  rule: text("rule").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("documenta_validations_user_intelligence_idx").on(table.userId, table.intelligenceId)]);

export const documentaCorrections = pgTable("documenta_corrections", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").notNull().references(() => documentaDocuments.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  field: text("field").notNull(),
  previousValue: text("previous_value"),
  correctedValue: text("corrected_value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("documenta_corrections_user_document_idx").on(table.userId, table.documentId)]);

export const documentaRelations = pgTable("documenta_relations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  fromDocumentId: uuid("from_document_id").notNull().references(() => documentaDocuments.id, { onDelete: "cascade" }),
  toDocumentId: uuid("to_document_id").notNull().references(() => documentaDocuments.id, { onDelete: "cascade" }),
  relationType: text("relation_type").notNull(),
  confidence: real("confidence").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("documenta_relations_user_from_idx").on(table.userId, table.fromDocumentId)]);

export const documentaUsage = pgTable("documenta_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  day: text("day").notNull(),
  month: text("month").notNull(),
  requestCount: integer("request_count").notNull().default(0),
  proRequestCount: integer("pro_request_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("documenta_usage_user_day_unique").on(table.userId, table.day), index("documenta_usage_user_month_idx").on(table.userId, table.month)]);

export const documentaAuditEvents = pgTable("documenta_audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  documentId: uuid("document_id").references(() => documentaDocuments.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  provider: text("provider"),
  model: text("model"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("documenta_audit_user_created_idx").on(table.userId, table.createdAt)]);

export const documentaProviderUsage = pgTable("documenta_provider_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  operationId: text("operation_id").notNull(),
  state: text("state").notNull(),
  inputPages: integer("input_pages").notNull().default(0),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  estimatedEur: real("estimated_eur").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("documenta_provider_usage_operation_unique").on(table.userId, table.operationId),
  index("documenta_provider_usage_user_created_idx").on(table.userId, table.createdAt),
  index("documenta_provider_usage_user_provider_state_idx").on(table.userId, table.provider, table.state),
]);

export const documentaSessionIssuance = pgTable("documenta_session_issuance", {
  id: uuid("id").defaultRandom().primaryKey(),
  ipHash: text("ip_hash").notNull(),
  installationHash: text("installation_hash").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("documenta_session_ip_issued_idx").on(table.ipHash, table.issuedAt),
  index("documenta_session_install_issued_idx").on(table.installationHash, table.issuedAt),
  index("documenta_session_expiry_idx").on(table.expiresAt),
]);

export const documentaBatchJobs = pgTable("documenta_batch_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("PENDING"),
  totalPages: integer("total_pages").notNull(),
  completedPages: integer("completed_pages").notNull().default(0),
  failedPages: integer("failed_pages").notNull().default(0),
  nextCursor: integer("next_cursor").notNull().default(0),
  cloudOptIn: boolean("cloud_opt_in").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("documenta_batch_jobs_user_created_idx").on(table.userId, table.createdAt)]);

export const documentaBatchPages = pgTable("documenta_batch_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id").notNull().references(() => documentaBatchJobs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  pageNumber: integer("page_number").notNull(),
  status: text("status").notNull().default("PENDING"),
  ocrText: text("ocr_text"),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("documenta_batch_pages_user_job_page_idx").on(table.userId, table.jobId, table.pageNumber)]);

export const documentaDocumentRelations = relations(documentaDocuments, ({ many }) => ({
  pages: many(documentaPages),
  intelligence: many(documentaIntelligence),
}));
export const documentaPageRelations = relations(documentaPages, ({ one }) => ({ document: one(documentaDocuments, { fields: [documentaPages.documentId], references: [documentaDocuments.id] }) }));

export const insertDocumentaDocumentSchema = createInsertSchema(documentaDocuments);
export const insertDocumentaPageSchema = createInsertSchema(documentaPages);
export type DocumentaDocument = typeof documentaDocuments.$inferSelect;
export type DocumentaIntelligence = typeof documentaIntelligence.$inferSelect;
export type DocumentaEvidence = typeof documentaEvidence.$inferSelect;
export type DocumentaCorrection = typeof documentaCorrections.$inferSelect;
export type DocumentaRelation = typeof documentaRelations.$inferSelect;
export type DocumentaUsage = typeof documentaUsage.$inferSelect;
export type DocumentaAuditEvent = typeof documentaAuditEvents.$inferSelect;
export const documentaExtractionSchema = z.record(z.string(), z.unknown());