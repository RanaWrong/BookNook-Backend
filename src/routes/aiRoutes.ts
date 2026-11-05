import { Router, Request, Response } from "express";
import { testAiConnection, generateEmbedding } from "../services/aiService";

const router = Router();

// GET /ai/status - Verifies connection to ai.mongodb.com with the configured Model API Key
router.get("/status", async (_req: Request, res: Response) => {
  const result = await testAiConnection();
  if (result.success) {
    return res.status(200).json({
      success: true,
      endpoint: process.env.MONGODB_AI_ENDPOINT || "https://ai.mongodb.com",
      model: result.model,
      message: result.message,
    });
  } else {
    return res.status(502).json({
      success: false,
      endpoint: process.env.MONGODB_AI_ENDPOINT || "https://ai.mongodb.com",
      message: result.message,
    });
  }
});

// POST /ai/embed - Generates text embeddings via ai.mongodb.com
router.post("/embed", async (req: Request, res: Response) => {
  try {
    const { text, model } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid 'text' string is required in the request body.",
      });
    }

    const embedding = await generateEmbedding(text, model || "voyage-4-large");
    return res.status(200).json({
      success: true,
      dimensions: embedding.length,
      model: model || "voyage-4-large",
      embeddingSample: embedding.slice(0, 5),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;

