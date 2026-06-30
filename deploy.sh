#!/bin/bash
# ── Deploy Script — Shanuzz Media Tracker ──────────────
# Deploys the app to the NAS office server.
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Prerequisites:
#   - SSH config "nas-office" set up in ~/.ssh/config
#   - Server has Docker + Docker Compose
#   - coolify network already exists

set -e

SERVER="nas-office"
DEPLOY_DIR="/home/nas/media-tracker"

echo "🚀 Deploying Shanuzz Media Tracker..."

# 1. Create directory on server
echo "📁 Creating deploy directory..."
ssh "$SERVER" "mkdir -p $DEPLOY_DIR/uploads $DEPLOY_DIR/wa-bot/auth"

# 2. Sync files (exclude node_modules, .next, .git)
echo "📦 Syncing files..."
rsync -avz --delete --no-perms --no-group \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.pi' \
  --exclude '.od-skills' \
  --exclude 'output' \
  --exclude 'uploads/*' \
  --exclude 'wa-bot/auth/*' \
  --exclude 'wa-bot/store.json' \
  ./ "$SERVER:$DEPLOY_DIR/"

# 3. Check if .env exists on server
echo "🔍 Checking environment..."
if ! ssh "$SERVER" "test -f $DEPLOY_DIR/.env"; then
  echo "⚠️  .env file not found on server. Creating from .env.example..."
  echo "   Please edit the .env file on the server after deployment."
  ssh "$SERVER" "cp $DEPLOY_DIR/.env.example $DEPLOY_DIR/.env"
fi

# 4. Build and restart
echo "🔨 Building and restarting containers..."
ssh "$SERVER" "cd $DEPLOY_DIR && docker compose up -d --build"

# 5. Run Prisma migration
echo "🗄️  Running database migrations..."
ssh "$SERVER" "cd $DEPLOY_DIR && docker compose exec -T web npx prisma migrate deploy" || echo "⚠️  Migration step may need manual run"

# 6. Show status
echo ""
echo "✅ Deploy complete!"
echo ""
echo "🌐 App URL: https://app-media-tracker.aika-shuz.fyi"
echo ""
echo "📋 Post-deploy checklist:"
echo "   1. Add DNS record for app-media-tracker.aika-shuz.fyi → 154.84.215.26 (proxied)"
echo "   2. Seed database: docker compose exec web npx tsx prisma/seed.ts"
echo "   3. Configure WA bot env vars and restart"
echo "   4. Check logs: docker compose logs -f"
