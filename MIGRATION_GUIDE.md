# Migration Guide: JavaScript to TypeScript Backend

## Overview

This guide explains the migration from the JavaScript/Express backend to a modern TypeScript backend with clean architecture.

## What Changed

### Architecture

**Before:**
- Single `server.js` file with all logic
- Direct PostgreSQL queries with `pg` library
- Mixed concerns (routes, business logic, database access)
- No validation layer
- Basic error handling

**After:**
- Clean architecture with separation of concerns
- Prisma ORM for type-safe database access
- Service layer for business logic
- DTO validation for requests
- Middleware for cross-cutting concerns
- Professional error handling

### Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   ├── index.ts           # Configuration
│   │   └── database.ts        # Prisma client
│   ├── dto/
│   │   ├── auth.dto.ts        # Auth DTOs
│   │   ├── message.dto.ts     # Message DTOs
│   │   └── user.dto.ts        # User DTOs
│   ├── middleware/
│   │   ├── auth.middleware.ts # Auth guards
│   │   └── error.middleware.ts # Error handling
│   ├── routes/
│   │   ├── auth.routes.ts     # Auth endpoints
│   │   ├── message.routes.ts  # Message endpoints
│   │   ├── user.routes.ts     # User endpoints
│   │   ├── admin.routes.ts    # Admin endpoints
│   │   └── webhook.routes.ts  # Webhook endpoints
│   ├── services/
│   │   ├── auth.service.ts    # Auth business logic
│   │   ├── message.service.ts # Message business logic
│   │   └── user.service.ts    # User business logic
│   └── index.ts               # Application entry point
├── package.json
├── tsconfig.json
└── Dockerfile
```

## API Compatibility

### ✅ All Endpoints Remain The Same

No changes needed in the frontend! All endpoints maintain the same:
- URLs
- Request/Response formats
- Authentication headers
- WebSocket events

### Endpoint Mapping

| Old | New | Status |
|-----|-----|--------|
| `POST /api/register` | `POST /api/register` | ✅ Compatible |
| `POST /api/login` | `POST /api/login` | ✅ Compatible |
| `GET /api/messages` | `GET /api/messages` | ✅ Compatible |
| `POST /api/messages` | `POST /api/messages` | ✅ Compatible |
| `GET /api/user/me` | `GET /api/user/me` | ✅ Compatible |
| `PUT /api/user/username` | `PUT /api/user/username` | ✅ Compatible |
| `GET /api/admin/users` | `GET /api/admin/users` | ✅ Compatible |
| `POST /api/admin/users` | `POST /api/admin/users` | ✅ Compatible |
| `PUT /api/admin/users/:id` | `PUT /api/admin/users/:id` | ✅ Compatible |
| `DELETE /api/admin/users/:id` | `DELETE /api/admin/users/:id` | ✅ Compatible |
| `POST /api/webhook/response` | `POST /api/webhook/response` | ✅ Compatible |
| `POST /api/webhook/hotmart` | `POST /api/webhook/hotmart` | ✅ Compatible |
| `GET /api/health` | `GET /api/health` | ✅ Compatible |
| `GET /api/version` | `GET /api/version` | ✅ Compatible |

## Database

### Migration Strategy

The new backend uses Prisma ORM but maintains the same database schema:

**Tables:**
- `users` - Same structure, same column names (snake_case)
- `messages` - Same structure, same column names
- `migrations` - Same migration tracking table

**Key Points:**
- Prisma uses `camelCase` in TypeScript code
- Database columns remain in `snake_case`
- Mapping is automatic via `@map()` attributes
- No database migration needed for the switch

### Existing Database

If you have an existing database:

```bash
# 1. Generate Prisma Client from existing database
npx prisma db pull

# 2. Generate migrations
npx prisma migrate dev --name init

# 3. Or just introspect without migrations
npx prisma generate
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Generate Prisma Client

```bash
npm run prisma:generate
```

### 3. Environment Variables

Same `.env` variables as before:

```env
DATABASE_URL="postgresql://user:password@host:5432/db"
JWT_SECRET="your-secret"
N8N_WEBHOOK_URL="https://..."
N8N_EMAIL_WEBHOOK_URL="https://..."
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
```

### 4. Run Migrations (if needed)

```bash
# Deploy existing migrations
npm run prisma:deploy

# Or if starting fresh
npm run prisma:migrate
```

### 5. Development

```bash
# Start with hot reload
npm run dev
```

### 6. Production

```bash
# Build TypeScript
npm run build

# Start server
npm start
```

## Docker Changes

### New Dockerfile

The Dockerfile now has two stages:
1. **Build**: Compile TypeScript, generate Prisma Client
2. **Production**: Run compiled JavaScript

```bash
# Build image
docker build -t chat-n8n-backend .

# Run container (same as before)
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e JWT_SECRET="..." \
  chat-n8n-backend
```

## Code Migration Examples

### Before (JavaScript)

```javascript
// Direct database query
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  // ... business logic mixed with route
});
```

### After (TypeScript)

```typescript
// Route handler
router.post('/login', async (req: Request, res: Response) => {
  const dto = Object.assign(new LoginDto(), req.body);
  const result = await authService.login(dto);
  res.json(result);
});

// Service layer
async login(dto: LoginDto): Promise<AuthResponse> {
  const errors = dto.validate();
  if (errors.length > 0) throw new Error(errors.join(', '));
  
  const user = await prisma.user.findUnique({
    where: { email: dto.email }
  });
  // ... business logic
}
```

## Benefits

### Type Safety
- ✅ Compile-time error checking
- ✅ IntelliSense/autocomplete
- ✅ Refactoring confidence
- ✅ No runtime type errors

### Maintainability
- ✅ Clear separation of concerns
- ✅ Easy to test each layer
- ✅ Reusable services
- ✅ Consistent patterns

### Developer Experience
- ✅ Better IDE support
- ✅ Self-documenting code
- ✅ Easier onboarding
- ✅ Professional structure

### Performance
- ✅ Prisma query optimization
- ✅ Compiled TypeScript
- ✅ Better caching strategies
- ✅ Connection pooling

## Testing

### Development Testing

```bash
# Check health
curl http://localhost:3000/api/health

# Register user
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"123456"}'

# Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

## Troubleshooting

### Prisma Client Not Generated

```bash
npm run prisma:generate
```

### TypeScript Path Aliases Not Working

```bash
npm install -D tsconfig-paths
```

### Database Connection Issues

Check your `DATABASE_URL` in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/database"
```

### Migration Errors

Reset migrations (development only):
```bash
npx prisma migrate reset
```

## Rollback Plan

If you need to rollback:

1. Keep the old `server.js` file
2. Restore old `package.json`
3. Restore old `Dockerfile`
4. Switch Git branch

The database remains unchanged, so no data migration is needed.

## Next Steps

1. ✅ Install dependencies
2. ✅ Generate Prisma Client
3. ✅ Run development server
4. ✅ Test endpoints
5. ✅ Build for production
6. ✅ Deploy Docker container

## Support

For issues or questions:
1. Check Prisma documentation: https://www.prisma.io/docs
2. Check TypeScript documentation: https://www.typescriptlang.org/docs
3. Review the service layer code for examples
