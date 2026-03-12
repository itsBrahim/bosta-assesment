import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BorrowersService } from './borrowers.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

const mockPrismaService = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  borrowingRecord: {
    count: jest.fn(),
  },
};

const mockBorrower = {
  id: 'uuid-borrower-1',
  name: 'John Doe',
  email: 'john@example.com',
  role: Role.BORROWER,
  registeredAt: new Date(),
};

describe('BorrowersService', () => {
  let service: BorrowersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BorrowersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<BorrowersService>(BorrowersService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return list of borrowers without password', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockBorrower]);

      const result = await service.findAll();
      expect(result).toEqual([mockBorrower]);
      expect(result[0]).not.toHaveProperty('password');
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: Role.BORROWER },
        }),
      );
    });

    it('should exclude admins from results', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockBorrower]);

      await service.findAll();
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: Role.BORROWER },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a borrower by id', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockBorrower);

      const result = await service.findOne('uuid-borrower-1');
      expect(result).toEqual(mockBorrower);
    });

    it('should throw NotFoundException for non-existent borrower', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when given an admin ID', async () => {
      // findFirst with role: BORROWER filter returns null for admin IDs
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('admin-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a borrower successfully', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockBorrower);
      mockPrismaService.user.update.mockResolvedValue({ ...mockBorrower, name: 'Jane Doe' });

      const result = await service.update('uuid-borrower-1', { name: 'Jane Doe' });
      expect(result.name).toBe('Jane Doe');
    });

    it('should throw NotFoundException for non-existent borrower', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'Jane' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockBorrower);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'other-user-id',
        email: 'taken@example.com',
      });

      await expect(
        service.update('uuid-borrower-1', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a borrower successfully', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockBorrower);
      mockPrismaService.borrowingRecord.count.mockResolvedValue(0);
      mockPrismaService.user.delete.mockResolvedValue(mockBorrower);

      const result = await service.remove('uuid-borrower-1');
      expect(result).toEqual({ message: 'Borrower deleted successfully' });
    });

    it('should throw NotFoundException for non-existent borrower', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when borrower has active checkouts', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockBorrower);
      mockPrismaService.borrowingRecord.count.mockResolvedValue(3);

      await expect(service.remove('uuid-borrower-1')).rejects.toThrow(ConflictException);
    });
  });
});
