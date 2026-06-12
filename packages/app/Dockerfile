# syntax=docker/dockerfile:1.7

# ──────────────────────────────────────────────────────────────────────────────
# Multi-stage build for the @grihasetu/notes-app (Go Notes) site.
#
# IMPORTANT: the build context is the MONOREPO ROOT, not packages/app, because
# the app depends on the workspace package @grihasetu/notes-core. The compose
# file sets `context: ../..` and `dockerfile: packages/app/Dockerfile`.
#
# We use Bun's hoisted linker (see /bunfig.toml) so a single top-level
# node_modules is shared by every workspace package — Astro's static build
# relies on Vite externalising deps from a flat node_modules.
# ──────────────────────────────────────────────────────────────────────────────

# ─── Base ────────────────────────────────────────────────────────────────────
FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ─── Dependencies ────────────────────────────────────────────────────────────
# Install the whole workspace once. Only the manifests are copied so this layer
# is cached until a package.json / lockfile changes. Every workspace package
# manifest is needed for Bun to resolve the `packages/*` workspace graph.
FROM base AS deps
COPY package.json bun.lock* bunfig.toml tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/package.json
COPY packages/demo/package.json ./packages/demo/package.json
COPY packages/app/package.json ./packages/app/package.json
RUN bun install --frozen-lockfile

# ─── Development ─────────────────────────────────────────────────────────────
# Live watching + hot reload. Source is bind-mounted via compose. The dev server
# runs under a watchdog (scripts/dev-server.ts) that restarts it if it hangs
# under bind-mount polling, and a content watcher keeps the Pagefind index in
# sync (search is a build-time artifact, absent on the dev server by default).
FROM deps AS dev
ENV NODE_ENV=development
ENV PUBLIC_APP_ENV=dev
COPY packages/core ./packages/core
COPY packages/app ./packages/app
WORKDIR /app/packages/app
EXPOSE 4320
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:4320/ || exit 1
CMD ["sh", "-c", "bun run search:index && { bun run watch:content & bun run dev:serve; }"]

# ─── Build ───────────────────────────────────────────────────────────────────
# Produces the static output in /app/packages/app/dist. `bun run build` runs
# `astro build && pagefind --site dist`, so the Pagefind index ships in dist.
FROM deps AS build
ARG PUBLIC_APP_ENV=prod
ARG PUBLIC_SITE_URL=https://go-notes.sonapraneeth.in
ENV PUBLIC_APP_ENV=${PUBLIC_APP_ENV}
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}
# Git metadata is passed in because .git is excluded from the build context.
ARG GIT_COMMIT=unknown
ARG GIT_BRANCH=unknown
ENV GIT_COMMIT=${GIT_COMMIT}
ENV GIT_BRANCH=${GIT_BRANCH}
COPY packages/core ./packages/core
COPY packages/app ./packages/app
RUN cd packages/app && bun run build

# ─── Runtime ─────────────────────────────────────────────────────────────────
# Serves the built output (including dist/pagefind) via `astro preview`. Only
# the artifacts needed to preview are copied. The core package is required
# because astro.config.ts imports @grihasetu/notes-core/astro.
FROM base AS runtime
ENV NODE_ENV=production
ARG PUBLIC_APP_ENV=prod
ARG PUBLIC_SITE_URL=https://go-notes.sonapraneeth.in
ENV PUBLIC_APP_ENV=${PUBLIC_APP_ENV}
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=build /app/packages/core ./packages/core
COPY --from=build /app/packages/app/dist ./packages/app/dist
COPY --from=build /app/packages/app/package.json ./packages/app/package.json
COPY --from=build /app/packages/app/astro.config.ts ./packages/app/astro.config.ts

WORKDIR /app/packages/app
EXPOSE 4320
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:4320/ || exit 1
CMD ["bun", "run", "preview"]
