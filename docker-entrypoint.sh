#!/bin/sh
set -e

echo "🚀 Starting Chat N8N Backend..."

# Run Prisma migrations
echo "📦 Running Prisma migrations..."
npx prisma migrate deploy

# Start the application
echo "✅ Starting Node.js application..."
exec node dist/index.js
