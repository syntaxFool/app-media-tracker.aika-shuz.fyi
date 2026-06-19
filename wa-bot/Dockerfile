# WA Bot Dockerfile
FROM node:20-alpine

# Install git (needed for some npm dependencies) + build tools
RUN apk add --no-cache git python3 make g++

WORKDIR /app
COPY package.json ./
RUN npm install --ignore-scripts 2>/dev/null || npm install
COPY . .
RUN mkdir -p auth

CMD ["npx", "tsx", "index.ts"]
