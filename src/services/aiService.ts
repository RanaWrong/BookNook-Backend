import dotenv from "dotenv";

dotenv.config();

const AI_ENDPOINT = process.env.MONGODB_AI_ENDPOINT || "https://ai.mongodb.com";
const MODEL_API_KEY = process.env.MONGODB_MODEL_API_KEY;

export interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[] | string;
    index: number;
  }>;
  model: string;
  usage?: {
    total_tokens: number;
  };
}

/**
 * Generate semantic vector embeddings using MongoDB Atlas Model API (ai.mongodb.com)
 */
export async function generateEmbedding(text: string, model: string = "voyage-4-large"): Promise<number[]> {
  if (!MODEL_API_KEY) {
    throw new Error("MONGODB_MODEL_API_KEY is not configured in .env");
  }

  const endpoint = `${AI_ENDPOINT.replace(/\/$/, "")}/v1/embeddings`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MODEL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: [text],
      model,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MongoDB AI Model API request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as EmbeddingResponse;

  if (!data?.data?.[0]?.embedding) {
    throw new Error("Invalid embedding response received from ai.mongodb.com");
  }

  const embeddingData = data.data[0].embedding;

  // Normalize embedding if returned as space-separated string or array
  if (typeof embeddingData === "string") {
    return embeddingData.trim().split(/\s+/).map(Number);
  }

  return embeddingData as number[];
}

/**
 * Health check & verification for MongoDB AI endpoint and Model API Key
 */
export async function testAiConnection(): Promise<{ success: boolean; model: string; message: string }> {
  try {
    const embedding = await generateEmbedding("BookNook online library test", "voyage-4-large");
    return {
      success: true,
      model: "voyage-4-large",
      message: `Successfully connected to ai.mongodb.com! Generated embedding vector (${embedding.length} dimensions).`,
    };
  } catch (err: any) {
    return {
      success: false,
      model: "voyage-4-large",
      message: err.message,
    };
  }
}
