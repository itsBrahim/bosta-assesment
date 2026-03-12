# Agent Implementation Prompt — Library Management System

## Your Mission

You are implementing a production-ready **Library Management System** backend from scratch using the specifications defined in `/docs/architecture.md` and Sprints 1–7 (`/docs/sprint-*.md`). You will work through 7 sprints sequentially. Each sprint is a self-contained unit of work that ends with a Pull Request, a full quality gate pass, and a clean git history. **Do not begin the next sprint until the current sprint's PR is merged and all checks pass.**

Read all sprint documents in `/docs/` before starting. Do not improvise on architecture decisions — follow the specs exactly. If you encounter an ambiguity not covered in the docs, make the most conservative, correct choice and leave a `// TODO: confirm` comment.

---

## Repository Setup (Before Sprint 1)

1. Initialize a Git repository in the project root if one does not exist: `git init`
2. Create the default branch: `git checkout -b main`
3. Make an initial empty commit: `git commit --allow-empty -m "chore: initial commit"`
4. All sprint branches are cut from `main` after the previous sprint's PR is merged.

---

## Commit Message Convention

All commits **must** follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Allowed types:
| Type | When to use |
|---|---|
| `feat` | A new feature or endpoint |
| `fix` | A bug fix |
| `chore` | Build setup, config, tooling, dependencies |
| `test` | Adding or updating tests |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons — no logic change |
| `perf` | Performance improvement |

### Scope examples: `auth`, `books`, `borrowers`, `borrowings`, `reports`, `prisma`, `docker`, `ci`, `swagger`, `config`

### Rules:
- Subject line: max 72 characters, imperative mood, no period at end
- Never use vague messages like `fix stuff`, `update`, `wip`
- Each logical change gets its own commit — do not bundle unrelated changes
- No `--no-verify` under any circumstances

### Examples:
```
feat(auth): implement JWT cookie-based login and logout
feat(books): add ISBN-10/13 checksum validator
chore(prisma): add initial schema with users, books, borrowing_records
test(borrowings): add unit tests for checkout business rules
fix(reports): correct last-month date range boundary calculation
docs(swagger): add ApiProperty decorators to all DTOs
chore(docker): add multi-stage Dockerfile and docker-compose
ci: add GitHub Actions lint, test, and build pipeline
```

---

## Sprint Workflow (Repeat for Every Sprint)

For each sprint, follow this exact sequence:

### Step 1 — Branch
```bash
git checkout main
git pull origin main
git checkout -b sprint/<sprint-number>-<short-description>
```
Branch naming examples:
- `sprint/1-project-setup`
- `sprint/2-auth-module`
- `sprint/3-books-module`
- `sprint/4-borrowers-module`
- `sprint/5-borrowings-module`
- `sprint/6-reports-module`
- `sprint/7-finalization`

### Step 2 — Implement
- Follow the tasks listed in the sprint document exactly
- Commit logically as you go — do not save everything for one giant commit at the end
- Typical commit cadence per sprint: 4–8 commits covering config, implementation, tests, swagger decorators separately

### Step 3 — Quality Gate (MUST PASS before PR)
Run all of the following and fix every failure before opening the PR:

```bash
# 1. Lint — zero errors, zero warnings treated as errors
npm run lint

# 2. Format check — no unformatted files
npm run format -- --check

# 3. Type check — zero TypeScript errors
npx tsc --noEmit

# 4. Unit tests — all pass
npm run test

# 5. Test coverage — must be >80% on all modules introduced in this sprint
npm run test:cov

# 6. Build — compiles successfully
npm run build
```

If any step fails: fix it, commit the fix, re-run the full gate from the top. Do not skip steps.

### Step 4 — PR Description
Open a Pull Request from `sprint/<n>-<name>` → `main` with the following structure:

