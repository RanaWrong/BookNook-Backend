import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

const router = Router();

// POST /auth/token - Issues a JWT token for an authenticated user session
router.post("/token", (req: Request, res: Response) => {
  try {
    const { email, name, id } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required to issue a JWT token.",
      });
    }

    const jwtSecret = process.env.JWT_SECRET || "booknook_jwt_secret_dev_key_2026_xyz";
    const payload = {
      id: id || "",
      email: email.trim().toLowerCase(),
      name: name || "BookNook Member",
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: "7d" });

    return res.status(200).json({
      success: true,
      token,
      user: payload,
    });
  } catch (error: any) {
    console.error("[POST /auth/token] Error generating token:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate authorization token.",
      error: error.message,
    });
  }
});

export default router;
