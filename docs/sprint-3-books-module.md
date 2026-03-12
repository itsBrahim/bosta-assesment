# Sprint 3 — Books Module

## Goal
Implement full book management with admin CRUD, read-only access for borrowers, partial-match search with rate limiting, and ISBN validation.

---

## Tasks

### 1. ISBN Validator
- Create a custom `IsISBN` validator using `class-validator`'s `registerDecorator`
- Validate both ISBN-10 and ISBN-13 checksum algorithms:
  - **ISBN-10**: strip hyphens, 9 digits + check digit (0–9 or X), weighted sum mod 11 = 0
  - **ISBN-13**: strip hyphens, 13 digits, alternating weight (1, 3) sum mod 10 = 0
- Return descriptive error message: `"isbn must be a valid ISBN-10 or ISBN-13"`

### 2. DTOs
- `CreateBookDto`:
  - `title`: string, required, not empty
  - `author`: string, required, not empty
  - `isbn`: string, required, `@IsISBN()` custom validator
  - `availableQuantity`: integer, min 0, required
  - `shelfLocation`: string, required, not empty
- `UpdateBookDto`: `PartialType(CreateBookDto)` — all fields optional
- `SearchBookDto`:
  - `q`: string, required, min length 1
  - `by`: enum (`title`, `author`, `isbn`), required

### 3. Books Service
- `create(dto: CreateBookDto)`:
  - Check ISBN uniqueness → throw `ConflictException` if duplicate
  - Create and return book
- `findAll()`:
  - Return all books ordered by `title` ASC
- `findOne(id: string)`:
  - Find by UUID → throw `NotFoundException` if not found
- `search(dto: SearchBookDto)`:
  - Use Prisma `contains` + `mode: 'insensitive'` filter on the specified field
  - Return matching books ordered by relevance (title ASC)
- `update(id: string, dto: UpdateBookDto)`:
  - Check existence first → `NotFoundException`
  - If ISBN is being updated, check uniqueness → `ConflictException`
  - Return updated book
- `remove(id: string)`:
  - Check existence → `NotFoundException`
  - Check if book has any unreturned borrowing records → throw `ConflictException` ("Book is currently checked out and cannot be deleted")
  - Delete and return confirmation

### 4. Books Controller
- Apply `JwtAuthGuard` globally (already registered); no extra guard needed
- `GET /books` — `@Roles(Role.ADMIN, Role.BORROWER)` — returns all books
- `GET /books/search` — `@Roles(Role.ADMIN, Role.BORROWER)` — `@Throttle({ default: { limit: 20, ttl: 60000 } })` — calls `booksService.search()`
- `GET /books/:id` — `@Roles(Role.ADMIN, Role.BORROWER)` — returns single book
- `POST /books` — `@Roles(Role.ADMIN)` — returns `201`
- `PATCH /books/:id` — `@Roles(Role.ADMIN)` — returns `200`
- `DELETE /books/:id` — `@Roles(Role.ADMIN)` — returns `200`

### 5. Books Module
- Import `ThrottlerModule` (configured in AppModule, override per-route)
- Provide `BooksService`
- Export `BooksService` (will be needed by BorrowingsModule for quantity checks)

### 6. Swagger Decorators
- `CreateBookDto` / `UpdateBookDto` / `SearchBookDto`: add `@ApiProperty()` with `example` and `description` to every field
- Controller:
  - `@ApiTags('Books')` on the controller class
  - `@ApiCookieAuth()` on the controller class (applies to all routes)
  - `GET /books`: `@ApiOkResponse({ description: 'List of all books' })`
  - `GET /books/search`: `@ApiOkResponse`, `@ApiQuery({ name: 'q' })`, `@ApiQuery({ name: 'by', enum: ['title','author','isbn'] })`
  - `POST /books`: `@ApiCreatedResponse`, `@ApiForbiddenResponse`, `@ApiConflictResponse` (duplicate ISBN)
  - `PATCH /books/:id`: `@ApiOkResponse`, `@ApiNotFoundResponse`, `@ApiForbiddenResponse`
  - `DELETE /books/:id`: `@ApiOkResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse` (checked out)

### 7. Unit Tests (`books.service.spec.ts`)
Test cases:
- `create`: success, duplicate ISBN conflict
- `findAll`: returns list
- `findOne`: success, not found
- `search`: returns filtered results by title / author / isbn
- `update`: success, not found, duplicate ISBN on update
- `remove`: success, not found, blocked when book is checked out

---

## Deliverables
- Full CRUD for books (admin only for write operations)
- Search by title/author/isbn with partial/case-insensitive matching
- Rate limiting on search endpoint (20 req/min)
- ISBN-10 and ISBN-13 checksum validation on create and update
- Delete blocked if book has active checkouts
- All unit tests pass

---

## Definition of Done
- [ ] `POST /books` with invalid ISBN returns `400` with descriptive message
- [ ] `POST /books` with duplicate ISBN returns `409`
- [ ] `GET /books/search?q=harry&by=title` returns matching books
- [ ] `DELETE /books/:id` for a checked-out book returns `409`
- [ ] Borrower calling `POST /books` returns `403`
- [ ] `npm run test books` — all tests pass
