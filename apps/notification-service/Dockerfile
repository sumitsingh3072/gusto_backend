FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# Use turbo, not a plain `pnpm --filter ... run build` -- this service
# depends on @gusto/contracts (and other workspace packages) at compile
# time; turbo.json's build task depends on ^build (and prisma:generate), so
# those workspace deps and the Prisma client are built first.
RUN pnpm exec turbo run build --filter=notification-service
RUN pnpm deploy --filter=notification-service --prod /prod/notification-service

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Alpine's base image has libssl.so.3 but not the `openssl` CLI itself --
# Prisma's runtime engine-selection probes `openssl version` to pick the
# right query engine binary, and silently (mis-)defaults to the legacy
# openssl-1.1.x target without it, which then fails to load at startup.
RUN apk add --no-cache openssl
COPY --from=build /prod/notification-service ./
EXPOSE 3007
CMD ["node", "dist/main.js"]
