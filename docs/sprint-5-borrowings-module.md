# Sprint 5 — Borrowings Module

## Goal
Implement the full borrowing lifecycle — checkout, return, overdue tracking — with all business rules enforced and rate limiting on checkout.

---

## Tasks

### 1. DTOs
- `CheckoutDto`:
  - `bookId`: valid UUID, required
- `ReturnDto`: no body needed (book identified via route param `:id` = borrowing record ID)

### 2. Business Rules (enforced in service)
| Rule | Behavior on violation |
|---|---|
| `availableQuantity` = 0 | `ConflictException`: "Book is not available for checkout" |
| Borrower already has this book checked out | `ConflictException`: "You already have this book checked out" |
| Borrower has 5 or more active checkouts | `ConflictException`: "Checkout limit reached (max 5 books)" |
| Returning a record that doesn't belong to borrower | `ForbiddenException` |
| Returning a record already returned | `ConflictException`: "This book has already been returned" |

### 3. Borrowings Service
- `checkout(borrowerId: string, dto: CheckoutDto)`:
  - Validate book exists → `NotFoundException`
  - Enforce all checkout business rules (see above)
  - Create `BorrowingRecord` with:
    - `checkedOutAt`: `new Date()`
    - `dueDate`: `new Date() + 14 days`
    - `returnedAt`: `null`
  - Decrement `book.availableQuantity` by 1 (within a Prisma transaction)
  - Return the created record with book details
- `returnBook(borrowerId: string, recordId: string)`:
  - Find record by ID → `NotFoundException`
  - Verify `record.borrowerId === borrowerId` → `ForbiddenException`
  - Verify `record.returnedAt === null` → `ConflictException`
  - Set `returnedAt` to `new Date()`
  - Increment `book.availableQuantity` by 1 (within a Prisma transaction)
  - Return updated record
- `getMyBorrowings(borrowerId: string)`:
  - Return all records where `borrowerId = borrowerId` AND `returnedAt = null`
  - Include book details (`title`, `author`, `isbn`, `shelfLocation`)
  - Annotate each record with `isOverdue: boolean` (computed: `dueDate < now`)
- `getAllBorrowings()` (admin):
  - Return all borrowing records with borrower name/email and book title/isbn
  - Ordered by `checkedOutAt` DESC
- `getOverdue()` (admin):
  - Return all records where `returnedAt = null` AND `dueDate < now`
  - Include borrower and book details
  - Ordered by `dueDate` ASC (most overdue first)

### 4. Borrowings Controller
- `POST /borrowings/checkout`
  - `@Roles(Role.BORROWER)`
  - `@Throttle({ default: { limit: 20, ttl: 60000 } })`
  - Body: `CheckoutDto`
  - Returns `201`
- `POST /borrowings/return/:id`
  - `@Roles(Role.BORROWER)`
  - Route param: borrowing record UUID
  - Returns `200`
- `GET /borrowings/my`
  - `@Roles(Role.BORROWER)`
  - Returns active checkouts with `isOverdue` flag
- `GET /borrowings`
  - `@Roles(Role.ADMIN)`
  - Returns all borrowing records
- `GET /borrowings/overdue`
  - `@Roles(Role.ADMIN)`
  - Returns all overdue records

### 5. Borrowings Module
- Import `BooksModule` (to access `BooksService` for quantity management — or handle via Prisma transaction directly)
- Provide `BorrowingsService`

### 6. Swagger Decorators
- `CheckoutDto`: add `@ApiProperty({ example: 'uuid-of-book' })` on `bookId`
- Controller:
  - `@ApiTags('Borrowings')` on the controller class
  - `@ApiCookieAuth()` on the controller class
  - `POST /borrowings/checkout`: `@ApiOperation({ summary: 'Check out a book' })`, `@ApiCreatedResponse`, `@ApiConflictResponse` (document all 3 conflict cases in description), `@ApiNotFoundResponse`
  - `POST /borrowings/return/:id`: `@ApiOkResponse`, `@ApiNotFoundResponse`, `@ApiForbiddenResponse`, `@ApiConflictResponse`
  - `GET /borrowings/my`: `@ApiOkResponse({ description: 'Active checkouts with isOverdue flag' })`
  - `GET /borrowings`: `@ApiOkResponse({ description: 'All borrowing records (admin only)' })`
  - `GET /borrowings/overdue`: `@ApiOkResponse({ description: 'All overdue records sorted by due date ASC' })`

### 7. Unit Tests (`borrowings.service.spec.ts`)
Test cases:
- `checkout`: success, book not found, quantity = 0, already checked out same book, limit of 5 reached
- `returnBook`: success, record not found, not owner, already returned
- `getMyBorrowings`: returns active checkouts with correct `isOverdue` flag
- `getAllBorrowings`: returns all records
- `getOverdue`: returns only overdue records

---

## Deliverables
- Full borrowing lifecycle (checkout → return)
- All 5 business rules enforced with correct HTTP status codes
- `isOverdue` flag on borrower's own checkout list
- Admin overdue list sorted by most overdue first
- Rate limiting on checkout (20 req/min)
- Checkout and return use Prisma transactions (atomic quantity updates)
- All unit tests pass

---

## Definition of Done
- [ ] Checking out a book with quantity 0 returns `409`
- [ ] Checking out the same book twice returns `409`
- [ ] Checking out a 6th book returns `409`
- [ ] Returning someone else's record returns `403`
- [ ] Returning an already-returned book returns `409`
- [ ] `GET /borrowings/my` includes `isOverdue: true` for past-due books
- [ ] `npm run test borrowings` — all tests pass
