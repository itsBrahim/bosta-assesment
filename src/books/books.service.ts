import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { SearchBookDto } from './dto/search-book.dto';
import { Book, Prisma } from '@prisma/client';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBookDto): Promise<Book> {
    const existing = await this.prisma.book.findUnique({
      where: { isbn: dto.isbn },
    });

    if (existing) {
      throw new ConflictException('A book with this ISBN already exists');
    }

    return this.prisma.book.create({ data: dto });
  }

  async findAll(): Promise<Book[]> {
    return this.prisma.book.findMany({
      orderBy: { title: 'asc' },
    });
  }

  async findOne(id: string): Promise<Book> {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
    return book;
  }

  async search(dto: SearchBookDto): Promise<Book[]> {
    return this.prisma.book.findMany({
      where: {
        [dto.by]: {
          contains: dto.q,
          mode: 'insensitive',
        },
      } as Prisma.BookWhereInput,
      orderBy: { title: 'asc' },
    });
  }

  async update(id: string, dto: UpdateBookDto): Promise<Book> {
    await this.findOne(id);

    if (dto.isbn) {
      const existing = await this.prisma.book.findUnique({
        where: { isbn: dto.isbn },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('A book with this ISBN already exists');
      }
    }

    return this.prisma.book.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);

    const activeCheckouts = await this.prisma.borrowingRecord.count({
      where: { bookId: id, returnedAt: null },
    });

    if (activeCheckouts > 0) {
      throw new ConflictException('Book is currently checked out and cannot be deleted');
    }

    await this.prisma.book.delete({ where: { id } });
    return { message: 'Book deleted successfully' };
  }
}
