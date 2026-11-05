# BookNook Server – Online Library Backend API

BookNook Backend is a high-performance RESTful API service built with **Express.js**, **TypeScript**, and **MongoDB Native Driver**, featuring **JWT authentication and authorization**.

---

## 🚀 Key Features

- **8 Standard REST Endpoints**: Full CRUD for books and borrow lifecycle operations.
- **JWT Protection Middleware**: Secure token validation on private endpoints (`POST /books`, `PATCH /books/:id`, `DELETE /books/:id`, `POST /borrows`, `GET /borrows`, `DELETE /borrows/:id`).
- **Atomic Stock Management ($inc)**: Decrements available copies on borrow and increments on return using MongoDB `$inc`.
- **Double-Borrow Prevention**: Blocks multiple concurrent borrows of the same title by the same user.
- **Ownership Verification**: Enforces that users can only modify or delete their own added books.

---

## 🛠️ Tech Stack

- **Runtime & Framework**: Node.js, Express.js
- **Language**: TypeScript
- **Database**: MongoDB (Native Driver)
- **Security**: JSON Web Tokens (`jsonwebtoken`), CORS, Dotenv

---

## 📋 API Endpoints

| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/books` | Public | List all books (supports `category`, `sort=newest`, `limit=6`, `search`) |
| `GET` | `/books/:id` | Public | Retrieve single book details by ID |
| `POST` | `/books` | **JWT** | Add a new book (with `totalCopies` & `availableCopies`) |
| `PATCH` | `/books/:id` | **JWT (Owner)** | Update book details (creator only) |
| `DELETE` | `/books/:id` | **JWT (Owner)** | Remove book from catalog (creator only) |
| `POST` | `/borrows` | **JWT** | Borrow a book (atomically decrements copy, checks double borrow) |
| `GET` | `/borrows` | **JWT** | Get all active borrows for authenticated user |
| `DELETE` | `/borrows/:id` | **JWT** | Return borrowed book (atomically increments copy) |
| `POST` | `/auth/token` | Public | Issue signed JWT token for authenticated session |

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/booknook?retryWrites=true&w=majority
DB_NAME=booknook
JWT_SECRET=your_super_secret_jwt_key_booknook_2026
CLIENT_URL=http://localhost:3000
```

---

## 🏃 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Run in development mode**:
   ```bash
   npm run dev
   ```
3. **Build and run in production**:
   ```bash
   npm run build
   npm start
   ```

