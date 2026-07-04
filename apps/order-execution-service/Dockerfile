FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile --filter=order-execution-service...
RUN pnpm --filter=order-execution-service run prisma:generate --if-present
RUN pnpm --filter=order-execution-service run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/order-execution-service/dist ./dist
COPY --from=build /app/apps/order-execution-service/node_modules ./node_modules
COPY --from=build /app/apps/order-execution-service/package.json ./package.json
EXPOSE 3004
CMD ["node", "dist/main.js"]
