/**
 * POST /api/user/identify
 *
 * Registers or retrieves a civic portal user.
 * Used by the citizen widget and admin dashboard for session tracking.
 *
 * Body: { email, tenantId, name?, role? }
 *
 * Replaces the old college user identification system.
 * Now scoped to a city tenant instead of a college.
 */

import { Router, Request, Response } from "express";
import { getSupabase } from "../lib/rag/supabase.js";
import { logger } from "../lib/utils/logger.js";
import { IdentifyUserRequest, IdentifyUserResponse } from "../types/index.js";

export const userRouter = Router();

userRouter.post(
  "/identify",
  async (
    req: Request<{}, IdentifyUserResponse, IdentifyUserRequest>,
    res: Response
  ) => {
    try {
      const { email, tenantId, name, role = "citizen" } = req.body;

      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "Bad Request", message: "Email is required", statusCode: 400 });
        return;
      }

      if (!tenantId || typeof tenantId !== "string") {
        res.status(400).json({ error: "Bad Request", message: "tenantId (city) is required", statusCode: 400 });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: "Bad Request", message: "Invalid email format", statusCode: 400 });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      logger.info("Citizen identify request", { email: normalizedEmail, tenantId });

      const supabase = getSupabase();

      // Try to find existing civic user scoped to tenant
      const { data: existingUser, error: findError } = await supabase
        .from("civic_users")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("tenant_id", tenantId)
        .single();

      if (findError && findError.code !== "PGRST116") {
        logger.error("Error finding civic user:", findError);
        throw findError;
      }

      if (existingUser) {
        logger.info("Existing civic user found", { userId: existingUser.id });
        res.json({ userId: existingUser.id, isNew: false });
        return;
      }

      // Create new civic user in the tenant's scope
      const { data: newUser, error: createError } = await supabase
        .from("civic_users")
        .insert({
          email: normalizedEmail,
          name: name || normalizedEmail.split("@")[0],
          tenant_id: tenantId,
          role,
        })
        .select()
        .single();

      if (createError) {
        logger.error("Error creating civic user:", createError);
        throw createError;
      }

      logger.info("New civic user created", { userId: newUser.id, tenantId });
      res.json({ userId: newUser.id, isNew: true });
    } catch (error) {
      logger.error("User identify error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          statusCode: 500,
        });
      }
    }
  }
);
