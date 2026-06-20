# Deployment Guide

## Prerequisites

- NAS office server (Ubuntu, Docker 29.x, Compose v5)
- coolify Traefik reverse proxy running
- PostgreSQL (coolify-db) and Redis (coolify-redis) containers
- Cloudflare DNS for `aika-shuz.fyi`

## Quick Deploy

```bash
# 1. Copy files to server
scp -P 2222 -r . nas@154.84.215.26:/home/nas/media-tracker/

# 2. SSH in
ssh -p 2222 nas@154.84.215.26

# 3. Create database
docker exec coolify-db psql -U coolify -c "CREATE DATABASE media_tracker;"

# 4. Configure .env
cd /home/nas/media-tracker
cp .env.example .env
nano .env
```

### Required Environment Variables

```bash
DATABASE_URL=postgresql://coolify:PASSWORD@coolify-db:5432/media_tracker?schema=public
REDIS_URL=redis://default:PASSWORD@coolify-redis:6379
JWT_SECRET=random-secret-string
VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>
NEXT_PUBLIC_VAPID_KEY=<same-as-public>
WA_GROUP_JID=123456789@g.us
WA_ADMIN_JID=911234567890@s.whatsapp.net
WA_VIDEOGRAPHER_JID=...
WA_EDITOR_JID=...
WA_REVIEWER_JID=...
WA_UPLOADER_JID=...
```

### Build & Start

```bash
cd /home/nas/media-tracker
docker compose up -d --build
```

### Database Setup

```bash
# Push schema
docker exec media-tracker-web npx prisma db push

# Seed users + sample tasks
docker exec media-tracker-web npx tsx prisma/seed.ts
```

### Verify

```bash
curl https://app-media-tracker.aika-shuz.fyi/api/auth/me
# → 200 (redirect to login)
```

## DNS Setup

Add at Cloudflare (`aika-shuz.fyi` → DNS):
```
Type: A
Name: app-media-tracker
Target: 154.84.215.26
Proxy: ✅ (orange cloud)
```

## WhatsApp Bot Setup

1. Edit `.env` and set `WA_GROUP_JID` and all staff JIDs
2. On first run, scan QR code:
```bash
docker compose logs -f wa-bot
```
3. Scan with the bot's WhatsApp number
4. Bot connects and starts processing Redis queue

## Updating

```bash
# Pull latest code
cd /home/nas/media-tracker
git pull

# Rebuild + restart
docker compose up -d --build web

# If schema changed:
docker exec media-tracker-web npx prisma db push

# Re-seed if needed:
docker exec media-tracker-web npx tsx prisma/seed.ts
```

## Monitoring

```bash
# Container status
docker compose ps

# Web logs
docker compose logs -f web

# WA bot logs
docker compose logs -f wa-bot

# Redis queue status
docker exec coolify-redis redis-cli LLEN whatsapp:send

# Database tables
docker exec coolify-db psql -U coolify -d media_tracker -c '\dt'
```

## Backup

```bash
# Database dump
docker exec coolify-db pg_dump -U coolify media_tracker > backup.sql

# Uploaded photos
tar czf uploads-backup.tar.gz uploads/

# WhatsApp bot auth (session persistence)
tar czf wa-auth-backup.tar.gz wa-bot/auth/
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 502 Bad Gateway | `docker compose restart web` |
| Database connection | Check `DATABASE_URL` in `.env`, verify coolify-db is running |
| Redis connection | Check `REDIS_URL`, verify coolify-redis is running |
| WA bot not sending | `docker compose restart wa-bot`, check JIDs in `.env` |
| Push not working | Verify VAPID keys in `.env`, check browser console for subscription errors |
| PWA shows old icon | Uninstall PWA from home screen, reinstall |
