FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile --filter=orchestrator-service...
RUN pnpm --filter=orchestrator-service run prisma:generate --if-present
RUN pnpm --filter=orchestrator-service run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/orchestrator-service/dist ./dist
COPY --from=build /app/apps/orchestrator-service/node_modules ./node_modules
COPY --from=build /app/apps/orchestrator-service/package.json ./package.json
EXPOSE 3002
CMD ["node", "dist/main.js"]
