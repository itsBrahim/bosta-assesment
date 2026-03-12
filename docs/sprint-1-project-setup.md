# Sprint 1 — Project Setup & Foundation

## Goal
Bootstrap the entire project skeleton so every subsequent sprint has a solid, runnable base to build on.

---

## Tasks

### 1. NestJS Project Scaffolding
- Initialize a new NestJS project with the CLI
- Configure TypeScript (`strict: true`, `paths`, `decoratorMetadata`)

### 2. ESLint + Prettier
- Install: `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-config-prettier`, `eslint-plugin-prettier`, `prettier`
- Create `.eslintrc.js`:
  - Extend `@typescript-eslint/recommended` + `prettier`
  - Rules: `no-unused-vars` (warn), `no-console` (warn in production), `@typescript-eslint/explicit-function-return-type` (off for controllers)
  - Ignore: `dist/`, `node_modules/`, `*.spec.ts` (separate lint pass for tests)
- Create `.prettierrc`:
  ```json
  {
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2,
    "semi": true
  }
  ```
- Add npm scripts:
  - `"lint"`: `eslint \"{src,test}/**/*.ts\" --fix`
  - `"format"`: `prettier --write \"src/**/*.ts\"`
- Add `.eslintignore` and `.prettierignore` covering `dist/`, `node_modules/`

### 2. Environment Configuration
- Install and configure `@nestjs/config`
- Create `.env` and `.env.example` with all required variables:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `PORT`
  - `NODE_ENV`
- Add `.env` to `.gitignore`

### 3. Docker & docker-compose
- Write `Dockerfile` (multi-stage: builder + production)
- Write `docker-compose.yml` with services:
  - `app` (NestJS)
  - `db` (PostgreSQL)
- Configure volume for PostgreSQL data persistence
- Configure healthcheck on the `db` service
- Ensure `app` waits for `db` to be healthy before starting

### 4. Prisma Setup
- Install Prisma + `@prisma/client`
- Run `prisma init` and point `DATABASE_URL` to the PostgreSQL service
- Write the full schema in `prisma/schema.prisma`:
  - `User` model (id, name, email, password, role, registeredAt)
  - `Book` model (id, title, author, isbn, availableQuantity, shelfLocation, createdAt, updatedAt)
  - `BorrowingRecord` model (id, bookId, borrowerId, checkedOutAt, dueDate, returnedAt)
  - Define enums: `Role { ADMIN BORROWER }`
  - Define all indexes: `title`, `author`, `isbn` on `Book`; `borrowerId`, `bookId` on `BorrowingRecord`
- Create initial migration: `prisma migrate dev --name init`
- Write a seed script (`prisma/seed.ts`) that creates a default admin user

### 5. Prisma Module
- Create `PrismaService` extending `PrismaClient` with `onModuleInit` / `onModuleDestroy` lifecycle hooks
- Create `PrismaModule` as a global module so it's available across the app without re-importing

### 6. Global Exception Filter
- Create `GlobalExceptionFilter` that:
  - Catches `HttpException` and returns structured JSON: `{ statusCode, message, path, timestamp }`
  - Catches Prisma `PrismaClientKnownRequestError` and maps known codes (e.g. `P2002` unique constraint → 409 Conflict)
  - Catches unknown errors and returns 500 without leaking stack traces in production
- Register filter globally in `main.ts`

### 7. Swagger / OpenAPI Setup
- Install: `@nestjs/swagger`, `swagger-ui-express`
- Configure `SwaggerModule` in `main.ts`:
  - `DocumentBuilder` with title, description, version, and `cookie` security scheme
  - Mount Swagger UI at `/api/docs`
  - Only expose in `NODE_ENV !== 'production'` (or behind a guard)
- Add `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, and `@ApiProperty()` decorators to all modules as they are implemented (each sprint adds decorators to its own controllers and DTOs)
- Add `@ApiBearerAuth('cookie')` globally — document cookie-based auth in the security scheme

### 8. App Bootstrap (`main.ts`)
- Enable CORS with credentials
- Enable `ValidationPipe` globally (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`)
- Set global prefix `/api`
- Configure cookie-parser middleware
- Bootstrap Swagger (`SwaggerModule.setup`) — only when `NODE_ENV !== 'production'`
- Start app on `PORT` from env

---

## Deliverables
- Runnable NestJS app (`npm run start:dev` works)
- `docker-compose up` spins up app + DB
- Prisma migrations applied, admin seed runs successfully
- `.env.example` committed, `.env` gitignored
- Global error responses are consistently structured
- ESLint + Prettier configured, `npm run lint` passes with zero errors
- Swagger UI accessible at `http://localhost:3000/api/docs`

---

## Definition of Done
- [ ] `docker-compose up --build` starts both services without errors
- [ ] `prisma migrate dev` applies the schema cleanly
- [ ] `prisma db seed` creates the admin user
- [ ] App responds to `GET /api` with a 404 (no routes yet, but server is alive)
- [ ] An invalid request body returns a structured validation error
- [ ] `npm run lint` exits with zero errors
- [ ] Swagger UI loads at `http://localhost:3000/api/docs`
