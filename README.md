# Chat N8N Backend

Modern TypeScript backend with clean architecture, built with Express, Prisma ORM, and Socket.IO.

## 🏗️ Architecture

- **Clean Architecture** with separation of concerns
- **SOLID Principles** throughout the codebase
- **Service Layer Pattern** for business logic
- **DTO Validation** for request validation
- **Dependency Injection** ready structure
- **Type-Safe** with TypeScript strict mode
- **Prisma ORM** for database access

## 📂 Project Structure

```
src/
├── config/          # Configuration files
├── dto/             # Data Transfer Objects with validation
├── middleware/      # Express middleware (auth, error handling)
├── models/          # Prisma models
├── routes/          # Route handlers
├── services/        # Business logic layer
└── index.ts         # Application entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Run Prisma Studio (database GUI)
npm run prisma:studio
```

### Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## 🐳 Docker

```bash
# Build image
docker build -t chat-n8n-backend .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  -e N8N_WEBHOOK_URL="https://..." \
  chat-n8n-backend
```

## 📝 Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/chatdb"

# JWT
JWT_SECRET="your-super-secret-key"

# N8N Webhooks
N8N_WEBHOOK_URL="https://unnaove-madden-unrecorded.ngrok-free.dev/webhook/793dce42-bad4-4c1c-918f-b38cbfbb4e29/chat"
N8N_EMAIL_WEBHOOK_URL="https://your-n8n.com/webhook/email"

# Server
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
```

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user

### Messages
- `GET /api/messages` - Get user messages (auth required)
- `POST /api/messages` - Send message (auth required)

### User
- `GET /api/user/me` - Get current user (auth required)
- `PUT /api/user/username` - Update username (auth required)

### Admin
- `GET /api/admin/users` - List all users (admin required)
- `POST /api/admin/users` - Create user (admin required)
- `PUT /api/admin/users/:id` - Update user (admin required)
- `DELETE /api/admin/users/:id` - Delete user (admin required)

### Webhooks
- `POST /api/webhook/response` - N8N async responses
- `POST /api/webhook/hotmart` - Hotmart integration

### Health
- `GET /api/health` - Health check
- `GET /api/version` - Get API version

## 🛡️ Security Features

- JWT authentication
- Bcrypt password hashing
- Role-based access control (admin/user)
- Account status validation (active/inactive)
- License expiration checks
- CORS configuration
- Request validation with DTOs

## 🔄 Database Migrations

The application uses Prisma Migrate for database versioning:

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Deploy migrations to production
npm run prisma:deploy

# Reset database (development only)
npx prisma migrate reset
```

## 📊 Database Schema

- **Users**: User accounts with roles and licenses
- **Messages**: Chat messages (user/bot)
- **Migrations**: Migration history tracking

## 🧪 Best Practices Implemented

✅ **TypeScript**
- Strict mode enabled
- No `any` types
- Proper interfaces and types
- Path aliases for imports

✅ **Architecture**
- Service layer for business logic
- Middleware for cross-cutting concerns
- DTOs for validation
- Separation of concerns

✅ **Security**
- Environment variables for secrets
- JWT token validation
- Password hashing
- Role-based access control

✅ **Code Quality**
- Consistent error handling
- Proper async/await usage
- Clean code principles
- SOLID principles

## 📦 Dependencies

**Production:**
- express - Web framework
- @prisma/client - Type-safe database client
- jsonwebtoken - JWT authentication
- bcryptjs - Password hashing
- socket.io - Real-time communication
- axios - HTTP client
- cors - CORS middleware
- dotenv - Environment variables

**Development:**
- typescript - TypeScript compiler
- ts-node-dev - Development server with hot reload
- prisma - ORM and migrations
- @types/* - TypeScript type definitions

## 🤝 Contributing

This is a professional backend following industry best practices. When contributing:

1. Follow TypeScript strict mode
2. Use service layer for business logic
3. Validate input with DTOs
4. Maintain type safety
5. Follow SOLID principles
6. Add proper error handling
7. Update documentation

## 📄 License

MIT
