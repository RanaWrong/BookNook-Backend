import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectToDatabase } from "./config/db";
import { getAllowedOrigins, getJwtSecret } from "./config/env";
import bookRoutes from "./routes/bookRoutes";
import borrowRoutes from "./routes/borrowRoutes";
import authRoutes from "./routes/authRoutes";

dotenv.config();

// Fail fast: never run with a missing or guessable signing secret.
getJwtSecret();

const app = express();
const port = process.env.PORT || 5000;

app.disable("x-powered-by");

// Middleware
// Browser access is limited to the configured frontend origins. Requests with
// no Origin header (curl, server-to-server) are not subject to CORS. The API
// authenticates with a Bearer header, so cookies/credentials are not enabled.
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || getAllowedOrigins().includes(origin));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "100kb" }));

// Ensure MongoDB connection is initialized before handling routes (works for both local and serverless)
app.use(async (_req: Request, _res: Response, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error("[Database Middleware] Connection error:", error);
    next();
  }
});

// Root endpoint / Health check
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "📚 BookNook Online Library API Server is running smoothly!",
    version: "1.0.0",
    endpoints: {
      books: "/books",
      borrows: "/borrows",
      auth: "/auth/token",
    },
  });
});

// Register required REST routes
app.use("/books", bookRoutes);
app.use("/borrows", borrowRoutes);
app.use("/auth", authRoutes);

// 404 Route Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found on BookNook API server.",
  });
});

// Start Server and Database Connection
async function startServer() {
  try {
    await connectToDatabase();
    app.listen(port, () => {
      console.log(`🚀 BookNook Backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("⚠️ Failed to connect to database on startup:", error);
    console.log("Starting server in standby mode...");
    app.listen(port, () => {
      console.log(`⚠️ BookNook Backend running on http://localhost:${port} (Database standby)`);
    });
  }
}

startServer();

export default app;
