import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchByField } from './dto/search-book.dto';

const mockPrismaService = {
  book: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  borrowingRecord: {
    count: jest.fn(),
  },
};

const mockBook = {
  id: 'uuid-book-1',
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
  isbn: '9780743273565',
  availableQuantity: 5,
  shelfLocation: 'A-12',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BooksService', () => {
  let service: BooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BooksService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<BooksService>(BooksService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a book successfully', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(null);
      mockPrismaService.book.create.mockResolvedValue(mockBook);

      const result = await service.create({
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
        availableQuantity: 5,
        shelfLocation: 'A-12',
      });

      expect(result).toEqual(mockBook);
    });

    it('should throw ConflictException for duplicate ISBN', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);

      await expect(
        service.create({
          title: 'Another Book',
          author: 'Author',
          isbn: '9780743273565',
          availableQuantity: 1,
          shelfLocation: 'B-01',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all books ordered by title', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([mockBook]);

      const result = await service.findAll();
      expect(result).toEqual([mockBook]);
      expect(mockPrismaService.book.findMany).toHaveBeenCalledWith({
        orderBy: { title: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a book by id', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);

      const result = await service.findOne('uuid-book-1');
      expect(result).toEqual(mockBook);
    });

    it('should throw NotFoundException for non-existent book', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('search', () => {
    it('should return books matching the search query', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([mockBook]);

      const result = await service.search({ q: 'gatsby', by: SearchByField.TITLE });
      expect(result).toEqual([mockBook]);
      expect(mockPrismaService.book.findMany).toHaveBeenCalledWith({
        where: {
          title: {
            contains: 'gatsby',
            mode: 'insensitive',
          },
        },
        orderBy: { title: 'asc' },
      });
    });

    it('should search by author', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([mockBook]);

      await service.search({ q: 'Fitzgerald', by: SearchByField.AUTHOR });
      expect(mockPrismaService.book.findMany).toHaveBeenCalledWith({
        where: {
          author: {
            contains: 'Fitzgerald',
            mode: 'insensitive',
          },
        },
        orderBy: { title: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('should update a book successfully', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.book.update.mockResolvedValue({ ...mockBook, title: 'Updated Title' });

      const result = await service.update('uuid-book-1', { title: 'Updated Title' });
      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException for non-existent book', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { title: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for duplicate ISBN on update', async () => {
      mockPrismaService.book.findUnique
        .mockResolvedValueOnce(mockBook) // findOne check succeeds
        .mockResolvedValueOnce({ ...mockBook, id: 'other-book-id' }); // ISBN already taken by another book

      await expect(service.update('uuid-book-1', { isbn: '9780743273565' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a book successfully', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.borrowingRecord.count.mockResolvedValue(0);
      mockPrismaService.book.delete.mockResolvedValue(mockBook);

      const result = await service.remove('uuid-book-1');
      expect(result).toEqual({ message: 'Book deleted successfully' });
    });

    it('should throw NotFoundException for non-existent book', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when book has active checkouts', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.borrowingRecord.count.mockResolvedValue(2);

      await expect(service.remove('uuid-book-1')).rejects.toThrow(ConflictException);
    });
  });
});
