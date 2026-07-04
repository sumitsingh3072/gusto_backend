# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile --filter=api-gateway...
RUN pnpm --filter=api-gateway run prisma:generate --if-present
RUN pnpm --filter=api-gateway run build

# ---- runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api-gateway/dist ./dist
COPY --from=build /app/apps/api-gateway/node_modules ./node_modules
COPY --from=build /app/apps/api-gateway/package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/main.js"]
