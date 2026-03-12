import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { BorrowingsService } from './borrowings.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Borrowings')
@ApiCookieAuth()
@Controller('borrowings')
export class BorrowingsController {
  constructor(private readonly borrowingsService: BorrowingsService) {}

  @Post('checkout')
  @Roles(Role.BORROWER)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Check out a book' })
  @ApiCreatedResponse({ description: 'Book checked out successfully' })
  @ApiConflictResponse({
    description:
      'Conflict: Book not available, already checked out, or limit reached (max 5 books)',
  })
  @ApiNotFoundResponse({ description: 'Book not found' })
  checkout(@CurrentUser() user: JwtPayload, @Body() dto: CheckoutDto) {
    return this.borrowingsService.checkout(user.sub, dto);
  }

  @Post('return/:id')
  @Roles(Role.BORROWER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return a borrowed book' })
  @ApiOkResponse({ description: 'Book returned successfully' })
  @ApiNotFoundResponse({ description: 'Borrowing record not found' })
  @ApiForbiddenResponse({ description: 'You can only return your own borrowed books' })
  @ApiConflictResponse({ description: 'Book already returned' })
  returnBook(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.borrowingsService.returnBook(user.sub, id);
  }

  @Get('my')
  @Roles(Role.BORROWER)
  @ApiOperation({ summary: 'Get my active borrowings' })
  @ApiOkResponse({ description: 'Active checkouts with isOverdue flag' })
  getMyBorrowings(@CurrentUser() user: JwtPayload) {
    return this.borrowingsService.getMyBorrowings(user.sub);
  }

  @Get('overdue')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all overdue records (Admin only)' })
  @ApiOkResponse({ description: 'All overdue records sorted by due date ASC' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  getOverdue() {
    return this.borrowingsService.getOverdue();
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all borrowing records (Admin only)' })
  @ApiOkResponse({ description: 'All borrowing records (admin only)' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  getAllBorrowings() {
    return this.borrowingsService.getAllBorrowings();
  }
}
