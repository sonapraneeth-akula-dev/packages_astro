# syntax=docker/dockerfile:1.7

# ─── Base ────────────────────────────────────────────────────────────────────
# Pinned Bun image matching package.json "packageManager".
FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ─── Dependencies ────────────────────────────────────────────────────────────
# Install all dependencies (including dev) for building and previewing.
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ─── Development ─────────────────────────────────────────────────────────────
# Live watching + hot module reloading. Source is bind-mounted via compose.
# Pagefind is a build-time artifact, so the dev server has no search index by
# default. We generate it once into public/pagefind (served verbatim by the dev
# server) before starting, then keep it in sync with a content watcher that
# re-runs `search:index` on every content change.
FROM deps AS dev
ENV NODE_ENV=development
ENV PUBLIC_APP_ENV=dev
COPY . .
EXPOSE 4322
# The dev server is run under a watchdog (scripts/dev-server.ts) that restarts
# it if it ever stops responding — Astro's in-process config restart can hang
# under bind-mount polling and never rebind the port. The healthcheck surfaces
# that state in `docker ps` as a second line of defence.
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:4322/ || exit 1
CMD ["sh", "-c", "bun run search:index && { bun run watch:content & bun run dev:serve; }"]

# ─── Build ───────────────────────────────────────────────────────────────────
# Produces the static build output in /app/dist. `bun run build` runs
# `astro build && pagefind --site dist`, so the Pagefind search index is emitted
# into dist/pagefind for the runtime image.
FROM deps AS build
ARG PUBLIC_APP_ENV=prod
ARG PUBLIC_SITE_URL=https://blog.sonapraneeth.in
ENV PUBLIC_APP_ENV=${PUBLIC_APP_ENV}
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}
# Git metadata is passed in because .git is excluded from the build context.
ARG GIT_COMMIT=unknown
ARG GIT_BRANCH=unknown
ENV GIT_COMMIT=${GIT_COMMIT}
ENV GIT_BRANCH=${GIT_BRANCH}
COPY . .
RUN bun run build

# ─── Runtime ─────────────────────────────────────────────────────────────────
# Serves the built output (including dist/pagefind) via Astro preview. Used by
# test / ppe / prod, so Pagefind search works in every built environment.
FROM base AS runtime
ENV NODE_ENV=production
ARG PUBLIC_APP_ENV=prod
ARG PUBLIC_SITE_URL=https://blog.sonapraneeth.in
ENV PUBLIC_APP_ENV=${PUBLIC_APP_ENV}
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}

# Only the artifacts needed to preview the build.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json astro.config.ts ./

EXPOSE 4322
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:4322/ || exit 1
CMD ["bun", "run", "preview"]
