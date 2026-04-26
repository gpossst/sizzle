# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# Build the TanStack Start / Nitro production bundle (Bun matches packageManager)
# -----------------------------------------------------------------------------
FROM oven/bun:1.3.2-debian AS builder

WORKDIR /app

# Monorepo-safe: this Dockerfile can be used from repo-root context (`-f web/Dockerfile`)
# while still only reading files from the `web/` folder.
COPY web/package.json web/bun.lock ./
RUN bun install --frozen-lockfile

COPY web/ .
RUN bun run build

# `instrument.server.mjs` is copied as source and imports `@sentry/tanstackstart-react`.
# Nitro keeps `@sentry/*` external (see vite.config.ts), so runtime must resolve it from node_modules.
RUN rm -rf node_modules && bun install --frozen-lockfile --production

# -----------------------------------------------------------------------------
# Run the Node server preset output (see package.json "start")
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Nitro reads NITRO_HOST / HOST; explicit bind for container networking
ENV HOST=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", "--import", "./.output/server/instrument.server.mjs", ".output/server/index.mjs"]
