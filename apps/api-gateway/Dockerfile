# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# Use turbo, not a plain `pnpm --filter ... run build` -- this service
# depends on @gusto/config/@gusto/logger/@gusto/auth-middleware at compile
# time (all have main: "dist/index.js"); turbo.json's build task depends
# on ^build, which builds those workspace deps first so their dist/ output
# exists before this runs.
RUN pnpm exec turbo run build --filter=api-gateway
RUN pnpm deploy --filter=api-gateway --prod /prod/api-gateway

# ---- runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/api-gateway ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
