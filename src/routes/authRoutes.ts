import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getDatabase } from "../config/db";
import { getJwtSecret } from "../config/env";
import { resolveSessionUser } from "../services/sessionAuth";

const router = Router();

// POST /auth/token - Exchanges a verified login session for an API JWT.
// Body: { sessionToken } from the frontend's BetterAuth session. Identity is
// read from the database, never from the request body.
router.post("/token", async (req: Request, res: Response) => {
  const sessionToken = req.body?.sessionToken;
  if (typeof sessionToken !== "string" || sessionToken === "") {
    return res.status(400).json({
      success: false,
      message: "sessionToken is required.",
    });
  }

  try {
    const user = await resolveSessionUser(getDatabase(), sessionToken);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session. Please log in again.",
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      getJwtSecret(),
      { algorithm: "HS256", expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error("[POST /auth/token] Error generating token:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate authorization token.",
    });
  }
});

export default router;
