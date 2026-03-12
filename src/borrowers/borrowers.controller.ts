import { Controller, Get, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { BorrowersService } from './borrowers.service';
import { UpdateBorrowerDto } from './dto/update-borrower.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Borrowers')
@ApiCookieAuth()
@Roles(Role.ADMIN)
@Controller('borrowers')
export class BorrowersController {
  constructor(private readonly borrowersService: BorrowersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all borrowers (Admin only)' })
  @ApiOkResponse({ description: 'List of all borrowers (admin only)' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  findAll() {
    return this.borrowersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a borrower by ID (Admin only)' })
  @ApiOkResponse({ description: 'Borrower found' })
  @ApiNotFoundResponse({ description: 'Borrower not found' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  findOne(@Param('id') id: string) {
    return this.borrowersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a borrower (Admin only)' })
  @ApiOkResponse({ description: 'Borrower updated successfully' })
  @ApiNotFoundResponse({ description: 'Borrower not found' })
  @ApiConflictResponse({ description: 'Email already in use' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  update(@Param('id') id: string, @Body() dto: UpdateBorrowerDto) {
    return this.borrowersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a borrower (Admin only)' })
  @ApiOkResponse({ description: 'Borrower deleted successfully' })
  @ApiNotFoundResponse({ description: 'Borrower not found' })
  @ApiConflictResponse({ description: 'Borrower has active checkouts' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  remove(@Param('id') id: string) {
    return this.borrowersService.remove(id);
  }
}
