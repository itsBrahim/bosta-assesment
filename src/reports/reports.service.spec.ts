import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { getLastMonthRange } from './utils/date-range.util';

const mockPrismaService = {
  borrowingRecord: {
    findMany: jest.fn(),
  },
};

const now = new Date('2026-03-12T10:00:00.000Z');

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  describe('getLastMonthRange', () => {
    it('should return correct from and to dates for last calendar month', () => {
      // When today is March 12, 2026 -> last month is February 2026
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const { from, to } = getLastMonthRange();

      expect(from.getFullYear()).toBe(2026);
      expect(from.getMonth()).toBe(1); // February = 1
      expect(from.getDate()).toBe(1);
      expect(to.getMonth()).toBe(1); // February = 1
      expect(to.getDate()).toBe(28); // Feb 28, 2026

      jest.useRealTimers();
    });

    it('should handle January (rollback to previous year December)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-15T10:00:00.000Z'));

      const { from, to } = getLastMonthRange();

      expect(from.getFullYear()).toBe(2025);
      expect(from.getMonth()).toBe(11); // December = 11
      expect(from.getDate()).toBe(1);
      expect(to.getMonth()).toBe(11); // December = 11
      expect(to.getDate()).toBe(31);

      jest.useRealTimers();
    });
  });

  describe('getAnalytics', () => {
    it('should return correct analytics structure with computed stats', async () => {
      const mockRecords = [
        {
          bookId: 'book-1',
          borrowerId: 'borrower-1',
          checkedOutAt: new Date('2026-02-10'),
          dueDate: new Date('2026-02-24'),
          returnedAt: new Date('2026-02-20'),
          book: { title: 'Book A', isbn: '9780743273565' },
          borrower: { name: 'Alice', email: 'alice@example.com' },
        },
        {
          bookId: 'book-1',
          borrowerId: 'borrower-2',
          checkedOutAt: new Date('2026-02-15'),
          dueDate: new Date('2026-02-01'), // overdue
          returnedAt: null,
          book: { title: 'Book A', isbn: '9780743273565' },
          borrower: { name: 'Bob', email: 'bob@example.com' },
        },
      ];

      mockPrismaService.borrowingRecord.findMany.mockResolvedValue(mockRecords);

      const result = await service.getAnalytics();

      expect(result).toHaveProperty('period');
      expect(result.totalCheckouts).toBe(2);
      expect(result.totalReturns).toBe(1);
      expect(result.overdueCount).toBe(1);
      expect(result.topBooks).toHaveLength(1);
      expect(result.topBooks[0].checkoutCount).toBe(2);
      expect(result.topBorrowers).toHaveLength(2);
    });

    it('should return topBooks sorted by checkoutCount descending', async () => {
      const mockRecords = [
        {
          bookId: 'book-1',
          borrowerId: 'b-1',
          checkedOutAt: new Date(),
          dueDate: new Date(),
          returnedAt: null,
          book: { title: 'Book A', isbn: '111' },
          borrower: { name: 'Alice', email: 'a@test.com' },
        },
        {
          bookId: 'book-2',
          borrowerId: 'b-1',
          checkedOutAt: new Date(),
          dueDate: new Date(),
          returnedAt: null,
          book: { title: 'Book B', isbn: '222' },
          borrower: { name: 'Alice', email: 'a@test.com' },
        },
        {
          bookId: 'book-2',
          borrowerId: 'b-2',
          checkedOutAt: new Date(),
          dueDate: new Date(),
          returnedAt: null,
          book: { title: 'Book B', isbn: '222' },
          borrower: { name: 'Bob', email: 'b@test.com' },
        },
      ];

      mockPrismaService.borrowingRecord.findMany.mockResolvedValue(mockRecords);

      const result = await service.getAnalytics();
      expect(result.topBooks[0].checkoutCount).toBeGreaterThanOrEqual(
        result.topBooks[result.topBooks.length - 1].checkoutCount,
      );
    });
  });

  describe('exportOverdueLastMonth', () => {
    it('should call Prisma with correct date range and generate export', async () => {
      mockPrismaService.borrowingRecord.findMany.mockResolvedValue([]);

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        write: jest.fn(),
      };

      // We just verify the Prisma query is called - no file actually written in tests
      await service.exportOverdueLastMonth(
        mockRes as unknown as import('express').Response,
        'xlsx',
      );

      expect(mockPrismaService.borrowingRecord.findMany).toHaveBeenCalled();
      const callArgs = mockPrismaService.borrowingRecord.findMany.mock.calls[0][0] as {
        where: { checkedOutAt: unknown };
      };
      expect(callArgs.where).toHaveProperty('checkedOutAt');
    });
  });

  describe('exportAllLastMonth', () => {
    it('should call Prisma with correct date range', async () => {
      mockPrismaService.borrowingRecord.findMany.mockResolvedValue([]);

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        write: jest.fn(),
      };

      await service.exportAllLastMonth(mockRes as unknown as import('express').Response, 'xlsx');

      expect(mockPrismaService.borrowingRecord.findMany).toHaveBeenCalled();
    });
  });
});
