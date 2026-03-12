# Sprint 2 — Authentication Module

## Goal
Implement a complete, secure authentication system with JWT stored in HTTP-only cookies, role-based access control, and full unit test coverage.

---

## Tasks

### 1. Dependencies
- Install: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`, `cookie-parser`
- Install types: `@types/passport-jwt`, `@types/bcrypt`

### 2. DTOs
- `RegisterDto`: `name` (string, required), `email` (valid email, required), `password` (string, min 8 chars, required)
- `LoginDto`: `email` (valid email), `password` (string, required)
- All DTOs use `class-validator` decorators

### 3. JWT Strategy (`PassportStrategy`)
- Extract JWT from the request **cookie** (`req.cookies['access_token']`)
- Validate payload: look up user by `id`, throw `UnauthorizedException` if not found
- Return the user object (without password) for attachment to `req.user`

### 4. Guards
- `JwtAuthGuard` — extends `AuthGuard('jwt')`, used on all protected routes
- `RolesGuard` — reads `@Roles()` metadata and checks `req.user.role`; throws `ForbiddenException` if role doesn't match
- Register both guards globally in `AppModule` so all routes are protected by default
- Use a `@Public()` decorator to opt out of auth on register/login

### 5. Decorators
- `@Roles(...roles: Role[])` — sets metadata via `SetMetadata`
- `@CurrentUser()` — parameter decorator that extracts `req.user`
- `@Public()` — marks a route as unauthenticated

### 6. Auth Service
- `register(dto: RegisterDto)`:
  - Check if email already exists → throw `ConflictException` if so
  - Hash password with `bcrypt` (salt rounds: 10)
  - Create user with role `BORROWER`
  - Return user without password
- `login(dto: LoginDto)`:
  - Find user by email → throw `UnauthorizedException` if not found
  - Compare password with `bcrypt.compare` → throw `UnauthorizedException` on mismatch
  - Sign JWT payload: `{ sub: user.id, email: user.email, role: user.role }`
  - Return signed token (controller sets it as cookie)
- `logout()`: purely symbolic at service level; controller clears cookie

### 7. Auth Controller
- `POST /auth/register` → `@Public()` → calls `authService.register()` → returns `201` with user
- `POST /auth/login` → `@Public()` → calls `authService.login()` → sets `access_token` cookie:
  - `httpOnly: true`
  - `secure: true` (in production)
  - `sameSite: 'strict'`
  - `maxAge`: matches JWT expiry
  - Returns `200` with `{ message: 'Login successful' }`
- `POST /auth/logout` → clears `access_token` cookie → returns `200`

### 8. Auth Module
- Import `JwtModule.registerAsync()` reading secret + expiry from `ConfigService`
- Import `PassportModule`
- Provide `JwtStrategy`, `AuthService`
- Export `JwtStrategy`, `AuthService` (needed by other modules for guards)

### 9. Swagger Decorators
- `RegisterDto` / `LoginDto`: add `@ApiProperty()` with `example` values to every field
- Controller routes:
  - `@ApiTags('Auth')` on the controller class
  - `POST /auth/register`: `@ApiOperation({ summary: 'Register a new borrower' })`, `@ApiCreatedResponse`, `@ApiConflictResponse`
  - `POST /auth/login`: `@ApiOperation`, `@ApiOkResponse({ description: 'Sets access_token cookie' })`, `@ApiUnauthorizedResponse`
  - `POST /auth/logout`: `@ApiOkResponse`
  - `@ApiCookieAuth()` on all routes that require authentication

### 10. Unit Tests (`auth.service.spec.ts`)
Test cases:
- `register`: success, duplicate email conflict, password is hashed (plain text not stored)
- `login`: success (token returned), user not found, wrong password
- Prisma service is fully mocked (no real DB calls)

---

## Deliverables
- `POST /auth/register` creates a borrower and returns user (no password)
- `POST /auth/login` sets an HTTP-only JWT cookie
- `POST /auth/logout` clears the cookie
- All protected routes return `401` without a valid cookie
- Admin-only routes return `403` when accessed by a borrower
- All unit tests pass

---

## Definition of Done
- [ ] Register returns `201` with user object (password excluded)
- [ ] Login returns `200` and sets `access_token` cookie
- [ ] Accessing a protected route without cookie returns `401`
- [ ] Accessing an admin route as borrower returns `403`
- [ ] `npm run test auth` — all tests pass
