# Library Management System API

[![CI](https://github.com/your-username/library-management-system/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/library-management-system/actions/workflows/ci.yml)

A production-ready Library Management System REST API built with NestJS, Prisma, and PostgreSQL. Supports role-based access control (Admin/Borrower), book management, borrowing lifecycle, and reporting.

## Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **Docker** & **Docker Compose** (for Docker setup)
- **PostgreSQL** >= 15 (for non-Docker setup)

## Setup (with Docker)

```bash
cp .env.example .env
# Edit .env to set your JWT_SECRET and other values
docker-compose up --build
```

The application will be available at `http://localhost:3000/api`.
Swagger UI: `http://localhost:3000/api/docs`

## Setup (without Docker)

```bash
npm install
# Make sure PostgreSQL is running and DATABASE_URL is set in .env
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

## Default Admin Credentials

After running the seed:
- **Email:** `admin@library.com`
- **Password:** `Admin@12345`

## Running Tests

```bash
# Unit tests
npm run test

# With coverage report
npm run test:cov

# Lint check
npm run lint
```

## API Endpoints

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register as borrower |
| POST | `/api/auth/login` | Public | Login (sets HTTP-only cookie) |
| POST | `/api/auth/logout` | Authenticated | Logout (clears cookie) |

### Books

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/books` | Authenticated | List all books |
| GET | `/api/books/search?q=&by=title\|author\|isbn` | Authenticated | Search books (rate limited: 20/min) |
| GET | `/api/books/:id` | Authenticated | Get book by ID |
| POST | `/api/books` | Admin | Create new book |
| PATCH | `/api/books/:id` | Admin | Update book |
| DELETE | `/api/books/:id` | Admin | Delete book (blocked if checked out) |

### Borrowers

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/borrowers` | Admin | List all borrowers |
| GET | `/api/borrowers/:id` | Admin | Get borrower by ID |
| PATCH | `/api/borrowers/:id` | Admin | Update borrower |
| DELETE | `/api/borrowers/:id` | Admin | Delete borrower (blocked if active checkouts) |

### Borrowings

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/borrowings/checkout` | Borrower | Check out a book (rate limited: 20/min) |
| POST | `/api/borrowings/return/:id` | Borrower | Return a book |
| GET | `/api/borrowings/my` | Borrower | My active checkouts with `isOverdue` flag |
| GET | `/api/borrowings` | Admin | All borrowing records |
| GET | `/api/borrowings/overdue` | Admin | All overdue records |

### Reports

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/reports/analytics` | Admin | Last month analytics |
| GET | `/api/reports/export/overdue/last-month?format=csv\|xlsx` | Admin | Export overdue borrowings |
| GET | `/api/reports/export/all/last-month?format=csv\|xlsx` | Admin | Export all borrowings |

## Business Rules

- Default checkout duration: **14 days**
- Max concurrent checkouts per borrower: **5 books**
- Book with `availableQuantity = 0` cannot be checked out
- Same book cannot be checked out twice concurrently by the same borrower
- Books with active checkouts cannot be deleted
- Borrowers with active checkouts cannot be deleted
- Rate limiting: 20 requests/minute per IP on search and checkout endpoints

## Database Schema

```mermaid
erDiagram
    users {
        uuid id PK
        string name
        string email UK
        string password
        enum role
        datetime registered_at
    }

    books {
        uuid id PK
        string title
        string author
        string isbn UK
        int available_quantity
        string shelf_location
        datetime created_at
        datetime updated_at
    }

    borrowing_records {
        uuid id PK
        uuid book_id FK
        uuid borrower_id FK
        datetime checked_out_at
        datetime due_date
        datetime returned_at
    }

    users ||--o{ borrowing_records : "has"
    books ||--o{ borrowing_records : "has"
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Application port | `3000` |
| `NODE_ENV` | Runtime environment | `development` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://user:pass@localhost:5432/library_db` |
| `JWT_SECRET` | Secret for JWT signing | `your-super-secret-key` |
| `JWT_EXPIRES_IN` | JWT expiry duration | `7d` |

## Security

- Passwords stored as bcrypt hash (10 rounds)
- JWT stored in HTTP-only, SameSite=Strict cookie
- Secure cookie flag enabled in production
- Global exception filter hides stack traces in production
- All routes protected by JWT auth guard by default
- Role-based access enforced via RolesGuard

## Tech Stack

- **Framework:** NestJS
- **Language:** TypeScript (strict mode)
- **ORM:** Prisma 7
- **Database:** PostgreSQL 15
- **Auth:** JWT + HTTP-only Cookies
- **Testing:** Jest
- **Export:** ExcelJS (CSV + XLSX)
- **Rate Limiting:** @nestjs/throttler
- **Containerization:** Docker + docker-compose
