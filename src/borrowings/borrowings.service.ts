import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { BorrowingRecord } from '@prisma/client';

type BorrowingWithDetails = BorrowingRecord & {
  book: {
    title: string;
    author: string;
    isbn: string;
    shelfLocation: string;
  };
  isOverdue: boolean;
};

@Injectable()
export class BorrowingsService {
  constructor(private prisma: PrismaService) {}

  async checkout(
    borrowerId: string,
    dto: CheckoutDto,
  ): Promise<BorrowingRecord & { book: { title: string; author: string; isbn: string } }> {
    // Validate book exists
    const book = await this.prisma.book.findUnique({ where: { id: dto.bookId } });
    if (!book) {
      throw new NotFoundException(`Book with ID ${dto.bookId} not found`);
    }

    // Check availability
    if (book.availableQuantity <= 0) {
      throw new ConflictException('Book is not available for checkout');
    }

    // Check if borrower already has this book checked out
    const existingCheckout = await this.prisma.borrowingRecord.findFirst({
      where: { borrowerId, bookId: dto.bookId, returnedAt: null },
    });
    if (existingCheckout) {
      throw new ConflictException('You already have this book checked out');
    }

    // Check borrower active checkout count
    const activeCheckouts = await this.prisma.borrowingRecord.count({
      where: { borrowerId, returnedAt: null },
    });
    if (activeCheckouts >= 5) {
      throw new ConflictException('Checkout limit reached (max 5 books)');
    }

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 14);

    // Use transaction to create record and decrement quantity atomically
    const createdRecord = await this.prisma.$transaction(async (tx) => {
      const created = await tx.borrowingRecord.create({
        data: {
          book: { connect: { id: dto.bookId } },
          borrower: { connect: { id: borrowerId } },
          checkedOutAt: now,
          dueDate,
        },
      });
      await tx.book.update({
        where: { id: dto.bookId },
        data: { availableQuantity: { decrement: 1 } },
      });
      return created;
    });

    // Fetch with book details after transaction
    const record = await this.prisma.borrowingRecord.findUnique({
      where: { id: createdRecord.id },
      include: {
        book: { select: { title: true, author: true, isbn: true } },
      },
    });

    return record!;
  }

  async returnBook(borrowerId: string, recordId: string): Promise<BorrowingRecord> {
    const record = await this.prisma.borrowingRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException(`Borrowing record with ID ${recordId} not found`);
    }

    if (record.borrowerId !== borrowerId) {
      throw new ForbiddenException('You can only return your own borrowed books');
    }

    if (record.returnedAt !== null) {
      throw new ConflictException('This book has already been returned');
    }

    const updatedRecord = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.borrowingRecord.update({
        where: { id: recordId },
        data: { returnedAt: new Date() },
      });
      await tx.book.update({
        where: { id: record.bookId },
        data: { availableQuantity: { increment: 1 } },
      });
      return updated;
    });

    return updatedRecord;
  }

  async getMyBorrowings(borrowerId: string): Promise<BorrowingWithDetails[]> {
    const records = await this.prisma.borrowingRecord.findMany({
      where: { borrowerId, returnedAt: null },
      include: {
        book: {
          select: { title: true, author: true, isbn: true, shelfLocation: true },
        },
      },
    });

    const now = new Date();
    return records.map((record) => ({
      ...record,
      isOverdue: record.dueDate < now,
    }));
  }

  async getAllBorrowings(): Promise<
    (BorrowingRecord & {
      book: { title: string; isbn: string };
      borrower: { name: string; email: string };
    })[]
  > {
    return this.prisma.borrowingRecord.findMany({
      include: {
        book: {
          select: { title: true, isbn: true },
        },
        borrower: {
          select: { name: true, email: true },
        },
      },
      orderBy: { checkedOutAt: 'desc' },
    }) as Promise<
      (BorrowingRecord & {
        book: { title: string; isbn: string };
        borrower: { name: string; email: string };
      })[]
    >;
  }

  async getOverdue(): Promise<
    (BorrowingRecord & {
      book: { title: string; isbn: string };
      borrower: { name: string; email: string };
    })[]
  > {
    const now = new Date();
    return this.prisma.borrowingRecord.findMany({
      where: {
        returnedAt: null,
        dueDate: { lt: now },
      },
      include: {
        book: {
          select: { title: true, isbn: true },
        },
        borrower: {
          select: { name: true, email: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    }) as Promise<
      (BorrowingRecord & {
        book: { title: string; isbn: string };
        borrower: { name: string; email: string };
      })[]
    >;
  }
}
