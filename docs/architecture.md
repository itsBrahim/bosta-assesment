# Library Management System — Architecture Plan

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | NestJS |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT stored in HTTP-only cookies |
| Testing | Jest (NestJS built-in) |
| Export | `exceljs` (CSV + XLSX) |
| Rate Limiting | `@nestjs/throttler` |
| Containerization | Docker + docker-compose |

---

## Database Schema

### `users`
Unified table for both roles.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR | |
| email | VARCHAR UNIQUE | |
| password | VARCHAR | bcrypt hashed |
| role | ENUM (ADMIN, BORROWER) | |
| registered_at | TIMESTAMP | |

### `books`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| title | VARCHAR | indexed |
| author | VARCHAR | indexed |
| isbn | VARCHAR UNIQUE | ISBN-10/13 validated |
| available_quantity | INT | >= 0 |
| shelf_location | VARCHAR | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `borrowing_records`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| book_id | UUID FK → books | |
| borrower_id | UUID FK → users | |
| checked_out_at | TIMESTAMP | |
| due_date | TIMESTAMP | default: +14 days from checkout |
| returned_at | TIMESTAMP | null = still checked out |

---

## Modules & API Endpoints

### Auth — `/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Borrower self-registration |
| POST | `/auth/login` | Public | Login for both roles, sets HTTP-only JWT cookie |
| POST | `/auth/logout` | Authenticated | Clears JWT cookie |

### Books — `/books`

Admin: full CRUD. Borrower: read-only.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/books` | Authenticated | List all books |
| GET | `/books/search?q=&by=title\|author\|isbn` | Authenticated | Partial match search — **rate limited** |
| GET | `/books/:id` | Authenticated | Get single book |
| POST | `/books` | Admin | Add a book |
| PATCH | `/books/:id` | Admin | Update a book |
| DELETE | `/books/:id` | Admin | Delete a book |

### Borrowers — `/borrowers`

Admin only.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/borrowers` | Admin | List all borrowers |
| GET | `/borrowers/:id` | Admin | Get single borrower |
| PATCH | `/borrowers/:id` | Admin | Update borrower details |
| DELETE | `/borrowers/:id` | Admin | Delete a borrower |

### Borrowings — `/borrowings`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/borrowings/checkout` | Borrower | Check out a book — **rate limited** |
| POST | `/borrowings/return/:id` | Borrower | Return a book |
| GET | `/borrowings/my` | Borrower | View own active checkouts |
| GET | `/borrowings` | Admin | View all borrowing records |
| GET | `/borrowings/overdue` | Admin | List all overdue records |

### Reports — `/reports`

Admin only.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/reports/analytics` | Admin | Borrowing stats for last month |
| GET | `/reports/export/overdue/last-month` | Admin | Export overdue borrows (CSV + XLSX) |
| GET | `/reports/export/all/last-month` | Admin | Export all borrowings (CSV + XLSX) |

---

## Project Structure

```
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   └── auth.service.spec.ts
├── books/
│   ├── books.controller.ts
│   ├── books.service.ts
│   ├── books.module.ts
│   ├── dto/
│   └── books.service.spec.ts
├── borrowers/
│   ├── borrowers.controller.ts
│   ├── borrowers.service.ts
│   ├── borrowers.module.ts
│   ├── dto/
│   └── borrowers.service.spec.ts
├── borrowings/
│   ├── borrowings.controller.ts
│   ├── borrowings.service.ts
│   ├── borrowings.module.ts
│   ├── dto/
│   └── borrowings.service.spec.ts
├── reports/
│   ├── reports.controller.ts
│   ├── reports.service.ts
│   ├── reports.module.ts
│   └── reports.service.spec.ts
├── prisma/
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   └── current-user.decorator.ts
│   └── filters/
│       └── global-exception.filter.ts
└── main.ts
```

---

## Business Rules

| Rule | Value |
|---|---|
| Default checkout duration | 14 days |
| Max concurrent checkouts per borrower | 5 books |
| Same book checked out twice concurrently | Blocked |
| Available quantity = 0 | Hard block (no reservations in v1) |
| ISBN validation | ISBN-10 and ISBN-13 checksum format |
| Rate limit | 20 requests / minute per IP |
| Report period | Last calendar month |
| Export formats | CSV + XLSX (both) |

---

## Auth Flow

1. User registers (`BORROWER` role) or admin is seeded directly in DB.
2. On login, server issues a signed JWT stored in an **HTTP-only, Secure, SameSite=Strict** cookie.
3. All protected routes read the JWT from the cookie via a `JwtAuthGuard`.
4. A `RolesGuard` + `@Roles()` decorator enforces role-based access control.
5. Logout clears the cookie server-side.

---

## Rate Limiting

Applied via `@nestjs/throttler`:

| Endpoint | Limit |
|---|---|
| `GET /books/search` | 20 req / min per IP |
| `POST /borrowings/checkout` | 20 req / min per IP |

---

## Testing

Unit tests using Jest on all 5 modules:
- `auth.service.spec.ts`
- `books.service.spec.ts`
- `borrowers.service.spec.ts`
- `borrowings.service.spec.ts`
- `reports.service.spec.ts`

Prisma client is mocked in all tests using a Jest mock provider.
