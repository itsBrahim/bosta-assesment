import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'uuid-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: Role.BORROWER,
        registeredAt: new Date(),
      });

      const result = await service.register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('john@example.com');
      expect('password' in result).toBe(false);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'existing@example.com',
      });

      await expect(
        service.register({
          name: 'John',
          email: 'existing@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash the password before storing', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'uuid-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: Role.BORROWER,
        registeredAt: new Date(),
      });

      await service.register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'plaintext',
      });

      const createCallArgs = mockPrismaService.user.create.mock.calls[0][0];
      expect(createCallArgs.data.password).not.toBe('plaintext');
      const isHashed = await bcrypt.compare('plaintext', createCallArgs.data.password as string);
      expect(isHashed).toBe(true);
    });
  });

  describe('login', () => {
    it('should return a JWT token on successful login', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'john@example.com',
        password: hashedPassword,
        role: Role.BORROWER,
      });
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login({
        email: 'john@example.com',
        password: 'Password123!',
      });

      expect(result).toBe('jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-1',
        email: 'john@example.com',
        role: Role.BORROWER,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'notfound@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('correct_password', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'john@example.com',
        password: hashedPassword,
        role: Role.BORROWER,
      });

      await expect(
        service.login({ email: 'john@example.com', password: 'wrong_password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
