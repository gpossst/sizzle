# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Build the TanStack Start / Nitro production bundle (Bun matches packageManager)
# -----------------------------------------------------------------------------
FROM oven/bun:1.3.2-debian AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# -----------------------------------------------------------------------------
# Run the Node server preset output (see package.json "start")
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Nitro reads NITRO_HOST / HOST; explicit bind for container networking
ENV HOST=0.0.0.0

COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", "--import", "./.output/server/instrument.server.mjs", ".output/server/index.mjs"]
