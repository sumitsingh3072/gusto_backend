FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# Use turbo, not a plain `pnpm --filter ... run build` -- this service
# depends on @gusto/config/@gusto/logger at compile time (both have
# main: "dist/index.js"); turbo.json's build task depends on ^build, which
# builds those workspace deps first so their dist/ output exists before
# this runs.
RUN pnpm exec turbo run build --filter=mcp-gateway-service
RUN pnpm deploy --filter=mcp-gateway-service --prod /prod/mcp-gateway-service

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/mcp-gateway-service ./
EXPOSE 3008
CMD ["node", "dist/main.js"]
