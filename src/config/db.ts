import { MongoClient, Db, Collection } from "mongodb";
import dotenv from "dotenv";
import dns from "node:dns";

dotenv.config();

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in environments where setServers is restricted
}

function getSanitizedMongoUri(): string {
  let raw = process.env.MONGODB_URI || "";
  // Strip surrounding quotes (" or ') and leading/trailing whitespace
  raw = raw.trim().replace(/^["']|["']$/g, "").trim();

  // If user pasted without scheme prefix but provided host/cluster address
  if (raw && !raw.startsWith("mongodb://") && !raw.startsWith("mongodb+srv://")) {
    if (raw.includes(".mongodb.net") || raw.includes("@")) {
      raw = `mongodb+srv://${raw}`;
    }
  }

  return raw || "mongodb://localhost:27017/booknook";
}

let client: MongoClient | null = null;
let db: Db | null = null;

export interface BookDocument {
  _id?: any;
  title: string;
  author: string;
  category: "Fiction" | "Science" | "History" | "Kids" | "Others";
  image: string;
  description: string;
  totalCopies: number;
  availableCopies: number;
  userEmail: string;
  userName: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface BorrowDocument {
  _id?: any;
  bookId: string;
  bookTitle: string;
  bookImage: string;
  userEmail: string;
  userName: string;
  borrowDate: string;
  returnDate: string;
  status: "borrowed" | "returned";
  createdAt: Date;
  returnedAt?: Date;
}

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  const uri = getSanitizedMongoUri();
  const dbName = process.env.DB_NAME || "booknook";

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log(`[Database] Connected successfully to MongoDB (${dbName})`);
    return db;
  } catch (error) {
    console.error("[Database] Connection failed:", error);
    throw error;
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error("[Database] Database not initialized. Call connectToDatabase first.");
  }
  return db;
}

export function getBooksCollection(): Collection<BookDocument> {
  return getDatabase().collection<BookDocument>("books");
}

export function getBorrowsCollection(): Collection<BorrowDocument> {
  return getDatabase().collection<BorrowDocument>("borrows");
}

