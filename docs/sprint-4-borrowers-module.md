# Sprint 4 — Borrowers Module

## Goal
Implement admin-only borrower management (list, view, update, delete) with full unit test coverage.

---

## Tasks

### 1. DTOs
- `UpdateBorrowerDto`:
  - `name`: string, optional, not empty if provided
  - `email`: valid email, optional
  - Note: password update is excluded from this module (out of scope for admin management)

### 2. Borrowers Service
- `findAll()`:
  - Return all users where `role = BORROWER`, ordered by `registeredAt` DESC
  - Exclude `password` field from all results
- `findOne(id: string)`:
  - Find user by UUID where `role = BORROWER`
  - Throw `NotFoundException` if not found or if user is an admin
  - Return without password
- `update(id: string, dto: UpdateBorrowerDto)`:
  - Check borrower exists → `NotFoundException`
  - If email is being changed, check uniqueness across all users → `ConflictException`
  - Update and return without password
- `remove(id: string)`:
  - Check borrower exists → `NotFoundException`
  - Check if borrower has any unreturned borrowing records → throw `ConflictException` ("Borrower has books currently checked out and cannot be deleted")
  - Delete borrower (cascade deletes borrowing records via Prisma relation)
  - Return confirmation

### 3. Borrowers Controller
- All routes restricted to `@Roles(Role.ADMIN)`
- `GET /borrowers` — returns list of all borrowers
- `GET /borrowers/:id` — returns single borrower
- `PATCH /borrowers/:id` — updates borrower
- `DELETE /borrowers/:id` — deletes borrower

### 4. Borrowers Module
- Provide `BorrowersService`
- Export `BorrowersService` (will be needed by BorrowingsModule to validate borrower existence)

### 5. Swagger Decorators
- `UpdateBorrowerDto`: add `@ApiPropertyOptional()` with `example` to each field
- Controller:
  - `@ApiTags('Borrowers')` on the controller class
  - `@ApiCookieAuth()` on the controller class
  - `GET /borrowers`: `@ApiOkResponse({ description: 'List of all borrowers (admin only)' })`
  - `GET /borrowers/:id`: `@ApiOkResponse`, `@ApiNotFoundResponse`
  - `PATCH /borrowers/:id`: `@ApiOkResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse`
  - `DELETE /borrowers/:id`: `@ApiOkResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse` (has active checkouts)
  - All routes: `@ApiForbiddenResponse` (non-admin access)

### 6. Unit Tests (`borrowers.service.spec.ts`)
Test cases:
- `findAll`: returns list of borrowers (excludes password, excludes admins)
- `findOne`: success, not found, returns admin ID → not found
- `update`: success, not found, duplicate email conflict
- `remove`: success, not found, blocked when borrower has active checkouts

---

## Deliverables
- Admin can list, view, update, and delete borrowers
- Borrowers are protected from deletion if they have active checkouts
- Password never appears in any response
- All unit tests pass

---

## Definition of Done
- [ ] `GET /borrowers` called by a borrower returns `403`
- [ ] `GET /borrowers/:id` with an admin's ID returns `404`
- [ ] `DELETE /borrowers/:id` for a borrower with active checkouts returns `409`
- [ ] No response from this module ever includes a `password` field
- [ ] `npm run test borrowers` — all tests pass
