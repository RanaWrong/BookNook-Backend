import { Router, Response } from "express";
import { ObjectId } from "mongodb";
import { getBooksCollection, BookDocument } from "../config/db";
import { verifyToken, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// GET /books - Retrieve all books (with optional filtering, sorting, and limit)
router.get("/", async (req, res: Response) => {
  try {
    const booksCollection = getBooksCollection();
    const { category, sort, limit, search, userEmail } = req.query;

    const query: any = {};

    if (category && typeof category === "string" && category !== "All") {
      query.category = category;
    }

    if (userEmail && typeof userEmail === "string") {
      query.userEmail = userEmail;
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: "i" } },
        { author: { $regex: sanitizedSearch, $options: "i" } },
      ];
    }

    let cursor = booksCollection.find(query);

    // Sorting: default newest first if sort=desc or sort=newest
    if (sort === "desc" || sort === "newest") {
      cursor = cursor.sort({ createdAt: -1 });
    } else if (sort === "asc") {
      cursor = cursor.sort({ createdAt: 1 });
    } else {
      // Default to newest first
      cursor = cursor.sort({ createdAt: -1 });
    }

    if (limit) {
      const parsedLimit = parseInt(limit as string, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        cursor = cursor.limit(parsedLimit);
      }
    }

    const books = await cursor.toArray();

    return res.status(200).json({
      success: true,
      count: books.length,
      data: books,
    });
  } catch (error: any) {
    console.error("[GET /books] Error fetching books:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve books from database.",
      error: error.message,
    });
  }
});

// GET /books/:id - Retrieve single book by ID
router.get("/:id", async (req, res: Response) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID format.",
      });
    }

    const booksCollection = getBooksCollection();
    const book = await booksCollection.findOne({ _id: new ObjectId(id) });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error: any) {
    console.error(`[GET /books/${req.params.id}] Error:`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve book.",
      error: error.message,
    });
  }
});

// POST /books - Add a new book (Protected)
router.post("/", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, author, category, image, description, totalCopies } = req.body;
    const user = req.user!;

    if (!title || !author || !category || !image || !description) {
      return res.status(400).json({
        success: false,
        message: "All fields (title, author, category, image, description) are required.",
      });
    }

    const parsedCopies = parseInt(totalCopies, 10);
    const copies = !isNaN(parsedCopies) && parsedCopies > 0 ? parsedCopies : 1;

    const newBook: BookDocument = {
      title: title.trim(),
      author: author.trim(),
      category,
      image: image.trim(),
      description: description.trim(),
      totalCopies: copies,
      availableCopies: copies, // Challenge: availableCopies initially equals totalCopies
      userEmail: user.email,
      userName: user.name || "Anonymous Reader",
      createdAt: new Date(),
    };

    const booksCollection = getBooksCollection();
    const result = await booksCollection.insertOne(newBook);

    return res.status(201).json({
      success: true,
      message: "Book added successfully.",
      data: { ...newBook, _id: result.insertedId },
    });
  } catch (error: any) {
    console.error("[POST /books] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add book.",
      error: error.message,
    });
  }
});

// PATCH /books/:id - Update an existing book (Protected - Creator only)
router.patch("/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID format.",
      });
    }

    const booksCollection = getBooksCollection();
    const existingBook = await booksCollection.findOne({ _id: new ObjectId(id) });

    if (!existingBook) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    // Authorization check: Only creator can update
    if (existingBook.userEmail !== user.email) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You can only edit books added by your account.",
      });
    }

    const { title, author, category, image, description, totalCopies } = req.body;
    const updateFields: Partial<BookDocument> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateFields.title = title.trim();
    if (author !== undefined) updateFields.author = author.trim();
    if (category !== undefined) updateFields.category = category;
    if (image !== undefined) updateFields.image = image.trim();
    if (description !== undefined) updateFields.description = description.trim();

    if (totalCopies !== undefined) {
      const newTotal = parseInt(totalCopies, 10);
      if (!isNaN(newTotal) && newTotal >= 0) {
        const copyDiff = newTotal - existingBook.totalCopies;
        updateFields.totalCopies = newTotal;
        updateFields.availableCopies = Math.max(0, existingBook.availableCopies + copyDiff);
      }
    }

    const result = await booksCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: "after" }
    );

    return res.status(200).json({
      success: true,
      message: "Book updated successfully.",
      data: result,
    });
  } catch (error: any) {
    console.error(`[PATCH /books/${req.params.id}] Error:`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to update book.",
      error: error.message,
    });
  }
});

// DELETE /books/:id - Delete a book (Protected - Creator only)
router.delete("/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID format.",
      });
    }

    const booksCollection = getBooksCollection();
    const existingBook = await booksCollection.findOne({ _id: new ObjectId(id) });

    if (!existingBook) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    // Authorization check: Only creator can delete
    if (existingBook.userEmail !== user.email) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You can only delete books added by your account.",
      });
    }

    await booksCollection.deleteOne({ _id: new ObjectId(id) });

    return res.status(200).json({
      success: true,
      message: "Book deleted successfully.",
    });
  } catch (error: any) {
    console.error(`[DELETE /books/${req.params.id}] Error:`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete book.",
      error: error.message,
    });
  }
});

export default router;

