import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { getLastMonthRange } from './utils/date-range.util';
import { generateExport } from './utils/export.util';

const EXPORT_COLUMNS = [
  'Borrower Name',
  'Borrower Email',
  'Book Title',
  'ISBN',
  'Checked Out At',
  'Due Date',
  'Returned At',
  'Status',
];

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics() {
    const { from, to } = getLastMonthRange();

    const records = await this.prisma.borrowingRecord.findMany({
      where: { checkedOutAt: { gte: from, lte: to } },
      include: {
        book: { select: { title: true, isbn: true } },
        borrower: { select: { name: true, email: true } },
      },
    });

    const totalCheckouts = records.length;
    const totalReturns = records.filter((r) => r.returnedAt !== null).length;
    const now = new Date();
    const overdueCount = records.filter((r) => r.returnedAt === null && r.dueDate < now).length;

    const bookCounts = new Map<string, { title: string; isbn: string; checkoutCount: number }>();
    records.forEach((r) => {
      const existing = bookCounts.get(r.bookId);
      if (existing) {
        existing.checkoutCount++;
      } else {
        bookCounts.set(r.bookId, { title: r.book.title, isbn: r.book.isbn, checkoutCount: 1 });
      }
    });
    const topBooks = Array.from(bookCounts.values())
      .sort((a, b) => b.checkoutCount - a.checkoutCount)
      .slice(0, 5);

    const borrowerCounts = new Map<
      string,
      { name: string; email: string; checkoutCount: number }
    >();
    records.forEach((r) => {
      const existing = borrowerCounts.get(r.borrowerId);
      if (existing) {
        existing.checkoutCount++;
      } else {
        borrowerCounts.set(r.borrowerId, {
          name: r.borrower.name,
          email: r.borrower.email,
          checkoutCount: 1,
        });
      }
    });
    const topBorrowers = Array.from(borrowerCounts.values())
      .sort((a, b) => b.checkoutCount - a.checkoutCount)
      .slice(0, 5);

    return {
      period: { from, to },
      totalCheckouts,
      totalReturns,
      overdueCount,
      topBooks,
      topBorrowers,
    };
  }

  async exportOverdueLastMonth(res: Response, format: 'csv' | 'xlsx'): Promise<void> {
    const { from, to } = getLastMonthRange();
    const now = new Date();

    const records = await this.prisma.borrowingRecord.findMany({
      where: {
        checkedOutAt: { gte: from, lte: to },
        OR: [{ returnedAt: null, dueDate: { lt: now } }],
      },
      include: {
        book: { select: { title: true, isbn: true } },
        borrower: { select: { name: true, email: true } },
      },
    });

    const rows = records.map((r) => [
      r.borrower.name,
      r.borrower.email,
      r.book.title,
      r.book.isbn,
      r.checkedOutAt.toISOString(),
      r.dueDate.toISOString(),
      r.returnedAt ? r.returnedAt.toISOString() : 'Not returned',
      'Overdue',
    ]);

    await generateExport(rows, EXPORT_COLUMNS, format, res, 'overdue-last-month');
  }

  async exportAllLastMonth(res: Response, format: 'csv' | 'xlsx'): Promise<void> {
    const { from, to } = getLastMonthRange();
    const now = new Date();

    const records = await this.prisma.borrowingRecord.findMany({
      where: { checkedOutAt: { gte: from, lte: to } },
      include: {
        book: { select: { title: true, isbn: true } },
        borrower: { select: { name: true, email: true } },
      },
    });

    const rows = records.map((r) => {
      let status = 'Returned';
      if (r.returnedAt === null) {
        status = r.dueDate < now ? 'Overdue' : 'Active';
      }
      return [
        r.borrower.name,
        r.borrower.email,
        r.book.title,
        r.book.isbn,
        r.checkedOutAt.toISOString(),
        r.dueDate.toISOString(),
        r.returnedAt ? r.returnedAt.toISOString() : 'Not returned',
        status,
      ];
    });

    await generateExport(rows, EXPORT_COLUMNS, format, res, 'all-last-month');
  }
}
