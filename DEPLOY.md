# Shanuzz Media Tracker — Deployment Guide

## DNS Setup

Add a DNS record at Cloudflare for the subdomain:

| Field       | Value                                |
|-------------|--------------------------------------|
| Type        | A                                    |
| Name        | `app-media-tracker`                  |
| Target      | `154.84.215.26`                      |
| Proxied     | ✅ (Orange cloud)                    |
| TTL         | Auto                                 |

> Cloudflare Dashboard: https://dash.cloudflare.com/ → aika-shuz.fyi → DNS → Add Record

## Server Deployment

### 1. Copy files to server

```bash
# From the project directory
scp -P 2222 -r . nas@154.84.215.26:/home/nas/media-tracker/
```

Or use the deploy script:
```bash
./deploy.sh
```

### 2. Configure environment

```bash
ssh nas-office
cd /home/nas/media-tracker
nano .env
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection (coolify-db)
- `REDIS_URL` — Redis connection (coolify-redis)
- `JWT_SECRET` — Random secret for JWT signing
- `WA_GROUP_JID` — WhatsApp group JID for team updates
- `WA_ADMIN_JID` — Admin's WhatsApp number JID

### 3. Create the database

```bash
# Create the database in PostgreSQL
docker exec coolify-db psql -U coolify -c "CREATE DATABASE media_tracker;"
```

### 4. Start the application

```bash
docker compose up -d --build
```

### 5. Run database migrations

```bash
docker compose exec web npx prisma migrate dev --name init
# Or in production:
docker compose exec web npx prisma migrate deploy
```

### 6. Seed initial data

```bash
docker compose exec web npx tsx prisma/seed.ts
```

This creates:
- Admin user: `admin` / `admin123`
- Staff user: `staff` / `staff123`
- 5 sample tasks

### 7. Verify

Visit: https://app-media-tracker.aika-shuz.fyi

## WhatsApp Bot Setup

### Prerequisites

1. A dedicated WhatsApp number for the bot (NOT a personal number)
2. Get the Group JID:
   - Add the bot number to the WhatsApp group
   - On first run, check logs for the group JID
3. Get user JIDs:
   - Send a message to the bot from each staff phone
   - The JID format is: `911234567890@s.whatsapp.net` (country code + number)

### Configure & Start

1. Edit `.env` and set all `WA_*_JID` variables
2. Restart the WA bot: `docker compose restart wa-bot`
3. On first run, scan the QR code shown in logs:
   ```bash
   docker compose logs -f wa-bot
   ```
4. The bot will connect and start processing messages

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Traefik (SSL)                       │
│                 Port 443 → 3000                       │
└─────────────────┬───────────────────────────────────┘
                  │
    ┌─────────────┴──────────────┐
    │                            │
    ▼                            ▼
┌───────────┐            ┌───────────┐
│   web     │            │  wa-bot   │
│ Next.js   │──Redis──▶  │  Baileys  │──▶ WhatsApp
│  14.2     │            │           │
└─────┬─────┘            └───────────┘
      │
      ▼
┌───────────┐    ┌───────────┐
│  Postgres │    │   Redis   │
│ coolify-db│    │coolify-rds│
└───────────┘    └───────────┘
```

## Status Flow

```
New → Video Shot → Data Copied → Video Edited → Reviewed → Uploaded → Task Completed
```

Each status update:
1. Captures `updatedBy` and `updatedAt`
2. Enqueues WhatsApp notification to Redis
3. WA bot picks up and sends to team group + next responsible staff

## Troubleshooting

### App not loading
```bash
docker compose ps          # Check if containers are running
docker compose logs web    # Check Next.js logs
```

### Database issues
```bash
docker compose exec web npx prisma migrate status
docker compose exec web npx prisma db push
```

### WhatsApp bot not sending
```bash
docker compose logs wa-bot    # Check bot logs
docker compose restart wa-bot # Restart bot
```

### Redis queue issues
```bash
docker exec coolify-redis redis-cli LLEN whatsapp:send  # Check queue length
docker exec coolify-redis redis-cli LRANGE whatsapp:send 0 -1  # View messages
```
