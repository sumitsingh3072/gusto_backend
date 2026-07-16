FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# Use turbo, not a plain `pnpm --filter ... run build` -- this service
# depends on @gusto/contracts (and other workspace packages) at compile
# time; turbo.json's build task depends on ^build, which builds those
# workspace deps first so their dist/ output exists before this runs.
RUN pnpm exec turbo run build --filter=scheduler-service
RUN pnpm deploy --filter=scheduler-service --prod /prod/scheduler-service

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /prod/scheduler-service ./
EXPOSE 3006
CMD ["node", "dist/main.js"]
