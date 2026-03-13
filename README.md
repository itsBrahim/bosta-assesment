# Library Management System API

[![CI](https://github.com/itsBrahim/bosta-assesment/actions/workflows/ci.yml/badge.svg)](https://github.com/itsBrahim/bosta-assesment/actions/workflows/ci.yml)

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

| Method | Endpoint             | Access        | Description                   |
| ------ | -------------------- | ------------- | ----------------------------- |
| POST   | `/api/auth/register` | Public        | Register as borrower          |
| POST   | `/api/auth/login`    | Public        | Login (sets HTTP-only cookie) |
| POST   | `/api/auth/logout`   | Authenticated | Logout (clears cookie)        |

### Books

| Method | Endpoint                                      | Access        | Description                          |
| ------ | --------------------------------------------- | ------------- | ------------------------------------ |
| GET    | `/api/books`                                  | Authenticated | List all books                       |
| GET    | `/api/books/search?q=&by=title\|author\|isbn` | Authenticated | Search books (rate limited: 20/min)  |
| GET    | `/api/books/:id`                              | Authenticated | Get book by ID                       |
| POST   | `/api/books`                                  | Admin         | Create new book                      |
| PATCH  | `/api/books/:id`                              | Admin         | Update book                          |
| DELETE | `/api/books/:id`                              | Admin         | Delete book (blocked if checked out) |

### Borrowers

| Method | Endpoint             | Access | Description                                   |
| ------ | -------------------- | ------ | --------------------------------------------- |
| GET    | `/api/borrowers`     | Admin  | List all borrowers                            |
| GET    | `/api/borrowers/:id` | Admin  | Get borrower by ID                            |
| PATCH  | `/api/borrowers/:id` | Admin  | Update borrower                               |
| DELETE | `/api/borrowers/:id` | Admin  | Delete borrower (blocked if active checkouts) |

### Borrowings

| Method | Endpoint                     | Access   | Description                               |
| ------ | ---------------------------- | -------- | ----------------------------------------- |
| POST   | `/api/borrowings/checkout`   | Borrower | Check out a book (rate limited: 20/min)   |
| POST   | `/api/borrowings/return/:id` | Borrower | Return a book                             |
| GET    | `/api/borrowings/my`         | Borrower | My active checkouts with `isOverdue` flag |
| GET    | `/api/borrowings`            | Admin    | All borrowing records                     |
| GET    | `/api/borrowings/overdue`    | Admin    | All overdue records                       |

### Reports

| Method | Endpoint                                                  | Access | Description               |
| ------ | --------------------------------------------------------- | ------ | ------------------------- |
| GET    | `/api/reports/analytics`                                  | Admin  | Last month analytics      |
| GET    | `/api/reports/export/overdue/last-month?format=csv\|xlsx` | Admin  | Export overdue borrowings |
| GET    | `/api/reports/export/all/last-month?format=csv\|xlsx`     | Admin  | Export all borrowings     |

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

| Variable         | Description               | Example                                            |
| ---------------- | ------------------------- | -------------------------------------------------- |
| `PORT`           | Application port          | `3000`                                             |
| `NODE_ENV`       | Runtime environment       | `development`                                      |
| `DATABASE_URL`   | PostgreSQL connection URL | `postgresql://user:pass@localhost:5432/library_db` |
| `JWT_SECRET`     | Secret for JWT signing    | `your-super-secret-key`                            |
| `JWT_EXPIRES_IN` | JWT expiry duration       | `7d`                                               |

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

---

## Built with Claude AI

[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude%20Sonnet-blueviolet?logo=anthropic&logoColor=white)](https://claude.ai)

This project was implemented end-to-end by **Claude Sonnet** (Anthropic), operating as a fully autonomous software engineering agent. Rather than using AI as a simple code-completion tool, it was orchestrated as a structured agent following professional engineering practices.

### How it was orchestrated

The implementation was driven by a single, detailed prompt ([`docs/agent-prompt.md`](docs/agent-prompt.md)) that instructed the agent to:

- Read the full architecture spec ([`docs/architecture.md`](docs/architecture.md)) before writing any code
- Implement the system across **7 sequential sprints**, each with its own branch and PR
- Pass a mandatory **quality gate before merging each sprint** — no skipping steps

### Sprint plan

| Sprint | Branch | Deliverable |
|--------|--------|-------------|
| 1 | `sprint/1-project-setup` | NestJS bootstrap, Prisma schema, Docker, Swagger, GlobalExceptionFilter |
| 2 | `sprint/2-auth-module` | JWT cookie auth, guards, decorators, unit tests |
| 3 | `sprint/3-books-module` | Books CRUD, custom ISBN-10/13 validator, search, rate limiting |
| 4 | `sprint/4-borrowers-module` | Admin borrowers CRUD, password never in responses |
| 5 | `sprint/5-borrowings-module` | Borrowing lifecycle, Prisma transactions, business rules |
| 6 | `sprint/6-reports-module` | Analytics, ExcelJS CSV/XLSX exports |
| 7 | `sprint/7-finalization` | GitHub Actions CI, README, security audit |

Each sprint spec lives in [`docs/`](docs/) — the agent was instructed to follow these exactly and not improvise on architectural decisions.

### Quality gate (enforced per sprint before PR merge)

```
npm run lint          # Zero ESLint errors
npm run format:check  # Prettier clean
npx tsc --noEmit      # Zero TypeScript errors
npm run test          # All unit tests pass
npm run test:cov      # >80% coverage on new modules
npm run build         # Compiles successfully
```

### Technical challenges resolved by the agent

During development the agent autonomously diagnosed and fixed several non-trivial issues introduced by **Prisma 7** (a major version released after its training cutoff):

| Problem | Root cause | Fix |
|---------|-----------|-----|
| `PrismaClient` couldn't connect | Prisma 7 no longer accepts a `url` field in `schema.prisma` | Migrated datasource config to `prisma.config.ts` using `defineConfig()` |
| Seed failed at runtime | Prisma 7 requires driver adapters; `new PrismaClient()` without adapter throws | Updated seed to use `new PrismaPg({ connectionString })` adapter |
| `$transaction([op1, op2])` silently failed | Array-based transactions unsupported with `@prisma/adapter-pg` | Switched to interactive callback form: `$transaction(async (tx) => { ... })` |
| `@CurrentUser()` always returned `undefined` | `JwtStrategy.validate()` returned `{ id }` but `JwtPayload` expected `{ sub }` | Fixed `validate()` to return `{ sub: user.id, ...rest }` |
| Docker seed used `ts-node` at runtime | `ts-node` is a devDependency, not available in production stage | Added `tsconfig.seed.json`; seed pre-compiled to `dist/prisma/seed.js` at build time |
| CI tests failed with `Module has no exported member` | `npx prisma generate` was never run in CI pipeline | Added explicit `prisma generate` step after `npm ci` in every job |

### What "AI best practices" looks like here

Using AI effectively is not about prompting it to write code — it's about giving it the same structure and constraints a human engineer would work under:

- **Spec-first:** A complete architecture document and sprint specs were written before implementation started. The agent had no room to invent shortcuts.
- **Incremental delivery:** Each sprint was a reviewable PR, not a single giant dump.
- **No rubber-stamping:** Quality gates had to actually pass — the agent fixed real linting, TypeScript, and test failures at each stage.
- **Verifiable output:** The final deliverable was smoke-tested end-to-end on both local PostgreSQL and a clean `docker-compose up --build` run, confirming the full borrowing lifecycle (register → checkout → `isOverdue` flag → return → quantity restored).

The complete prompt and sprint specs are in [`docs/`](docs/).

