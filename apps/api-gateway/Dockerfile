# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=api-gateway run build
RUN pnpm deploy --filter=api-gateway --prod /prod/api-gateway

# ---- runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/api-gateway ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
