import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for departments and ranks
export const DEPARTMENTS = [
  "HR",
  "Staff Management",
  "Internal Affairs",
  "Professional Development",
  "PR",
  "Engagement and Marketing",
  "Socials",
  "Affiliates",
] as const;

export const SUB_DEPARTMENTS = {
  "HR": ["Recruitment", "Training", "Employee Relations"],
  "Staff Management": ["Performance", "Scheduling", "Operations"],
  "Internal Affairs": ["Compliance", "Investigations", "Quality Assurance"],
  "Professional Development": ["Learning", "Mentorship", "Career Growth"],
  "PR": ["Communications", "Media Relations", "Brand"],
  "Engagement and Marketing": ["Community", "Events", "Campaigns"],
  "Socials": ["Content Creation", "Social Media", "Graphics"],
  "Affiliates": ["Partnerships", "Relations", "Outreach"],
} as const;

export const RANKS = [
  "Supervisor",
  "Manager",
  "Senior Manager",
  "Director",
  "Board of Directors",
  "Executive Board",
] as const;

export const REQUEST_STATUS = ["Pending", "Approved", "Rejected"] as const;

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  robloxUsername: text("roblox_username").notNull().unique(),
  robloxUserId: text("roblox_user_id").notNull().unique(),
  rank: text("rank").notNull(),
  rankId: integer("rank_id").notNull(),
  department: text("department").notNull(),
  subDepartment: text("sub_department").notNull(),
  verifiedAt: timestamp("verified_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  transferRequests: many(transferRequests),
  loaRequests: many(loaRequests),
  notifications: many(notifications),
}));

// Verification codes table
export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  code: text("code").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  used: boolean("used").notNull().default(false),
});

// Transfer requests table
export const transferRequests = pgTable("transfer_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currentDepartment: text("current_department").notNull(),
  currentSubDepartment: text("current_sub_department").notNull(),
  requestedDepartment: text("requested_department").notNull(),
  requestedSubDepartment: text("requested_sub_department").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
});

export const transferRequestsRelations = relations(transferRequests, ({ one }) => ({
  user: one(users, {
    fields: [transferRequests.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [transferRequests.reviewedBy],
    references: [users.id],
  }),
}));

// LOA requests table
export const loaRequests = pgTable("loa_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
});

export const loaRequestsRelations = relations(loaRequests, ({ one }) => ({
  user: one(users, {
    fields: [loaRequests.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [loaRequests.reviewedBy],
    references: [users.id],
  }),
}));

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  type: text("type").notNull(), // "transfer_approved", "transfer_rejected", "loa_approved", "loa_rejected"
  requestId: varchar("request_id").notNull(),
  requestType: text("request_type").notNull(), // "transfer" or "loa"
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  verifiedAt: true,
  lastLogin: true,
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  createdAt: true,
  used: true,
});

export const insertTransferRequestSchema = createInsertSchema(transferRequests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true,
}).extend({
  reason: z.string().optional(),
});

export const insertLoaRequestSchema = createInsertSchema(loaRequests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  read: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;

export type TransferRequest = typeof transferRequests.$inferSelect;
export type InsertTransferRequest = z.infer<typeof insertTransferRequestSchema>;

export type LoaRequest = typeof loaRequests.$inferSelect;
export type InsertLoaRequest = z.infer<typeof insertLoaRequestSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
