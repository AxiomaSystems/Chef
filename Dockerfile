FROM node:22-alpine

WORKDIR /app

RUN corepack enable

# Prisma Client generation needs DATABASE_URL defined at build time.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cart_generator?schema=public"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile --filter api...

COPY . .

RUN pnpm --filter api prisma:generate
RUN pnpm --filter api build
RUN mkdir -p apps/api/dist/generated \
  && mkdir -p apps/api/dist/apps/api/generated \
  && cp -R apps/api/generated/prisma apps/api/dist/generated/prisma \
  && cp -R apps/api/generated/prisma apps/api/dist/apps/api/generated/prisma

CMD ["sh", "-c", "node scripts/assert-safe-startup-seed.mjs && pnpm --dir apps/api exec prisma migrate deploy && if [ \"$RUN_DB_SEED_ON_STARTUP\" = \"true\" ]; then pnpm --filter api db:seed; fi && pnpm --filter api start"]
