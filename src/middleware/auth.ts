import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedUser {
  id?: string;
  email: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const verifyToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No authorization token provided or format is invalid.",
    });
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = process.env.JWT_SECRET || "booknook_jwt_secret_dev_key_2026_xyz";

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthenticatedUser;
    if (!decoded || !decoded.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload. User email missing.",
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Forbidden. Token is invalid or expired.",
    });
  }
};
