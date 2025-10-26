import {
  users,
  verificationCodes,
  transferRequests,
  loaRequests,
  notifications,
  type User,
  type InsertUser,
  type VerificationCode,
  type InsertVerificationCode,
  type TransferRequest,
  type InsertTransferRequest,
  type LoaRequest,
  type InsertLoaRequest,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByRobloxId(robloxUserId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  // Verification code operations
  createVerificationCode(code: InsertVerificationCode): Promise<VerificationCode>;
  getVerificationCode(code: string): Promise<VerificationCode | undefined>;
  getVerificationCodeByUsername(username: string): Promise<VerificationCode | undefined>;
  markCodeAsUsed(code: string): Promise<void>;

  // Transfer request operations
  createTransferRequest(request: InsertTransferRequest): Promise<TransferRequest>;
  getTransferRequestsByUser(userId: string): Promise<TransferRequest[]>;
  getAllTransferRequests(): Promise<TransferRequest[]>;
  updateTransferRequest(id: string, status: string, reviewedBy: string): Promise<TransferRequest | undefined>;

  // LOA request operations
  createLoaRequest(request: InsertLoaRequest): Promise<LoaRequest>;
  getLoaRequestsByUser(userId: string): Promise<LoaRequest[]>;
  getAllLoaRequests(): Promise<LoaRequest[]>;
  updateLoaRequest(id: string, status: string, reviewedBy: string): Promise<LoaRequest | undefined>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.robloxUsername, username));
    return user || undefined;
  }

  async getUserByRobloxId(robloxUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.robloxUserId, robloxUserId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Verification code operations
  async createVerificationCode(insertCode: InsertVerificationCode): Promise<VerificationCode> {
    const [code] = await db
      .insert(verificationCodes)
      .values(insertCode)
      .returning();
    return code;
  }

  async getVerificationCode(code: string): Promise<VerificationCode | undefined> {
    const [verificationCode] = await db
      .select()
      .from(verificationCodes)
      .where(and(eq(verificationCodes.code, code), eq(verificationCodes.used, false)));
    return verificationCode || undefined;
  }

  async getVerificationCodeByUsername(username: string): Promise<VerificationCode | undefined> {
    const [verificationCode] = await db
      .select()
      .from(verificationCodes)
      .where(and(eq(verificationCodes.username, username), eq(verificationCodes.used, false)))
      .orderBy(desc(verificationCodes.createdAt))
      .limit(1);
    return verificationCode || undefined;
  }

  async markCodeAsUsed(code: string): Promise<void> {
    await db
      .update(verificationCodes)
      .set({ used: true })
      .where(eq(verificationCodes.code, code));
  }

  // Transfer request operations
  async createTransferRequest(insertRequest: InsertTransferRequest): Promise<TransferRequest> {
    const [request] = await db
      .insert(transferRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  async getTransferRequestsByUser(userId: string): Promise<TransferRequest[]> {
    return await db
      .select()
      .from(transferRequests)
      .where(eq(transferRequests.userId, userId))
      .orderBy(desc(transferRequests.createdAt));
  }

  async getAllTransferRequests(): Promise<TransferRequest[]> {
    return await db
      .select()
      .from(transferRequests)
      .orderBy(desc(transferRequests.createdAt));
  }

  async updateTransferRequest(id: string, status: string, reviewedBy: string): Promise<TransferRequest | undefined> {
    const [request] = await db
      .update(transferRequests)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(transferRequests.id, id))
      .returning();
    return request || undefined;
  }

  // LOA request operations
  async createLoaRequest(insertRequest: InsertLoaRequest): Promise<LoaRequest> {
    const [request] = await db
      .insert(loaRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  async getLoaRequestsByUser(userId: string): Promise<LoaRequest[]> {
    return await db
      .select()
      .from(loaRequests)
      .where(eq(loaRequests.userId, userId))
      .orderBy(desc(loaRequests.createdAt));
  }

  async getAllLoaRequests(): Promise<LoaRequest[]> {
    return await db
      .select()
      .from(loaRequests)
      .orderBy(desc(loaRequests.createdAt));
  }

  async updateLoaRequest(id: string, status: string, reviewedBy: string): Promise<LoaRequest | undefined> {
    const [request] = await db
      .update(loaRequests)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(loaRequests.id, id))
      .returning();
    return request || undefined;
  }

  // Notification operations
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
  }
}

export const storage = new DatabaseStorage();
