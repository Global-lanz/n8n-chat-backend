#!/bin/sh
set -e

echo "🚀 Starting Chat N8N Backend..."

# For existing databases, use db push to sync schema without migration files
echo "📦 Syncing database schema with Prisma..."
npx prisma db push --accept-data-loss --skip-generate

# Start the application
echo "✅ Starting Node.js application..."
exec node dist/index.js
