FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile --filter=scheduler-service...
RUN pnpm --filter=scheduler-service run prisma:generate --if-present
RUN pnpm --filter=scheduler-service run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/scheduler-service/dist ./dist
COPY --from=build /app/apps/scheduler-service/node_modules ./node_modules
COPY --from=build /app/apps/scheduler-service/package.json ./package.json
EXPOSE 3006
CMD ["node", "dist/main.js"]
