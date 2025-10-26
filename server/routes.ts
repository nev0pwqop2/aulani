import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { randomBytes } from "crypto";
import { z } from "zod";
import {
  insertTransferRequestSchema,
  insertLoaRequestSchema,
  DEPARTMENTS,
  SUB_DEPARTMENTS,
} from "@shared/schema";
import * as roblox from "./roblox";

const PgSession = ConnectPgSimple(session);

// Session user interface
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Middleware to check Board of Directors+ rank
async function requireBoardPlus(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user || !["Board of Directors", "Executive Board"].includes(user.rank)) {
    return res.status(403).json({ message: "Forbidden: Board of Directors+ rank required" });
  }

  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  const sessionStore = new PgSession({
    pool,
    tableName: "session",
    createTableIfMissing: true,
    errorLog: console.error.bind(console),
  });

  // Handle session store errors gracefully
  sessionStore.on('error', (error) => {
    console.error('Session store error:', error);
  });

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "roblox-staff-portal-secret-key",
      resave: false,
      saveUninitialized: true, // Changed to true to ensure session is created
      rolling: true,
      proxy: true, // Trust the proxy (Replit uses a proxy)
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
      },
      name: "connect.sid", // Use default session name
    })
  );

  // ========== Authentication Routes ==========

  // Generate verification code
  app.post("/api/auth/generate-code", async (req: Request, res: Response) => {
    try {
      const { username } = req.body;

      if (!username || typeof username !== "string") {
        return res.status(400).json({ message: "Username is required" });
      }

      // Check if username exists on Roblox
      const robloxUser = await roblox.getUserByUsername(username);
      if (!robloxUser) {
        return res.status(404).json({ message: "Roblox user not found" });
      }

      // Verify group membership and rank before generating code
      const rankInfo = await roblox.verifyUserRank(robloxUser.id);
      
      if (!rankInfo.valid) {
        return res.status(403).json({ 
          message: "You are not eligible to access this portal. You must be Supervisor+ rank in group 10260222." 
        });
      }

      // Generate random 8-character code
      const code = randomBytes(4).toString("hex").toUpperCase();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await storage.createVerificationCode({
        username,
        code,
        expiresAt,
      });

      res.json({ code, expiresAt });
    } catch (error) {
      console.error("Generate code error:", error);
      res.status(500).json({ message: "Failed to generate verification code" });
    }
  });

  // Verify user and create session
  app.post("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const { username } = req.body;

      if (!username || typeof username !== "string") {
        return res.status(400).json({ message: "Username is required" });
      }

      // Get Roblox user info
      const robloxUser = await roblox.getUserByUsername(username);
      if (!robloxUser) {
        return res.status(404).json({ message: "Roblox user not found" });
      }

      // Get the most recent verification code for this username
      const verificationCode = await storage.getVerificationCodeByUsername(username);
      
      if (!verificationCode) {
        return res.status(400).json({ message: "No verification code found. Please generate a code first." });
      }

      // Check if code is expired
      if (new Date() > verificationCode.expiresAt) {
        return res.status(400).json({ message: "Verification code has expired. Please generate a new code." });
      }

      // Get user's About Me section
      const aboutMe = await roblox.getUserAboutMe(robloxUser.id);
      
      // Check if verification code appears in About Me
      if (!aboutMe.includes(verificationCode.code)) {
        return res.status(400).json({ 
          message: "Verification code not found in your Roblox About Me section. Please add the code and try again." 
        });
      }

      // Verify group membership and rank
      const rankInfo = await roblox.verifyUserRank(robloxUser.id);
      
      if (!rankInfo.valid) {
        return res.status(403).json({ 
          message: "You must be Supervisor+ rank in group 10260222 to access the portal" 
        });
      }

      // Mark code as used
      await storage.markCodeAsUsed(verificationCode.code);

      // Map rank to standardized name
      const standardizedRank = roblox.mapRankIdToName(rankInfo.rankId || 0);

      // Get or create user
      let user = await storage.getUserByRobloxId(robloxUser.id.toString());
      
      if (user) {
        // Update existing user's last login and rank
        user = await storage.updateUser(user.id, {
          rank: standardizedRank,
          rankId: rankInfo.rankId || 0,
          lastLogin: new Date(),
        });
      } else {
        // Create new user - assign to HR/Recruitment by default
        user = await storage.createUser({
          robloxUsername: robloxUser.username,
          robloxUserId: robloxUser.id.toString(),
          rank: standardizedRank,
          rankId: rankInfo.rankId || 0,
          department: "HR",
          subDepartment: "Recruitment",
        });
      }

      if (!user) {
        return res.status(500).json({ message: "Failed to create user session" });
      }

      // Create session and save it before responding
      req.session.userId = user.id;
      
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      res.json({ success: true, user });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // ========== Transfer Request Routes ==========

  // Get user's transfer requests
  app.get("/api/transfer-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const requests = await storage.getTransferRequestsByUser(req.session.userId!);
      res.json(requests);
    } catch (error) {
      console.error("Get transfer requests error:", error);
      res.status(500).json({ message: "Failed to get transfer requests" });
    }
  });

  // Create transfer request
  app.post("/api/transfer-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTransferRequestSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });

      const request = await storage.createTransferRequest(validatedData);
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Create transfer request error:", error);
      res.status(500).json({ message: "Failed to create transfer request" });
    }
  });

  // ========== LOA Request Routes ==========

  // Get user's LOA requests
  app.get("/api/loa-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const requests = await storage.getLoaRequestsByUser(req.session.userId!);
      res.json(requests);
    } catch (error) {
      console.error("Get LOA requests error:", error);
      res.status(500).json({ message: "Failed to get LOA requests" });
    }
  });

  // Create LOA request
  app.post("/api/loa-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertLoaRequestSchema.parse({
        ...req.body,
        userId: req.session.userId,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      });

      const request = await storage.createLoaRequest(validatedData);
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Create LOA request error:", error);
      res.status(500).json({ message: "Failed to create LOA request" });
    }
  });

  // ========== Notification Routes ==========

  // Get user's notifications
  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.session.userId!);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.markAllNotificationsAsRead(req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // ========== Admin Routes (Board of Directors+ only) ==========

  // Get all transfer requests
  app.get("/api/admin/transfer-requests", requireBoardPlus, async (req: Request, res: Response) => {
    try {
      const requests = await storage.getAllTransferRequests();
      res.json(requests);
    } catch (error) {
      console.error("Get all transfer requests error:", error);
      res.status(500).json({ message: "Failed to get transfer requests" });
    }
  });

  // Update transfer request (approve/reject)
  app.patch("/api/admin/transfer-requests/:id", requireBoardPlus, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;

      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const request = await storage.updateTransferRequest(
        req.params.id,
        status,
        req.session.userId!
      );

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Create notification for user
      await storage.createNotification({
        userId: request.userId,
        message: `Your transfer request has been ${status.toLowerCase()}`,
        type: `transfer_${status.toLowerCase()}`,
        requestId: request.id,
        requestType: "transfer",
      });

      res.json(request);
    } catch (error) {
      console.error("Update transfer request error:", error);
      res.status(500).json({ message: "Failed to update transfer request" });
    }
  });

  // Get all LOA requests
  app.get("/api/admin/loa-requests", requireBoardPlus, async (req: Request, res: Response) => {
    try {
      const requests = await storage.getAllLoaRequests();
      res.json(requests);
    } catch (error) {
      console.error("Get all LOA requests error:", error);
      res.status(500).json({ message: "Failed to get LOA requests" });
    }
  });

  // Update LOA request (approve/reject)
  app.patch("/api/admin/loa-requests/:id", requireBoardPlus, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;

      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const request = await storage.updateLoaRequest(
        req.params.id,
        status,
        req.session.userId!
      );

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Create notification for user
      await storage.createNotification({
        userId: request.userId,
        message: `Your LOA request has been ${status.toLowerCase()}`,
        type: `loa_${status.toLowerCase()}`,
        requestId: request.id,
        requestType: "loa",
      });

      res.json(request);
    } catch (error) {
      console.error("Update LOA request error:", error);
      res.status(500).json({ message: "Failed to update LOA request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
