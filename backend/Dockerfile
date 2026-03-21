FROM node:20-alpine AS base
WORKDIR /app

FROM base AS builder
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci
RUN npx prisma generate
COPY tsconfig.json nest-cli.json ./
COPY src ./src/
RUN npx nest build

FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci --omit=dev
RUN npx prisma generate

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma/
USER nestjs
EXPOSE 4000
CMD ["node", "dist/src/main"]
