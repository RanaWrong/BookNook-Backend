import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dns from "node:dns";

dotenv.config();

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/booknook";
const dbName = process.env.DB_NAME || "booknook";

const sampleBooks = [
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    category: "Fiction",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800",
    description: "The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it.",
    totalCopies: 5,
    availableCopies: 5,
    userEmail: "librarian@booknook.com",
    userName: "BookNook Head Librarian",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6), // 6 days ago
  },
  {
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    category: "Science",
    image: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?auto=format&fit=crop&q=80&w=800",
    description: "A landmark volume in science writing by one of the great minds of modern times exploring black holes and cosmology.",
    totalCopies: 3,
    availableCopies: 3,
    userEmail: "librarian@booknook.com",
    userName: "BookNook Head Librarian",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
  {
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    category: "History",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800",
    description: "Explores how biology and history have defined humanity and enhanced our understanding of what it means to be human.",
    totalCopies: 4,
    availableCopies: 4,
    userEmail: "librarian@booknook.com",
    userName: "BookNook Head Librarian",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
  },
  {
    title: "The Little Prince",
    author: "Antoine de Saint-Exupéry",
    category: "Kids",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800",
    description: "A poetic tale about a young prince who visits various planets in space, addressing themes of loneliness, friendship, love, and loss.",
    totalCopies: 6,
    availableCopies: 6,
    userEmail: "librarian@booknook.com",
    userName: "BookNook Head Librarian",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  {
    title: "Cosmos",
    author: "Carl Sagan",
    category: "Science",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800",
    description: "The story of fifteen billion years of cosmic evolution transforming matter into consciousness.",
    totalCopies: 4,
    availableCopies: 4,
    userEmail: "librarian@booknook.com",
    userName: "BookNook Head Librarian",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    title: "1984",
    author: "George Orwell",
    category: "Fiction",
    image: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=800",
    description: "A chilling dystopian tale of totalitarian regime surveillance and personal liberty under Big Brother.",
    totalCopies: 5,
    availableCopies: 5,
    userEmail: "librarian@booknook.com",
    userName: "BookNook Head Librarian",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
  },
  {
    title: "Guns, Germs, and Steel",
    author: "Jared Diamond",
    category: "History",
    image: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=800",
    description: "Examines geographical and environmental factors shaping the modern world's civilizations and inequalities.",
    totalCopies: 3,
    availableCopies: 3,
    userEmail: "librarian@booknook.com",
    userName: "BookNook Head Librarian",
    createdAt: new Date(),
  },
];

async function seed() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const booksCollection = db.collection("books");

    const count = await booksCollection.countDocuments();
    if (count === 0) {
      const res = await booksCollection.insertMany(sampleBooks as any);
      console.log(`✅ Seeded ${res.insertedCount} sample books successfully into '${dbName}'.`);
    } else {
      console.log(`ℹ️ Books collection already contains ${count} records. Skipping seed.`);
    }
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await client.close();
  }
}

seed();

