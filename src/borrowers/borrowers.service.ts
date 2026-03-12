import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBorrowerDto } from './dto/update-borrower.dto';
import { Role } from '@prisma/client';

type BorrowerWithoutPassword = {
  id: string;
  name: string;
  email: string;
  role: Role;
  registeredAt: Date;
};

const SELECT_WITHOUT_PASSWORD = {
  id: true,
  name: true,
  email: true,
  role: true as const,
  registeredAt: true,
};

@Injectable()
export class BorrowersService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<BorrowerWithoutPassword[]> {
    return this.prisma.user.findMany({
      where: { role: Role.BORROWER },
      orderBy: { registeredAt: 'desc' },
      select: SELECT_WITHOUT_PASSWORD,
    });
  }

  async findOne(id: string): Promise<BorrowerWithoutPassword> {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.BORROWER },
      select: SELECT_WITHOUT_PASSWORD,
    });

    if (!user) {
      throw new NotFoundException(`Borrower with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, dto: UpdateBorrowerDto): Promise<BorrowerWithoutPassword> {
    await this.findOne(id);

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already in use by another user');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: SELECT_WITHOUT_PASSWORD,
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);

    const activeCheckouts = await this.prisma.borrowingRecord.count({
      where: { borrowerId: id, returnedAt: null },
    });

    if (activeCheckouts > 0) {
      throw new ConflictException('Borrower has books currently checked out and cannot be deleted');
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'Borrower deleted successfully' };
  }
}
