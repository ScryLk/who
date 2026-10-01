# Multi-stage Dockerfile for WHO Monorepo on Railway
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10.30.3 turbo@^2

FROM base AS deps
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS builder
# NEXT_PUBLIC_SERVER_URL is required at build time for Next.js client-side bundle inlining.
# Secrets such as YOUTUBE_API_KEY and REDIS_URL are strictly runtime variables and must not be baked into the image.
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV NODE_ENV=production

RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10.30.3 turbo@^2

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app /app

EXPOSE 3000 4000

CMD ["pnpm", "start"]
