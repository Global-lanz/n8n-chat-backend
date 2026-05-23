# Quick Start Guide

## Prerequisites

- Node.js 20+
- PostgreSQL database
- npm or yarn

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

This installs:
- TypeScript and tooling
- Prisma ORM
- Express and middleware
- All type definitions

### 2. Environment Configuration

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/chatdb"

# JWT Secret (use a strong random string)
JWT_SECRET="your-super-secret-jwt-key-change-this"

# N8N Webhooks
N8N_WEBHOOK_URL="https://unnaove-madden-unrecorded.ngrok-free.dev/webhook/793dce42-bad4-4c1c-918f-b38cbfbb4e29/chat"
N8N_EMAIL_WEBHOOK_URL="https://your-n8n-instance.com/webhook/email"

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS (comma-separated origins)
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:8080"
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the type-safe Prisma Client based on your schema.

### 4. Database Setup

#### Option A: Existing Database

If you already have a database with the tables:

```bash
# Just generate the client
npm run prisma:generate
```

#### Option B: New Database

If starting fresh:

```bash
# Run migrations
npm run prisma:migrate

# Or deploy migrations
npm run prisma:deploy
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` with hot reload enabled.

### 6. Verify Installation

```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","database":"connected"}

# Version check
curl http://localhost:3000/api/version

# Expected response:
# {"version":"0.2.0"}
```

## Production Deployment

### Build for Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

### Docker Deployment

```bash
# Build image
docker build -t chat-n8n-backend:0.2.0 .

# Run container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  -e N8N_WEBHOOK_URL="https://..." \
  -e ALLOWED_ORIGINS="https://yourdomain.com" \
  --name chat-backend \
  chat-n8n-backend:0.2.0
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/chatdb
      - JWT_SECRET=${JWT_SECRET}
      - N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL}
      - ALLOWED_ORIGINS=http://localhost:8080
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=chatdb
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose up -d
```

## Development Tools

### Prisma Studio

Visual database browser:

```bash
npm run prisma:studio
```

Opens at `http://localhost:5555`

### Database Migrations

```bash
# Create new migration
npx prisma migrate dev --name your_migration_name

# Deploy migrations (production)
npm run prisma:deploy

# Reset database (development only - DESTRUCTIVE)
npx prisma migrate reset
```

### TypeScript Compilation

```bash
# Build once
npm run build

# Watch mode
npx tsc --watch
```

## Testing Endpoints

### Register User

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `token` from the response.

### Send Message

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "content": "Hello, bot!"
  }'
```

### Get Messages

```bash
curl http://localhost:3000/api/messages \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Current User

```bash
curl http://localhost:3000/api/user/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Admin: List Users

```bash
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

## Troubleshooting

### "Prisma Client not generated"

```bash
npm run prisma:generate
```

### "Cannot find module @config/..."

```bash
# Install tsconfig-paths
npm install -D tsconfig-paths

# Or rebuild
npm run build
```

### "Database connection failed"

1. Check DATABASE_URL in `.env`
2. Ensure PostgreSQL is running
3. Verify database exists
4. Check user permissions

### "JWT_SECRET is required"

Make sure `.env` file exists with `JWT_SECRET` set.

### Port Already in Use

Change port in `.env`:
```env
PORT=3001
```

## Project Commands Reference

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build TypeScript
npm start                # Start production server

# Prisma
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations (dev)
npm run prisma:deploy    # Deploy migrations (prod)
npm run prisma:studio    # Open Prisma Studio

# Database
npx prisma db pull       # Pull schema from database
npx prisma db push       # Push schema to database
npx prisma migrate reset # Reset database (DEV ONLY)
```

## File Structure Quick Reference

```
backend/
├── prisma/
│   └── schema.prisma     # Database schema
├── src/
│   ├── config/           # Configuration
│   ├── dto/              # Validation objects
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   └── index.ts          # Entry point
├── .env                  # Environment variables
├── tsconfig.json         # TypeScript config
├── package.json          # Dependencies
└── Dockerfile            # Docker config
```

## Next Steps

1. ✅ Server running
2. ✅ Database connected
3. ✅ Endpoints tested
4. 📝 Read MIGRATION_GUIDE.md for details
5. 🔧 Customize services as needed
6. 🚀 Deploy to production

## Support

- **Documentation**: See README.md
- **Migration**: See MIGRATION_GUIDE.md
- **Architecture**: See TRANSFORMATION_SUMMARY.md
- **Prisma Docs**: https://www.prisma.io/docs
- **TypeScript Docs**: https://www.typescriptlang.org/docs

---

Happy coding! 🚀
