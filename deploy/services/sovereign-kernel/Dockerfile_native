# ==============================================================================
# dAIsy HaMINJA Sovereign Kernel Microservice Dockerfile
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src
COPY server.ts ./

RUN npm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000

# Hardened security: Run as non-root user
USER node

CMD ["node", "dist/server.cjs"]