```markdown
## Sprint <N> — <Sprint Name>

### Summary
<2–3 sentences describing what this sprint implements>

### Changes
- <bullet list of meaningful changes>

### Quality Gate
- [ ] `npm run lint` — passed
- [ ] `npm run format -- --check` — passed
- [ ] `npx tsc --noEmit` — passed
- [ ] `npm run test` — passed (X tests, X suites)
- [ ] `npm run test:cov` — passed (>80% coverage)
- [ ] `npm run build` — passed

### Test Coverage Summary
<paste key coverage numbers from test:cov output>

### Notes
<any deviations, known issues, or TODOs>
```

### Step 5 — Merge
Merge the PR into `main` using **squash merge** if the sprint has more than 10 commits, otherwise use a regular merge. After merge:
```bash
git checkout main
git pull origin main
git branch -d sprint/<n>-<name>
```

---

## Sprint-by-Sprint Specifications

### Sprint 1 — Project Setup & Foundation
**Branch:** `sprint/1-project-setup`
**Reference:** `/docs/sprint-1-project-setup.md`

Key deliverables:
- NestJS project initialized with TypeScript strict mode
- ESLint + Prettier fully configured, `npm run lint` and `npm run format` scripts work
- `@nestjs/config` with `.env` / `.env.example`
- `Dockerfile` (multi-stage) + `docker-compose.yml` (app + db with healthcheck)
- Prisma schema with `User`, `Book`, `BorrowingRecord` models, enum `Role`, all indexes
- Initial migration: `prisma migrate dev --name init`
- Seed script creating a default admin user
- `PrismaService` + `PrismaModule` (global)
- `GlobalExceptionFilter` handling `HttpException`, Prisma `P2002`, and unknown errors
- `SwaggerModule` configured on `/api/docs`, disabled in production
- `main.ts` fully bootstrapped: ValidationPipe, cookie-parser, CORS, global prefix `/api`

Commit sequence suggestion:
```
chore: initialize nestjs project with typescript strict config
chore(eslint): add eslint and prettier configuration
chore(docker): add dockerfile and docker-compose with postgres
chore(prisma): add schema with users, books, borrowing_records models
chore(prisma): add initial migration and admin seed script
feat(prisma): add prisma service and global prisma module
feat(filters): add global exception filter with prisma error mapping
feat(swagger): bootstrap swagger module on /api/docs
chore(main): configure validation pipe, cookie-parser, cors, and global prefix
```

---

### Sprint 2 — Authentication Module
**Branch:** `sprint/2-auth-module`
**Reference:** `/docs/sprint-2-auth-module.md`

Key deliverables:
- `RegisterDto`, `LoginDto` with `class-validator` decorators
- `JwtStrategy` extracting token from `req.cookies['access_token']`
- `JwtAuthGuard`, `RolesGuard` registered globally in `AppModule`
- `@Roles()`, `@Public()`, `@CurrentUser()` decorators
- `AuthService`: register (bcrypt hash), login (bcrypt compare, sign JWT), logout
- `AuthController`: POST /auth/register, /auth/login (sets HTTP-only cookie), /auth/logout
- `AuthModule` with `JwtModule.registerAsync()` from `ConfigService`
- Swagger: `@ApiTags`, `@ApiProperty`, response decorators on all routes
- Unit tests: register success/conflict, login success/not-found/wrong-password

Commit sequence suggestion:
```
feat(auth): add register and login DTOs with validation
feat(auth): implement jwt strategy with cookie extraction
feat(auth): add jwt and roles guards with public decorator
feat(auth): add roles, current-user, and public decorators
feat(auth): implement auth service with register and login logic
feat(auth): add auth controller with cookie-setting login
docs(swagger): add swagger decorators to auth module
test(auth): add unit tests for auth service
```

---

### Sprint 3 — Books Module
**Branch:** `sprint/3-books-module`
**Reference:** `/docs/sprint-3-books-module.md`

