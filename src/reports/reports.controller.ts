import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiCookieAuth,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Reports')
@ApiCookieAuth()
@Roles(Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Borrowing analytics for last calendar month' })
  @ApiOkResponse({
    description: 'Analytics summary for last month',
    schema: {
      properties: {
        period: {
          type: 'object',
          properties: { from: { type: 'string' }, to: { type: 'string' } },
        },
        totalCheckouts: { type: 'number' },
        totalReturns: { type: 'number' },
        overdueCount: { type: 'number' },
        topBooks: { type: 'array', items: { type: 'object' } },
        topBorrowers: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  getAnalytics() {
    return this.reportsService.getAnalytics();
  }

  @Get('export/overdue/last-month')
  @ApiOperation({ summary: 'Download overdue borrows for last month' })
  @ApiQuery({
    name: 'format',
    enum: ['csv', 'xlsx'],
    required: false,
    description: 'Export format (default: xlsx)',
  })
  @ApiProduces('text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiForbiddenResponse({ description: 'Admin access required' })
  exportOverdue(@Query('format') format: 'csv' | 'xlsx' = 'xlsx', @Res() res: Response) {
    const exportFormat = format === 'csv' ? 'csv' : 'xlsx';
    return this.reportsService.exportOverdueLastMonth(res, exportFormat);
  }

  @Get('export/all/last-month')
  @ApiOperation({ summary: 'Download all borrowings for last month' })
  @ApiQuery({
    name: 'format',
    enum: ['csv', 'xlsx'],
    required: false,
    description: 'Export format (default: xlsx)',
  })
  @ApiProduces('text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiForbiddenResponse({ description: 'Admin access required' })
  exportAll(@Query('format') format: 'csv' | 'xlsx' = 'xlsx', @Res() res: Response) {
    const exportFormat = format === 'csv' ? 'csv' : 'xlsx';
    return this.reportsService.exportAllLastMonth(res, exportFormat);
  }
}
