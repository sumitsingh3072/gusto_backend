FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile --filter=notification-service...
RUN pnpm --filter=notification-service run prisma:generate --if-present
RUN pnpm --filter=notification-service run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/notification-service/dist ./dist
COPY --from=build /app/apps/notification-service/node_modules ./node_modules
COPY --from=build /app/apps/notification-service/package.json ./package.json
EXPOSE 3007
CMD ["node", "dist/main.js"]
