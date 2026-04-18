import { Router, Request, Response } from "express";
import { getSupabase } from "../lib/rag/supabase.js";
import { logger } from "../lib/utils/logger.js";

const router = Router();

/**
 * POST /register
 * Simple direct Supabase insert for WhatsApp citizen registration form.
 * Bypasses all OpenAI/embedding complexity. Uses SERVICE_ROLE_KEY directly.
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, gender, dob, address, concern } = req.body;

    if (!name || !gender || !dob || !address || !concern) {
      res.status(400).json({ error: "All fields are required." });
      return;
    }

    // Generate a simple unique tracking ID
    const timestamp = Date.now().toString().slice(-5);
    const public_id = `CIV-${timestamp}`;

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("complaints")
      .insert([{
        public_id,
        title: concern.length > 60 ? concern.substring(0, 57) + "..." : concern,
        description: `Citizen Name: ${name}\nGender: ${gender}\nDOB: ${dob}\nAddress: ${address}\n\nComplaint Details:\n${concern}`,
        status: "Filed",
        tenant_id: "32d7a014-ea3c-419e-b26c-e235514deab4", // PCMC tenant UUID
        latitude: 18.6298,
        longitude: 73.7997,
        reports_count: 1,
      }])
      .select()
      .single();

    if (error) {
      logger.error("Supabase insert error:", error);
      res.status(500).json({ error: error.message });
      return;
    }

    logger.info(`✅ New PCMC registration saved: ${public_id}`);
    res.status(201).json({ public_id, complaint: data });

  } catch (err: any) {
    logger.error("Registration route error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export const registerRouter = router;
