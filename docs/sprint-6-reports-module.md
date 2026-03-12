# Sprint 6 — Reports Module

## Goal
Implement admin-only analytics and data export endpoints that cover last-month borrowing activity, producing both CSV and XLSX outputs.

---

## Tasks

### 1. Dependencies
- Install: `exceljs`
- Install types: `@types/exceljs` (included in package)

### 2. Date Helpers
- Create a utility function `getLastMonthRange(): { from: Date; to: Date }`:
  - `from`: first day of last calendar month at `00:00:00`
  - `to`: last day of last calendar month at `23:59:59`
  - Example: if today is March 12, 2026 → range is Feb 1 – Feb 28, 2026

### 3. Reports Service
- `getAnalytics()`:
  - Query `BorrowingRecord` for last month's date range
  - Compute and return:
    ```json
    {
      "period": { "from": "...", "to": "..." },
      "totalCheckouts": 42,
      "totalReturns": 38,
      "overdueCount": 4,
      "topBooks": [
        { "title": "...", "isbn": "...", "checkoutCount": 7 }
      ],
      "topBorrowers": [
        { "name": "...", "email": "...", "checkoutCount": 5 }
      ]
    }
    ```
  - `topBooks`: top 5 most checked-out books in the period
  - `topBorrowers`: top 5 most active borrowers in the period

- `exportOverdueLastMonth(res: Response)`:
  - Query: records where `checkedOutAt` in last month AND `dueDate < returnedAt` (returned late) OR `returnedAt = null` AND `dueDate < now`
  - Columns: `Borrower Name`, `Borrower Email`, `Book Title`, `ISBN`, `Checked Out At`, `Due Date`, `Returned At`, `Status`
  - Generate both CSV and XLSX using `exceljs`
  - Return a ZIP or two separate files — deliver as **two separate file downloads** via two distinct query params: `?format=csv` and `?format=xlsx`

- `exportAllLastMonth(res: Response)`:
  - Query: all `BorrowingRecord` where `checkedOutAt` in last month range
  - Same columns as above
  - Same `?format=csv` / `?format=xlsx` behavior

### 4. Export Mechanism (shared helper)
- Create a `generateExport(data: object[], columns: string[], format: 'csv' | 'xlsx', res: Response, filename: string)` helper:
  - For **XLSX**: use `exceljs` `Workbook`, add worksheet, bold the header row, auto-fit columns, pipe to response with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - For **CSV**: use `exceljs` CSV writer, pipe to response with `Content-Type: text/csv`
  - Set `Content-Disposition: attachment; filename="<filename>.<ext>"`

### 5. Reports Controller
- All routes: `@Roles(Role.ADMIN)`
- `GET /reports/analytics`
  - Returns JSON analytics object
- `GET /reports/export/overdue/last-month?format=csv|xlsx`
  - Streams file download to client
  - Default format: `xlsx` if param omitted
- `GET /reports/export/all/last-month?format=csv|xlsx`
  - Streams file download to client
  - Default format: `xlsx` if param omitted

### 6. Reports Module
- Provide `ReportsService`
- No exports needed

### 7. Swagger Decorators
- Controller:
  - `@ApiTags('Reports')` on the controller class
  - `@ApiCookieAuth()` on the controller class
  - `GET /reports/analytics`: `@ApiOperation({ summary: 'Borrowing analytics for last calendar month' })`, `@ApiOkResponse` with inline schema describing the response shape
  - `GET /reports/export/overdue/last-month`: `@ApiOperation({ summary: 'Download overdue borrows for last month' })`, `@ApiQuery({ name: 'format', enum: ['csv', 'xlsx'], required: false })`, `@ApiProduces('text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')`
  - `GET /reports/export/all/last-month`: same pattern as above
  - All routes: `@ApiForbiddenResponse` (non-admin access)

### 8. Unit Tests (`reports.service.spec.ts`)
Test cases:
- `getAnalytics`: returns correct structure, `totalCheckouts` matches mocked data, `topBooks` sorted correctly
- `exportOverdueLastMonth`: calls Prisma with correct date range, generates workbook with correct row count
- `exportAllLastMonth`: calls Prisma with correct date range
- `getLastMonthRange`: returns correct `from` / `to` dates (test with a fixed "current date")

---

## Deliverables
- `GET /reports/analytics` returns structured stats for last month
- `GET /reports/export/overdue/last-month?format=xlsx` downloads an XLSX file
- `GET /reports/export/overdue/last-month?format=csv` downloads a CSV file
- `GET /reports/export/all/last-month?format=xlsx` downloads an XLSX file
- `GET /reports/export/all/last-month?format=csv` downloads a CSV file
- All unit tests pass

---

## Definition of Done
- [ ] Analytics endpoint returns valid JSON with all required fields
- [ ] XLSX download opens correctly in Excel/Sheets with bold headers
- [ ] CSV download is well-formed and parseable
- [ ] Calling reports as a borrower returns `403`
- [ ] `npm run test reports` — all tests pass
