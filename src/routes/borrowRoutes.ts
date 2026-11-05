import { Router, Response } from "express";
import { ObjectId } from "mongodb";
import { getBooksCollection, getBorrowsCollection, BorrowDocument } from "../config/db";
import { verifyToken, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// POST /borrows - Borrow a book (Protected)
// Implements Challenge 1 (Stock $inc: -1) & Challenge 2 (No Double Borrow)
router.post("/", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bookId, returnDate } = req.body;
    const user = req.user!;

    if (!bookId || !ObjectId.isValid(bookId)) {
      return res.status(400).json({
        success: false,
        message: "A valid bookId is required.",
      });
    }

    if (!returnDate) {
      return res.status(400).json({
        success: false,
        message: "Return date is required.",
      });
    }

    const booksCollection = getBooksCollection();
    const borrowsCollection = getBorrowsCollection();

    // Check if book exists
    const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    // Challenge 2: No Double Borrow
    // Check if user currently has an active borrow for this book
    const existingBorrow = await borrowsCollection.findOne({
      bookId,
      userEmail: user.email,
      status: "borrowed",
    });

    if (existingBorrow) {
      return res.status(400).json({
        success: false,
        message: "You have already borrowed this book and have not returned it yet.",
      });
    }

    // Challenge 1: Check available copies and atomically decrement by 1 using $inc
    const updateResult = await booksCollection.findOneAndUpdate(
      {
        _id: new ObjectId(bookId),
        availableCopies: { $gt: 0 },
      },
      {
        $inc: { availableCopies: -1 },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" }
    );

    if (!updateResult) {
      return res.status(400).json({
        success: false,
        message: "Sorry, this book is currently not available (0 copies left).",
      });
    }

    // Create the borrow record in borrows collection
    const newBorrow: BorrowDocument = {
      bookId,
      bookTitle: book.title,
      bookImage: book.image,
      userEmail: user.email,
      userName: user.name || "Reader",
      borrowDate: new Date().toISOString().split("T")[0],
      returnDate: String(returnDate),
      status: "borrowed",
      createdAt: new Date(),
    };

    const insertResult = await borrowsCollection.insertOne(newBorrow);

    return res.status(201).json({
      success: true,
      message: "Book borrowed successfully!",
      data: {
        ...newBorrow,
        _id: insertResult.insertedId,
        availableCopies: updateResult.availableCopies,
      },
    });
  } catch (error: any) {
    console.error("[POST /borrows] Error borrowing book:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to borrow book.",
      error: error.message,
    });
  }
});

// GET /borrows - Retrieve borrows of the logged in user (Protected)
router.get("/", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const borrowsCollection = getBorrowsCollection();

    const userBorrows = await borrowsCollection
      .find({ userEmail: user.email, status: "borrowed" })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: userBorrows.length,
      data: userBorrows,
    });
  } catch (error: any) {
    console.error("[GET /borrows] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your borrowed books.",
      error: error.message,
    });
  }
});

// DELETE /borrows/:id - Return a book (Protected)
// Implements Challenge 1: When user returns it, increase available copies by 1 with $inc
router.delete("/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid borrow record ID format.",
      });
    }

    const borrowsCollection = getBorrowsCollection();
    const booksCollection = getBooksCollection();

    const borrowRecord = await borrowsCollection.findOne({ _id: new ObjectId(id) });

    if (!borrowRecord) {
      return res.status(404).json({
        success: false,
        message: "Borrow record not found.",
      });
    }

    // Verify ownership
    if (borrowRecord.userEmail !== user.email) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You can only return books that you borrowed.",
      });
    }

    // Increment available copies by 1 in books collection
    if (ObjectId.isValid(borrowRecord.bookId)) {
      await booksCollection.updateOne(
        { _id: new ObjectId(borrowRecord.bookId) },
        {
          $inc: { availableCopies: 1 },
          $set: { updatedAt: new Date() },
        }
      );
    }

    // Delete the borrow record (or we can delete it from borrows collection)
    await borrowsCollection.deleteOne({ _id: new ObjectId(id) });

    return res.status(200).json({
      success: true,
      message: "Book returned successfully! Thank you for returning it on time.",
    });
  } catch (error: any) {
    console.error(`[DELETE /borrows/${req.params.id}] Error:`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to return book.",
      error: error.message,
    });
  }
});

export default router;
