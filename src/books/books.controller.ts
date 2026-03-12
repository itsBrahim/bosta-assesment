import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { SearchBookDto } from './dto/search-book.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Books')
@ApiCookieAuth()
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @Roles(Role.ADMIN, Role.BORROWER)
  @ApiOperation({ summary: 'Get all books' })
  @ApiOkResponse({ description: 'List of all books' })
  findAll() {
    return this.booksService.findAll();
  }

  @Get('search')
  @Roles(Role.ADMIN, Role.BORROWER)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Search books by title, author, or isbn' })
  @ApiOkResponse({ description: 'List of matching books' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'by', enum: ['title', 'author', 'isbn'], description: 'Field to search by' })
  search(@Query() dto: SearchBookDto) {
    return this.booksService.search(dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.BORROWER)
  @ApiOperation({ summary: 'Get a book by ID' })
  @ApiOkResponse({ description: 'Book found' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new book (Admin only)' })
  @ApiCreatedResponse({ description: 'Book created successfully' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  @ApiConflictResponse({ description: 'Duplicate ISBN' })
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a book (Admin only)' })
  @ApiOkResponse({ description: 'Book updated successfully' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  @ApiConflictResponse({ description: 'Duplicate ISBN' })
  update(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a book (Admin only)' })
  @ApiOkResponse({ description: 'Book deleted successfully' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  @ApiConflictResponse({ description: 'Book is currently checked out' })
  remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }
}
