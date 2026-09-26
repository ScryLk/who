# Multi-stage Dockerfile for WHO Monorepo
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm turbo

FROM base AS fetcher
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install

FROM fetcher AS builder
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm

COPY --from=builder /app /app

EXPOSE 3000 4000

CMD ["pnpm", "start"]
