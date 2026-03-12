# Sprint 7 — Finalization & Documentation

## Goal
Polish the application, ensure everything is production-ready, and deliver complete documentation for submission.

---

## Tasks

### 1. End-to-End Verification
- Run `docker-compose up --build` from scratch and verify:
  - DB starts and becomes healthy
  - App connects to DB and applies migrations
  - Seed script runs and creates admin user
- Manually smoke-test the full borrowing lifecycle:
  1. Register a borrower
  2. Admin logs in, adds a book
  3. Borrower logs in, checks out the book
  4. Verify quantity decremented
  5. Borrower returns the book
  6. Verify quantity restored
  7. Admin views analytics and exports

### 2. Full Test Suite Run
- Run `npm run test` across all modules
- Verify all tests pass with no warnings
- Check test coverage: `npm run test:cov`
- Ensure all 5 modules have meaningful coverage (>80% target)

### 3. Security Review
- Confirm passwords are **never** returned in any API response
- Confirm JWT cookie flags: `httpOnly`, `secure` (production), `sameSite: strict`
- Confirm `ValidationPipe` with `whitelist: true` strips unknown fields
- Confirm `GlobalExceptionFilter` doesn't leak stack traces in production (`NODE_ENV=production`)
- Confirm Prisma parameterized queries are used everywhere (no raw string interpolation)
- Review route guards — ensure no protected route is accidentally marked `@Public()`

### 4. CI — GitHub Actions
Create `.github/workflows/ci.yml` with the following pipeline triggered on `push` and `pull_request` to `main`:

**Jobs:**

- **lint**
  - Checkout code
  - Setup Node.js (version from `.nvmrc` or fixed LTS)
  - `npm ci`
  - `npm run lint`
  - `npm run format -- --check` (Prettier check, no write)

- **test**
  - Depends on `lint` job
  - Checkout code
  - Setup Node.js
  - `npm ci`
  - `npm run test` (unit tests, no DB needed — Prisma is mocked)
  - `npm run test:cov`
  - Upload coverage report as artifact

- **build**
  - Depends on `test` job
  - Checkout code
  - `npm ci`
  - `npm run build` (TypeScript compile, confirms no type errors)

Add a `README` badge showing CI status.

### 5. README.md
Write a comprehensive `README.md` at the project root with:

#### Sections:
- **Project Overview** — brief description
- **Prerequisites** — Node.js version, Docker, PostgreSQL
- **Setup (with Docker)**:
  ```bash
  cp .env.example .env
  # fill in values
  docker-compose up --build
  ```
- **Setup (without Docker)**:
  ```bash
  npm install
  npx prisma migrate dev
  npx prisma db seed
  npm run start:dev
  ```
- **Default Admin Credentials** (from seed)
- **Running Tests**:
  ```bash
  npm run test
  npm run test:cov
  ```
- **API Documentation** — full table of endpoints with method, path, auth, body, and example responses
- **Database Schema Diagram** — inline Mermaid ERD or link to image
- **Environment Variables Reference** — table of all `.env` keys

### 5. `.env.example`
Ensure the following variables are documented with placeholder values and comments:
```
# Application
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/library_db

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
```

### 6. Prisma Schema Diagram
- Generate an ERD using `prisma-erd-generator` or a manual Mermaid diagram
- Include in README or as `docs/schema-diagram.md`

### 7. Final Dockerfile & docker-compose Cleanup
- Confirm `.dockerignore` excludes: `node_modules`, `.env`, `dist`, `*.spec.ts`
- Confirm `docker-compose.yml` has:
  - Named volumes for PostgreSQL data
  - `restart: unless-stopped` on app service
  - Environment variables passed to app from `.env` file
  - A `migrate` entrypoint that runs `prisma migrate deploy` before starting the server

### 8. Git Hygiene
- Confirm `.gitignore` covers: `node_modules`, `dist`, `.env`, `*.log`, coverage output
- Ensure no secrets are committed
- Write a clean, descriptive commit history (or squash into logical commits)

---

## Deliverables
- Fully working application via `docker-compose up`
- All tests passing with >80% coverage
- `README.md` with complete setup and API documentation
- `.env.example` committed
- No secrets in repository
- Schema ERD included

---

## Definition of Done
- [ ] `docker-compose up --build` works from a clean state
- [ ] All unit tests pass: `npm run test`
- [ ] Coverage report shows >80% across all modules
- [ ] `npm run lint` exits with zero errors
- [ ] README covers setup, API endpoints, and env vars
- [ ] Swagger UI loads and all endpoints are documented
- [ ] CI pipeline passes on `main` (lint → test → build)
- [ ] No `password` field ever appears in an API response
- [ ] `.env` is gitignored, `.env.example` is committed
- [ ] Repository is clean and ready to share
