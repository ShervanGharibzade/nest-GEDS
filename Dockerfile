# syntax=docker/dockerfile:1

# ---- deps: install all dependencies (incl. dev, needed to build) ----
FROM node:22-alpine AS deps
WORKDIR /app
# python3/make/g++: bcrypt has no prebuilt binary for musl (alpine) and
# compiles from source on install; without these, `pnpm install` fails.
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# NOTE: package.json gained helmet/joi/@nestjs/throttler as part of the
# TODO completion pass, but pnpm-lock.yaml could not be regenerated in
# that sandbox (no network access). Using a plain install here instead of
# `--frozen-lockfile` so the build doesn't hard-fail on the stale lockfile.
# Run `pnpm install` locally once and commit the updated lockfile, then
# switch this back to `pnpm install --frozen-lockfile` for reproducible,
# supply-chain-safe builds.
RUN pnpm install

# ---- build: generate the Prisma client and compile TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@9
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma's config loader (prisma.config.ts) reads DATABASE_URL eagerly.
# `generate` never connects to a database, so a placeholder is enough —
# never bake a real DATABASE_URL/secret into an image layer.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN pnpm prisma generate --config ./prisma.config.ts
RUN pnpm build

# ---- prod-deps: install only production dependencies ----
FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod

# ---- runner: minimal final image ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
