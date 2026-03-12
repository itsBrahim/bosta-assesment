import { Response } from 'express';
import * as ExcelJS from 'exceljs';

export async function generateExport(
  rows: unknown[][],
  columns: string[],
  format: 'csv' | 'xlsx',
  res: Response,
  filename: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  // Add bold header row
  const headerRow = worksheet.addRow(columns);
  headerRow.font = { bold: true };

  // Add data rows
  rows.forEach((row) => {
    worksheet.addRow(row as ExcelJS.CellValue[]);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? String(cell.value) : '';
      if (cellValue.length > maxLength) {
        maxLength = cellValue.length;
      }
    });
    column.width = maxLength + 2;
  });

  if (format === 'xlsx') {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    await workbook.xlsx.write(res);
  } else {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    await workbook.csv.write(res);
  }

  res.end();
}
