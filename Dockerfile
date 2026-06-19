# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install build tools for native npm packages
RUN apk add --no-cache git python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --include=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Ensure uploads directory exists
RUN mkdir -p uploads && chown nextjs:nodejs uploads

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
