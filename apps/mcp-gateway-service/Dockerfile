FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile --filter=mcp-gateway-service...
RUN pnpm --filter=mcp-gateway-service run prisma:generate --if-present
RUN pnpm --filter=mcp-gateway-service run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/mcp-gateway-service/dist ./dist
COPY --from=build /app/apps/mcp-gateway-service/node_modules ./node_modules
COPY --from=build /app/apps/mcp-gateway-service/package.json ./package.json
EXPOSE 3008
CMD ["node", "dist/main.js"]
