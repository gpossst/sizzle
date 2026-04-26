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
# Vite inlines `import.meta.env.VITE_CONVEX_URL` in client assets at build time.
# Pass the same value as a runtime env on the container for SSR (`process.env`).
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
RUN bun run build

# `instrument.server.mjs` is copied as source and imports `@sentry/tanstackstart-react`.
# Nitro keeps `@sentry/*` external (see vite.config.ts), so runtime must resolve it from node_modules.
RUN rm -rf node_modules && bun install --frozen-lockfile --production

# -----------------------------------------------------------------------------
# Run with Bun: Nitro is built via `bun run build`, so Rollup may fold `typeof Bun`
# for the Bun server path. Node would then throw ReferenceError: Bun is not defined.
# -----------------------------------------------------------------------------
FROM oven/bun:1.3.2-debian AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Nitro reads NITRO_HOST / HOST; explicit bind for container networking
ENV HOST=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["bun", "--preload", "./.output/server/instrument.server.mjs", "./.output/server/index.mjs"]
