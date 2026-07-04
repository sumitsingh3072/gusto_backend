# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile --filter=auth-service...
RUN pnpm --filter=auth-service run prisma:generate --if-present
RUN pnpm --filter=auth-service run build

# ---- runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/auth-service/dist ./dist
COPY --from=build /app/apps/auth-service/node_modules ./node_modules
COPY --from=build /app/apps/auth-service/package.json ./package.json
EXPOSE 3001
CMD ["node", "dist/main.js"]