Key deliverables:
- Custom `@IsISBN()` validator (ISBN-10 and ISBN-13 checksum)
- `CreateBookDto`, `UpdateBookDto` (PartialType), `SearchBookDto`
- `BooksService`: create, findAll, findOne, search (case-insensitive contains), update, remove
- Business rules: duplicate ISBN → 409, delete blocked if checked out → 409
- `BooksController` with role guards; `GET /books/search` rate-limited (20/min)
- `BooksModule` exporting `BooksService`
- Swagger decorators on all routes and DTOs
- Unit tests: all 6 service methods covered including edge cases

Commit sequence suggestion:
```
feat(books): add isbn-10/13 checksum validator
feat(books): add create, update, and search DTOs
feat(books): implement books service with full crud and search
feat(books): add books controller with role-based access control
feat(books): apply throttle rate limiting on search endpoint
docs(swagger): add swagger decorators to books module
test(books): add unit tests for books service
```

---

### Sprint 4 — Borrowers Module
**Branch:** `sprint/4-borrowers-module`
**Reference:** `/docs/sprint-4-borrowers-module.md`

Key deliverables:
- `UpdateBorrowerDto` with optional fields
- `BorrowersService`: findAll (BORROWER role only, no password), findOne, update, remove
- Business rule: delete blocked if active checkouts → 409; admin ID lookup → 404
- Password excluded from every response (use Prisma `select` or `omit`)
- `BorrowersController` — all routes admin-only
- `BorrowersModule` exporting `BorrowersService`
- Swagger decorators
- Unit tests: all 4 service methods with edge cases

Commit sequence suggestion:
```
feat(borrowers): add update borrower DTO
feat(borrowers): implement borrowers service with admin-only crud
feat(borrowers): add borrowers controller restricted to admin role
docs(swagger): add swagger decorators to borrowers module
test(borrowers): add unit tests for borrowers service
```

---

### Sprint 5 — Borrowings Module
**Branch:** `sprint/5-borrowings-module`
**Reference:** `/docs/sprint-5-borrowings-module.md`

Key deliverables:
- `CheckoutDto` with UUID validation on `bookId`
- `BorrowingsService`: checkout, returnBook, getMyBorrowings (with `isOverdue` flag), getAllBorrowings, getOverdue
- All business rules enforced (quantity 0, same book, 5-book cap, ownership, already returned)
- Checkout + return use **Prisma transactions** for atomic quantity updates
- `BorrowingsController`: checkout rate-limited (20/min), correct role guards
- `BorrowingsModule`
- Swagger decorators with conflict cases documented
- Unit tests: all 5 service methods with all edge cases

Commit sequence suggestion:
```
feat(borrowings): add checkout DTO with uuid validation
feat(borrowings): implement checkout with business rule enforcement
feat(borrowings): implement return book with ownership validation
feat(borrowings): implement get-my-borrowings with isOverdue flag
feat(borrowings): implement admin get-all and get-overdue
feat(borrowings): use prisma transactions for atomic quantity updates
feat(borrowings): add borrowings controller with rate limiting on checkout
docs(swagger): add swagger decorators to borrowings module
test(borrowings): add unit tests for borrowings service
```

---

### Sprint 6 — Reports Module
**Branch:** `sprint/6-reports-module`
**Reference:** `/docs/sprint-6-reports-module.md`

Key deliverables:
- `getLastMonthRange()` utility returning `{ from, to }` for the last calendar month
- `ReportsService`: getAnalytics (totalCheckouts, totalReturns, overdueCount, topBooks, topBorrowers), exportOverdueLastMonth, exportAllLastMonth
- Shared `generateExport()` helper using `exceljs` for both XLSX and CSV
- XLSX: bold header row, auto-fit columns, piped to response
- CSV: `exceljs` CSV writer piped to response
- `?format=csv|xlsx` query param, default `xlsx`
- `ReportsController` — all admin-only
- Swagger decorators with `@ApiProduces` and `@ApiQuery`
- Unit tests: analytics structure, date range correctness, export row counts

