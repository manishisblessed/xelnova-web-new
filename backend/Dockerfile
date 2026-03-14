# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend package files
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

EXPOSE 4000
USER node
CMD ["node", "dist/main.js"]
