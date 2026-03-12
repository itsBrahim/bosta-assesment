import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { BorrowingsService } from './borrowings.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  book: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  borrowingRecord: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockBook = {
  id: 'book-uuid-1',
  title: 'Test Book',
  isbn: '9780743273565',
  availableQuantity: 2,
};

const mockBorrowingRecord = {
  id: 'record-uuid-1',
  bookId: 'book-uuid-1',
  borrowerId: 'borrower-uuid-1',
  checkedOutAt: new Date('2026-01-01'),
  dueDate: new Date('2026-01-15'),
  returnedAt: null,
};

describe('BorrowingsService', () => {
  let service: BorrowingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BorrowingsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<BorrowingsService>(BorrowingsService);
    jest.clearAllMocks();
  });

  describe('checkout', () => {
    it('should checkout a book successfully', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.borrowingRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.borrowingRecord.count.mockResolvedValue(0);

      const createdRecord = {
        ...mockBorrowingRecord,
        book: { title: 'Test Book', author: 'Author', isbn: '9780743273565' },
      };
      mockPrismaService.borrowingRecord.create.mockResolvedValue(createdRecord);
      mockPrismaService.book.update.mockResolvedValue({ ...mockBook, availableQuantity: 1 });
      mockPrismaService.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
        Promise.all(ops),
      );

      const result = await service.checkout('borrower-uuid-1', { bookId: 'book-uuid-1' });
      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if book not found', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(null);

      await expect(service.checkout('borrower-uuid-1', { bookId: 'non-existent' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if book quantity is 0', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue({ ...mockBook, availableQuantity: 0 });

      await expect(service.checkout('borrower-uuid-1', { bookId: 'book-uuid-1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if borrower already has this book checked out', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.borrowingRecord.findFirst.mockResolvedValue(mockBorrowingRecord);

      await expect(service.checkout('borrower-uuid-1', { bookId: 'book-uuid-1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if borrower has 5 or more active checkouts', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.borrowingRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.borrowingRecord.count.mockResolvedValue(5);

      await expect(service.checkout('borrower-uuid-1', { bookId: 'book-uuid-1' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('returnBook', () => {
    it('should return a book successfully', async () => {
      mockPrismaService.borrowingRecord.findUnique.mockResolvedValue(mockBorrowingRecord);
      const returnedRecord = { ...mockBorrowingRecord, returnedAt: new Date() };
      mockPrismaService.borrowingRecord.update.mockResolvedValue(returnedRecord);
      mockPrismaService.book.update.mockResolvedValue({ ...mockBook, availableQuantity: 3 });
      mockPrismaService.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
        Promise.all(ops),
      );

      const result = await service.returnBook('borrower-uuid-1', 'record-uuid-1');
      expect(result.returnedAt).not.toBeNull();
    });

    it('should throw NotFoundException if record not found', async () => {
      mockPrismaService.borrowingRecord.findUnique.mockResolvedValue(null);

      await expect(service.returnBook('borrower-uuid-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if record belongs to another borrower', async () => {
      mockPrismaService.borrowingRecord.findUnique.mockResolvedValue({
        ...mockBorrowingRecord,
        borrowerId: 'other-borrower-id',
      });

      await expect(service.returnBook('borrower-uuid-1', 'record-uuid-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if book already returned', async () => {
      mockPrismaService.borrowingRecord.findUnique.mockResolvedValue({
        ...mockBorrowingRecord,
        returnedAt: new Date(),
      });

      await expect(service.returnBook('borrower-uuid-1', 'record-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getMyBorrowings', () => {
    it('should return active borrowings with isOverdue flag', async () => {
      const overdueDueDate = new Date();
      overdueDueDate.setDate(overdueDueDate.getDate() - 5);

      mockPrismaService.borrowingRecord.findMany.mockResolvedValue([
        {
          ...mockBorrowingRecord,
          dueDate: overdueDueDate,
          book: { title: 'Test Book', author: 'Author', isbn: '123', shelfLocation: 'A-1' },
        },
      ]);

      const result = await service.getMyBorrowings('borrower-uuid-1');
      expect(result[0].isOverdue).toBe(true);
    });

    it('should set isOverdue to false for non-overdue books', async () => {
      const futureDueDate = new Date();
      futureDueDate.setDate(futureDueDate.getDate() + 5);

      mockPrismaService.borrowingRecord.findMany.mockResolvedValue([
        {
          ...mockBorrowingRecord,
          dueDate: futureDueDate,
          book: { title: 'Test Book', author: 'Author', isbn: '123', shelfLocation: 'A-1' },
        },
      ]);

      const result = await service.getMyBorrowings('borrower-uuid-1');
      expect(result[0].isOverdue).toBe(false);
    });
  });

  describe('getAllBorrowings', () => {
    it('should return all borrowing records with details', async () => {
      mockPrismaService.borrowingRecord.findMany.mockResolvedValue([
        {
          ...mockBorrowingRecord,
          book: { title: 'Test Book', isbn: '123' },
          borrower: { name: 'John', email: 'john@example.com' },
        },
      ]);

      const result = await service.getAllBorrowings();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('book');
      expect(result[0]).toHaveProperty('borrower');
    });
  });

  describe('getOverdue', () => {
    it('should return only overdue records sorted by due date ASC', async () => {
      const overdueRecord = {
        ...mockBorrowingRecord,
        dueDate: new Date('2026-01-01'),
        book: { title: 'Test Book', isbn: '123' },
        borrower: { name: 'John', email: 'john@example.com' },
      };

      mockPrismaService.borrowingRecord.findMany.mockResolvedValue([overdueRecord]);

      const result = await service.getOverdue();
      expect(result).toHaveLength(1);
      expect(mockPrismaService.borrowingRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ returnedAt: null }),
          orderBy: { dueDate: 'asc' },
        }),
      );
    });
  });
});