Commit sequence suggestion:
```
feat(reports): add last-month date range utility
feat(reports): implement analytics query for borrowing stats
feat(reports): add exceljs export helper for csv and xlsx
feat(reports): implement overdue and all-borrowings export endpoints
feat(reports): add reports controller with format query param
docs(swagger): add swagger decorators to reports module
test(reports): add unit tests for reports service
```

---

### Sprint 7 — Finalization & Documentation
**Branch:** `sprint/7-finalization`
**Reference:** `/docs/sprint-7-finalization.md`

Key deliverables:
- `.github/workflows/ci.yml` with three jobs: `lint` → `test` (with coverage artifact) → `build`
- CI triggers on `push` and `pull_request` to `main`
- README badge showing CI status
- `README.md` covering: overview, prerequisites, Docker setup, non-Docker setup, default admin credentials, running tests, full API endpoint table, database ERD (Mermaid), env vars reference
- `.env.example` complete and committed
- `.dockerignore` excluding `node_modules`, `.env`, `dist`, `*.spec.ts`
- Security review: no password in responses, no stack traces in production, all routes guarded
- Final `npm run lint`, `npm run test`, `npm run build` all clean

Commit sequence suggestion:
```
ci: add github actions pipeline with lint, test, and build jobs
docs: add comprehensive readme with setup and api documentation
docs: add mermaid erd to readme
chore(docker): finalize dockerignore and docker-compose configuration
fix(security): audit all routes for guard coverage and password leaks
```

---

## Global Rules (Apply Across All Sprints)

### Code Quality
- `strict: true` TypeScript — no `any` unless absolutely unavoidable (add a comment explaining why)
- All service methods have explicit return types
- No `console.log` in production code — use NestJS `Logger` where logging is needed
- All DTOs use `class-validator` and `class-transformer` — never trust raw request body
- Prisma `select` or `omit` must be used wherever `password` could be included in output

### Security (Non-Negotiable)
- Passwords stored only as bcrypt hash (salt rounds: 10) — never logged, never returned
- JWT cookie: `httpOnly: true`, `secure: true` in production, `sameSite: 'strict'`
- `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true` globally
- No raw string interpolation in Prisma queries — always use parameterized Prisma API
- `GlobalExceptionFilter` must never expose stack traces when `NODE_ENV=production`

### Testing
- Prisma client is always mocked in unit tests — no real database connections in tests
- Use `jest.fn()` for all Prisma method mocks, typed with the expected return type
- Test file naming: `<module>.service.spec.ts` co-located with the service
- Each test file must cover: happy path, not-found, conflict/forbidden, and edge cases specific to that module
- No skipped tests (`xit`, `xdescribe`) in final PRs

### Swagger
- Every DTO field has `@ApiProperty()` or `@ApiPropertyOptional()` with an `example` value
- Every controller method has `@ApiOperation({ summary: '...' })`
- Every possible HTTP response code has a corresponding `@ApiXxxResponse` decorator
- Swagger must render without warnings in the browser

### File Structure
Follow the structure defined in `/docs/architecture.md` exactly. Do not add extra folders or files beyond what the specs require.

---

## Definition of "Done" for the Entire Project

Before declaring the project complete, verify:
- [ ] `docker-compose up --build` starts cleanly from a blank machine
- [ ] Seed creates admin, admin can log in, borrower can self-register
- [ ] Full borrowing lifecycle works end-to-end (checkout → overdue flag → return → quantity restored)
- [ ] All exports download valid XLSX and CSV files
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — 100% of tests pass
- [ ] `npm run test:cov` — >80% coverage across all modules
- [ ] `npm run build` — 0 TypeScript errors
- [ ] CI pipeline is green on `main`
- [ ] Swagger UI at `/api/docs` shows all endpoints with full documentation
- [ ] No `password` field appears in any API response under any circumstance
- [ ] `.env` is gitignored, `.env.example` is committed and complete
