# ── Stage 1: Build the React SPA ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Only install production deps for the Express server
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built SPA
COPY --from=builder /app/dist ./dist

# Copy Express server
COPY server ./server

EXPOSE 3001

# Build arg for embedding git SHA in health endpoint
ARG GIT_SHA=dev
ENV GIT_SHA=${GIT_SHA}

CMD ["node", "server/index.js"]
