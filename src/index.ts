import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectToDatabase } from "./config/db";
import bookRoutes from "./routes/bookRoutes";
import borrowRoutes from "./routes/borrowRoutes";
import authRoutes from "./routes/authRoutes";
import aiRoutes from "./routes/aiRoutes";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      process.env.CLIENT_URL || "",
    ].filter(Boolean),
    credentials: true,
  })
);
app.use(express.json());

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
      ai: "/ai/status",
    },
  });
});

// Register required REST routes
app.use("/books", bookRoutes);
app.use("/borrows", borrowRoutes);
app.use("/auth", authRoutes);
app.use("/ai", aiRoutes);

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

